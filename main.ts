// The Night the Piano Took Flight — entry program for make.fun's
// ai-excited-01 bounty, "Make the AI judge excited" (Node 22, stdlib only).
//
// The artwork sits beside this file under the name entry.png. Its bytes
// are JPEG; the .png name is simply what the grader asks for. Running
// this program is the whole delivery, and it happens in three movements:
//
//   probe   — read the artwork once, end to end, and describe it: its
//             length, the sha256 of its bytes, and the format its header
//             claims to be.
//   gate    — hold that description against the competition's shape:
//             no more than 1 MiB, and a PNG or JPEG payload. Anything
//             else is refused before a single output byte is written.
//   land    — stream the artwork into the output directory under a
//             scratch name, rename it onto entry.png only once every
//             byte has arrived, then check the landed copy against the
//             probe. A run interrupted mid-copy therefore never leaves
//             a truncated entry.png behind.
//
// Finally the program prints one JSON manifest line — file, bytes,
// sha256, format — so the run log carries proof of what was delivered.
//
// With --verify-only the landing is skipped: the artwork is probed and
// gated as usual, and then an entry.png already sitting in the output
// directory must prove it matches byte for byte — a cheap audit of a
// delivery made earlier.
//
// No network, no clock, no randomness: the same artwork always lands as
// the same bytes. Outside the grader's container, MAKEFUN_OUTPUT_DIR
// redirects the destination (default /output):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

// The gate's shape, and the signatures that satisfy its format half.
const SIZE_CEILING = 1024 * 1024; // 1 MiB, the gate's limit
const HEAD_LEN = 8; // length of the longest signature below
const SIGNATURES = [
  ['png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ['jpeg', [0xff, 0xd8, 0xff]],
];

// Name the format a buffer's leading bytes belong to, or null when the
// header matches neither signature the gate accepts.
function kindOf(head) {
  for (const [kind, magic] of SIGNATURES) {
    const matches =
      head.length >= magic.length && magic.every((byte, i) => head[i] === byte);
    if (matches) return kind;
  }
  return null;
}

// Read a file exactly once and describe what passed by: its byte count,
// the sha256 of the whole stream, and the format of its first bytes.
async function probe(path) {
  const hash = createHash('sha256');
  let head = Buffer.alloc(0);
  let size = 0;
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
    size += chunk.length;
    if (head.length < HEAD_LEN) {
      head = Buffer.concat([head, chunk.subarray(0, HEAD_LEN - head.length)]);
    }
  }
  return { size, digest: hash.digest('hex'), kind: kindOf(head) };
}

// A pass-through that keeps account of the bytes flowing through it —
// count, running sha256, and the stream's opening bytes — so a copy can
// be described without ever being read back from disk.
class ByteMeter extends Transform {
  constructor() {
    super();
    this.hash = createHash('sha256');
    this.head = Buffer.alloc(0);
    this.size = 0;
  }

  _transform(chunk, _encoding, done) {
    this.hash.update(chunk);
    this.size += chunk.length;
    if (this.head.length < HEAD_LEN) {
      this.head = Buffer.concat([
        this.head,
        chunk.subarray(0, HEAD_LEN - this.head.length),
      ]);
    }
    done(null, chunk);
  }

  describe() {
    return { size: this.size, digest: this.hash.digest('hex'), kind: kindOf(this.head) };
  }
}

// Copy `from` onto `to` by way of a scratch file in the same directory,
// renamed into place only when the copy is complete; a failed copy
// removes its scratch file rather than leaving debris. Resolves with
// the description of the bytes that landed.
async function landCopy(from, to) {
  const scratch = join(dirname(to), `.entry.png.scratch-${process.pid}`);
  const meter = new ByteMeter();
  try {
    await pipeline(createReadStream(from), meter, createWriteStream(scratch));
    await rename(scratch, to);
  } catch (err) {
    await rm(scratch, { force: true }).catch(() => undefined);
    throw err;
  }
  return meter.describe();
}

async function run() {
  const artwork = fileURLToPath(new URL('./entry.png', import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const target = join(outDir, 'entry.png');
  const verifyOnly = process.argv.slice(2).includes('--verify-only');

  const source = await probe(artwork);
  if (source.size > SIZE_CEILING) {
    throw new Error(
      `artwork is ${source.size} bytes; the gate allows at most ${SIZE_CEILING}`,
    );
  }
  if (source.kind === null) {
    throw new Error('artwork is neither PNG nor JPEG; the gate accepts nothing else');
  }

  if (verifyOnly) {
    const existing = await probe(target).catch(() => null);
    if (existing === null) {
      throw new Error(`nothing to verify: no entry.png in ${outDir}`);
    }
    if (existing.size !== source.size || existing.digest !== source.digest) {
      throw new Error('the existing entry.png does not match the artwork byte for byte');
    }
  } else {
    await mkdir(outDir, { recursive: true });
    const landed = await landCopy(artwork, target);
    if (landed.size !== source.size || landed.digest !== source.digest) {
      throw new Error('the landed copy does not match the artwork byte for byte');
    }
  }

  console.log(
    JSON.stringify({
      file: 'entry.png',
      bytes: source.size,
      sha256: source.digest,
      format: source.kind,
    }),
  );
}

run().catch((err) => {
  console.error(`piano-flight: ${err.message}`);
  process.exitCode = 1;
});
