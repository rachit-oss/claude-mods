export type DancerState = { percent: number; frame: number; isHidden: boolean; isDemo: boolean }

declare module 'claude-code' {
  interface PluginState {
    'context-dancer': { percent: number; frame: number; isHidden: boolean; isDemo: boolean }
  }
}
