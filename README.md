# claude-mods

Rachit's Claude Code mods. Each mod lives in its own folder and is listed in
the marketplace file, so any of them installs with one line in a Claude Code
terminal session:

```
/plugin install <mod-name> --marketplace rachit-oss/claude-mods
```

Answer `y` to add the marketplace (first time only), then pick a scope — user
scope loads it in every session. Active immediately, no restart.

## Mods

| Mod | Install | What it does |
|---|---|---|
| [context-dancer](./context-dancer) | `/plugin install context-dancer --marketplace rachit-oss/claude-mods` | Disco party above the prompt when context fill passes 70%: dancing emojis, color-cycling equalizer, synthesized disco loop, `/dance` demo toggle |

## Development

From a mod's folder: `claude plugin validate .` checks it, `claude plugin test .`
runs its tests.
