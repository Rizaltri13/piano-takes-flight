// The Night the Piano Took Flight — entry program for make.fun's
// ai-excited-01, "Make the AI judge excited" (Node 22, stdlib only).
//
// The artwork is committed beside this file as entry.png (JPEG bytes under
// the .png name the gate expects). This program's single job is to deliver
// those exact bytes to <output>/entry.png — deterministically: no network,
// no clock, no randomness — and to prove the delivery with a manifest:
//
//   1. stream the source once to fingerprint it (size + sha256 + format),
//   2. refuse anything outside the gate's shape (> 1 MiB, not PNG/JPEG),
//   3. stream it to a temp file in the output directory, hashing as the
//      bytes pass, then rename it into place atomically,
//   4. check the copy's fingerprint against the source's,
//   5. print the manifest as one JSON line for the run log.
//
// MAKEFUN_OUTPUT_DIR stands in for /output outside the grader's container:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const MAX_BYTES = 1024 * 1024; // the gate's 1 MiB ceiling
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

function sniffFormat(bytes) {
  const hasMagic = (magic) => magic.every((b, i) => bytes[i] === b);
  if (hasMagic(PNG_MAGIC)) return 'png';
  if (hasMagic(JPEG_MAGIC)) return 'jpeg';
  return null;
}

// Fingerprint a file by streaming it, so memory stays flat however large
// the image grows: resolves with its byte count and hex sha256.
async function hashFile(path) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
    bytes += chunk.length;
  }
  return { bytes, sha256: hash.digest('hex') };
}

// Read just enough of a file to sniff its format.
async function sniffFile(path) {
  const handle = await open(path, 'r');
  try {
    const head = Buffer.alloc(PNG_MAGIC.length);
    const { bytesRead } = await handle.read(head, 0, head.length, 0);
    return sniffFormat(head.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}

// Stream the source to a temp file beside the destination, hashing as the
// bytes pass, then rename it into place: a crash mid-copy can never leave
// a truncated entry.png behind. Resolves with the copy's fingerprint.
async function deliver(sourcePath, destPath) {
  const tmpPath = `${destPath}.tmp-${process.pid}`;
  const hash = createHash('sha256');
  let bytes = 0;
  const tap = new Transform({
    transform(chunk, _encoding, done) {
      hash.update(chunk);
      bytes += chunk.length;
      done(null, chunk);
    },
  });
  try {
    await pipeline(createReadStream(sourcePath), tap, createWriteStream(tmpPath));
    await rename(tmpPath, destPath);
    return { bytes, sha256: hash.digest('hex') };
  } catch (err) {
    await rm(tmpPath, { force: true }).catch(() => {});
    throw err;
  }
}

async function main() {
  const sourcePath = fileURLToPath(new URL('./entry.png', import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const destPath = join(outDir, 'entry.png');

  const manifest = {
    file: 'entry.png',
    ...(await hashFile(sourcePath)),
    format: await sniffFile(sourcePath),
  };

  if (manifest.bytes > MAX_BYTES) {
    throw new Error(`${manifest.bytes} bytes exceeds the 1 MiB gate limit`);
  }
  if (manifest.format === null) {
    throw new Error('source is neither PNG nor JPEG');
  }

  await mkdir(outDir, { recursive: true });
  const written = await deliver(sourcePath, destPath);
  if (written.sha256 !== manifest.sha256 || written.bytes !== manifest.bytes) {
    throw new Error('written bytes differ from the source image');
  }

  console.log(JSON.stringify(manifest));
}

main().catch((err) => {
  console.error(`entry.png: delivery failed: ${err.message}`);
  process.exit(1);
});
