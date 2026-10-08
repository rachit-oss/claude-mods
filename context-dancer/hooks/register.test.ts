import type { RenderElement, SessionUsage } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'context-dancer',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

test('quiet below 70%, dances above, hides on press', async ($, on) => {
  const clock = mock.clock(on)

  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('audio.play', () => ({ value: undefined }))
  on('ui.render', ($, e) => h($.ui.resolve(e).Text, { dimColor: true }, 'quiet') as RenderElement)

  let percent = 40
  on('session.usage', (): { value: SessionUsage } => ({
    value: {
      startedAt: 0,
      context: { tokens: 0, window: 200000, percent },
      rateLimits: [],
    },
  }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const band = await $.ui.mount(BAND)

  await clock.advance(600)
  expect(await band.find({ text: /context at/ })).toBeUndefined()

  percent = 72
  await clock.advance(600)
  expect(await band.find({ text: /context at 72%/ })).toBeDefined()

  const first = (await band.find({ type: 'Text', text: /🕺/ }))?.text
  expect(first).toBeDefined()
  await clock.advance(600)
  const second = (await band.find({ type: 'Text', text: /🕺/ }))?.text
  expect(second).not.toEqual(first)

  await band.press({ key: 'hide' })
  expect(await band.find({ text: /context at/ })).toBeUndefined()

  percent = 50
  await clock.advance(600)
  percent = 90
  await clock.advance(600)
  expect(await band.find({ text: /context at 90%/ })).toBeDefined()

  percent = 10
  await clock.advance(600)
  expect(await band.find({ text: /context at/ })).toBeUndefined()

  const RUN = {
    command: 'dance',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 120 },
  } as const

  await $.command.run(RUN)
  await clock.advance(600)
  expect(await band.find({ text: /demo mode/ })).toBeDefined()

  await $.command.run(RUN)
  await clock.advance(600)
  expect(await band.find({ text: /context at/ })).toBeUndefined()
})
