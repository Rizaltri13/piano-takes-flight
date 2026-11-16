// The Night the Piano Took Flight — an entry for make.fun's ai-excited-01,
// "Make the AI judge excited" (Node 22, standard library only).
//
// The artwork lives beside this file as entry.png (JPEG bytes under the
// .png name the grader expects; the gate takes a whole PNG or JPEG of at
// most 1 MiB and 1024 by 1024 pixels). The program's whole job is to put
// those exact bytes at /output/entry.png, deterministically: no network,
// no clock, no randomness, so two runs write identical output.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
copyFileSync(new URL('./entry.png', import.meta.url), join(outDir, 'entry.png'));
