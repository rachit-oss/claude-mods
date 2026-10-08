# context-dancer 🕺🪩

A Claude Code mod that throws a disco party above your prompt when the session's
context fill passes 70% — a gentle, funky reminder to /compact.

## What it does

- Invisible below 70% context fill
- At 70%+: 🕺💃 dance between disco balls with cycling colors, music notes, an
  animated equalizer, and a synthesized 100 BPM disco loop (macOS audio)
- One-time toast when the threshold is crossed; readout turns red at 85%
- A Hide button, and it comes back if context drops and climbs again
- `/dance` toggles demo mode: party on demand at any context fill

## Install

```
/plugin install context-dancer --marketplace rachit-oss/claude-mods
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in
every session). Active immediately — no restart.

## Development

- `claude plugin validate .` — manifest, hooks, and marketplace checks
- `claude plugin test .` — runs the behavior tests in hooks/register.test.ts
