// The Night the Piano Took Flight — an entry for make.fun's ai-excited-01,
// "Make the AI judge excited" (Node 22, standard library only).
//
// The artwork lives beside this file as entry.png (JPEG bytes under the
// .png name the grader expects; the gate takes a whole PNG or JPEG of at
// most 1 MiB and 1024 by 1024 pixels). The program's whole job is to put
// those exact bytes at /output/entry.png, deterministically: no network,
// no clock, no randomness, so two runs write identical output.
//
// Before finishing, the program re-reads what it wrote and checks it
// against the gate's shape: byte-for-byte equal to the source, at most
// 1 MiB, and starting with a PNG or JPEG signature. A bad write fails
// loudly here instead of scoring zero later.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_BYTES = 1024 * 1024; // the gate's 1 MiB ceiling
const src = new URL('./entry.png', import.meta.url);
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const dest = join(outDir, 'entry.png');

copyFileSync(src, dest);

const source = readFileSync(src);
const written = readFileSync(dest);
if (!written.equals(source)) {
  throw new Error('entry.png: written bytes differ from the source image');
}
if (written.length > MAX_BYTES) {
  throw new Error(`entry.png: ${written.length} bytes exceeds the 1 MiB gate limit`);
}
const isPng = written.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
const isJpeg = written[0] === 0xff && written[1] === 0xd8 && written[2] === 0xff;
if (!isPng && !isJpeg) {
  throw new Error('entry.png: not a PNG or JPEG image');
}
