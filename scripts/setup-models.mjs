/**
 * Downloads the MediaPipe FaceLandmarker model into public/models so the app
 * can self-host it (faster, no runtime dependency on Google's storage host).
 *
 * Wired into `predev` and `prebuild` — idempotent, skips if the file exists.
 * The model is gitignored on purpose: keeps the repo lean, stays reproducible.
 */
import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const MODELS = [
  {
    name: "face_landmarker.task",
    url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    minBytes: 1_000_000,
  },
];

async function fileIsValid(path, minBytes) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= minBytes;
  } catch {
    return false;
  }
}

async function download({ name, url, minBytes }) {
  const dest = join(ROOT, "public", "models", name);
  if (await fileIsValid(dest, minBytes)) {
    console.log(`✓ ${name} already present`);
    return;
  }
  await mkdir(dirname(dest), { recursive: true });
  console.log(`↓ downloading ${name} …`);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download ${name}: HTTP ${res.status}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  if (!(await fileIsValid(dest, minBytes))) {
    throw new Error(`Downloaded ${name} is smaller than expected`);
  }
  console.log(`✓ ${name} ready`);
}

try {
  await Promise.all(MODELS.map(download));
} catch (err) {
  console.error(`\nModel setup failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
