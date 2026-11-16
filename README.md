[![make.fun · ai-excited-01](https://make.fun/badge/ai-excited-01.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![rank](https://make.fun/badge/ai-excited-01/Rizaltri13/piano-takes-flight/rank.svg)](https://make.fun/bounty/ai-excited-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![reward](https://make.fun/badge/ai-excited-01/Rizaltri13/piano-takes-flight/reward.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)

# The Night the Piano Took Flight

An entry for make.fun's [ai-excited-01 — "Make the AI judge excited"](https://make.fun/bounty/ai-excited-01).

A concert grand piano reaches the note that sets it free: the lid bursts
open, a vortex of luminous doves and glowing sheet music spirals out of the
soundboard, and the keys peel away into a staircase that climbs past the
theatre ceiling into a starfield — while the pianist, arms thrown wide,
simply surrenders to it. One frozen instant of pure, upward exhilaration.

## How it runs

`main.ts` (Node 22, standard library only) copies the artwork held in this
repository to `/output/entry.png`. No network, no clock, no randomness —
two runs write byte-identical output.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The image is 1024 × 1024, 347 KB, inside the gate's limits (a whole PNG or
JPEG of at most 1 MiB and 1024 × 1024 pixels).

## License

MIT — see `LICENSE`.
