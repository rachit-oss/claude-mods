import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const percent = atom({ plugin: 'context-dancer', key: 'percent' } as const, 0)
const frame = atom({ plugin: 'context-dancer', key: 'frame' } as const, 0)
const isHidden = atom({ plugin: 'context-dancer', key: 'isHidden' } as const, false)
const isDemo = atom({ plugin: 'context-dancer', key: 'isDemo' } as const, false)

const THRESHOLD = 70
const TICK_MS = 300
const DANCERS = ['🕺', '💃']
const NOTES = ['🎶', '🎵', '🎷', '🥁']
const SPARKS = ['✨', '🌟', '💫', '🎉']
const DISCO = ['#ff5fd7', '#5fd7ff', '#ffd75f', '#5fff87', '#d78cff', '#ff8787']
const BARS = '▁▂▃▄▅▆▇█'

export const register: Register = on => {
  let wasDancing = false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'dance',
      description: 'Toggle the context-dancer demo (dance regardless of context fill)',
    })

    let ticks = 0

    $.clock.every(TICK_MS, async () => {
      const { context } = await $.session.usage()
      const now = context.percent ?? 0
      await update($, percent, () => now)
      const demo = await read($, isDemo)

      if (now < THRESHOLD && !demo) {
        wasDancing = false
        ticks = 0
        await update($, isHidden, () => false)
        return
      }

      if (!wasDancing) {
        wasDancing = true
        if (!demo) {
          $.ui.toast(`Context hit ${now}% — Claude is dancing nervously`)
        }
      }

      if (await read($, isHidden)) {
        ticks = 0
        return
      }

      await update($, frame, f => (f + 1) % 240)
      if (ticks % 8 === 0) {
        void $.audio.play({ asset: 'sounds/groove.wav' }).catch(() => {})
      }
      ticks += 1
    })

    return next(e)
  })

  on('command.run', { command: 'dance' }, async $ => {
    const demo = await read($, isDemo)
    await update($, isDemo, () => !demo)
    await update($, isHidden, () => false)
    if (demo) {
      wasDancing = false
    }

    return { text: demo ? 'Demo off — back to dancing at 70%.' : 'Demo on — dance party above the prompt. /dance again to stop.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const now = await read($, percent)
    const demo = await read($, isDemo)
    const isQuiet = (now < THRESHOLD && !demo) || e.props.hasSurvey || (await read($, isHidden))

    if (isQuiet) {
      return next(e)
    }

    const step = await read($, frame)
    const { Box, Button, Text } = $.ui.resolve(e)

    const spark = SPARKS[step % SPARKS.length] ?? '✨'
    const note = NOTES[step % NOTES.length] ?? '🎶'
    const lead = DANCERS[step % 2] ?? '🕺'
    const partner = DANCERS[(step + 1) % 2] ?? '💃'
    const glow = DISCO[step % DISCO.length]
    const bounce = ' '.repeat(step % 3)
    const equalizer = Array.from(
      { length: 28 },
      (_, i) => BARS[(i * 3 + step * 2) % BARS.length] ?? '▁',
    ).join('')

    return (
      <Box flexDirection="column">
        <Box>
          <Text>🪩 </Text>
          <Text color={glow} bold>
            {bounce}{spark} {lead} {note} {partner} {spark}
          </Text>
          <Text> 🪩  </Text>
          <Text color={now >= 85 ? 'error' : 'warning'} bold>
            context at {now}%{' '}
          </Text>
          <Text dimColor>
            {demo ? '— demo mode, /dance to stop ' : '— maybe /compact before the party ends? '}
          </Text>
          <Button
            key="hide"
            label="Hide"
            onPress={() => update($, isHidden, () => true)}
          />
        </Box>
        <Box>
          <Text color={DISCO[(step + 3) % DISCO.length]}>{equalizer}</Text>
          <Text dimColor> 🔊</Text>
        </Box>
      </Box>
    )
  })
}
