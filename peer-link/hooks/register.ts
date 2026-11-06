import type { EngineInterface, Register, Timer } from 'claude-code'

type Conn = { room: string; name: string }
type Row = { id: number; sender: string; message: string }

const POLL_MS = 1000
const IDLE_AFTER_MS = 120000
const IDLE_EVERY_TICKS = 4
const AUTO_BUDGET = 8
const SEND_TOOL = 'mcp__peer-link__send'
const SUPABASE_URL = 'https://lmnvevbumkvbtrcrgswv.supabase.co'
const SUPABASE_KEY = 'sb_publishable_50vbNQdMkWI-24sZvTx5OQ_JIUBLADa'
const TABLE = `${SUPABASE_URL}/rest/v1/peer_link_messages`
const HEADERS = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }

const S: {
  conn: Conn | null
  lastId: number
  autoLeft: number
  held: { from: string; text: string }[]
  busy: boolean
  timer: Timer | null
  lastActivity: number
  tick: number
} = { conn: null, lastId: 0, autoLeft: AUTO_BUDGET, held: [], busy: false, timer: null, lastActivity: 0, tick: 0 }

const incomingPrompt = (from: string, text: string) =>
  `[peer-link] "${from}" sent a message to this session:\n\n${text}\n\n` +
  `(You are "${S.conn?.name}" in room "${S.conn?.room}". If a reply is useful, send it with the peer-link send tool, ` +
  `and keep your human posted in one short line. Auto-replies left before a human must weigh in: ${S.autoLeft}.)`

async function latestId($: EngineInterface, room: string): Promise<number> {
  const url = `${TABLE}?room=eq.${encodeURIComponent(room)}&select=id&order=id.desc&limit=1`
  const res = await $.http.fetch(url, { headers: HEADERS })
  if (!res.ok) return 0
  const rows = JSON.parse(res.text) as { id: number }[]
  return rows[0]?.id ?? 0
}

async function poll($: EngineInterface): Promise<void> {
  if (!S.conn || S.busy) return
  S.tick += 1
  const isIdle = Date.now() - S.lastActivity > IDLE_AFTER_MS
  if (isIdle && S.tick % IDLE_EVERY_TICKS !== 0) return
  S.busy = true
  try {
    const url =
      `${TABLE}?room=eq.${encodeURIComponent(S.conn.room)}` +
      `&id=gt.${S.lastId}&select=id,sender,message&order=id.asc&limit=50`
    const res = await $.http.fetch(url, { headers: HEADERS })
    if (!res.ok) return
    for (const row of JSON.parse(res.text) as Row[]) {
      S.lastId = Math.max(S.lastId, row.id)
      if (!row.message || row.sender === S.conn.name) continue
      S.lastActivity = Date.now()
      if (S.autoLeft > 0) {
        S.autoLeft -= 1
        $.ui.toast(`peer-link: message from ${row.sender}`)
        void $.prompt.submit({ text: incomingPrompt(row.sender, row.message) })
      } else {
        S.held.push({ from: row.sender, text: row.message })
        $.ui.toast(`peer-link: message from ${row.sender} held (auto-reply limit); type anything to resume`)
      }
    }
  } catch {
    // transient network fault: next tick retries
  } finally {
    S.busy = false
  }
}

async function start($: EngineInterface, next: Conn): Promise<void> {
  S.timer?.cancel()
  S.conn = next
  S.autoLeft = AUTO_BUDGET
  S.lastActivity = Date.now()
  S.lastId = await latestId($, next.room)
  S.timer = $.clock.every(POLL_MS, () => void poll($))
  $.ui.status(`peer-link: ${next.room} as ${next.name}`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'send',
      description:
        'Send a chat message to the peer Claude session connected via /peer-link. ' +
        'Use it to reply to a [peer-link] message, or when your user asks you to tell or ask the peer something. ' +
        'Plain text; keep messages self-contained since the peer has no access to this conversation.',
      inputSchema: {
        type: 'object',
        properties: { message: { type: 'string', description: 'The message to deliver to the peer session.' } },
        required: ['message'],
      },
      isDeferred: false,
    })
    await $.command.register({
      name: 'peer-link',
      description: 'Bridge this session to a peer Claude session (another account/machine)',
      argumentHint: '<room> <your-name> | status | leave',
    })
    return next(e)
  })

  on('command.run', { command: 'peer-link' }, async ($, e) => {
    const parts = e.args.trim().split(/\s+/).filter(Boolean)
    if (parts[0] === 'leave') {
      S.timer?.cancel()
      S.timer = null
      S.conn = null
      $.ui.status(undefined)
      return { text: 'peer-link: disconnected.' }
    }
    if (parts[0] === 'status' || parts.length === 0) {
      return {
        text: S.conn
          ? `peer-link: connected to room "${S.conn.room}" as "${S.conn.name}" (1s polling when active / 4s when idle, ${S.autoLeft} auto-replies left, ${S.held.length} held, last id ${S.lastId}).`
          : 'peer-link: not connected. Usage: /peer-link <room> <your-name>',
      }
    }
    if (parts.length !== 2) return { text: 'Usage: /peer-link <room> <your-name> | status | leave' }
    const [room, name] = parts
    if (!/^[A-Za-z0-9_-]{3,64}$/.test(room) || !/^[A-Za-z0-9_-]{1,32}$/.test(name))
      return { text: 'peer-link: room and name must be 3-64 / 1-32 chars of letters, digits, - or _.' }
    await start($, { room, name })
    return {
      text:
        `peer-link: joined room "${room}" as "${name}". The other side runs: /peer-link ${room} <their-name>\n` +
        'Messages travel through the Cerebri_dev Supabase project (peer_link_messages table).',
    }
  })

  on('tool.call', { tool: SEND_TOOL }, async ($, e) => {
    if (!S.conn) return { deny: 'peer-link: not connected. Ask the user to run /peer-link <room> <your-name> first.' }
    const message = String((e as unknown as { message?: unknown }).message ?? '').trim()
    if (!message) return { deny: 'peer-link: empty message.' }
    const res = await $.http.fetch(TABLE, {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ room: S.conn.room, sender: S.conn.name, message }),
    })
    if (!res.ok) return { deny: `peer-link: delivery failed (Supabase answered ${res.status}: ${res.text.slice(0, 200)}).` }
    S.lastActivity = Date.now()
    return { result: `delivered to room "${S.conn.room}" as "${S.conn.name}"` }
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.origin?.kind === 'plugin') return next(e)
    S.autoLeft = AUTO_BUDGET
    if (S.held.length === 0) return next(e)
    const block =
      '[peer-link] Messages that arrived while auto-replies were paused:\n\n' +
      S.held.map(m => `From "${m.from}": ${m.text}`).join('\n\n')
    S.held = []
    return next({ ...e, context: [...(e.context ?? []), block] })
  })
}
