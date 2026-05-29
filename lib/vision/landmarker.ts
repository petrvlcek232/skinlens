import {
  FilesetResolver,
  FaceLandmarker,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { WASM_BASE_URL, FACE_LANDMARKER_MODEL_URL } from "./config";
import { silenceMediaPipeLogs } from "./silence-mediapipe";

type RunningMode = "VIDEO" | "IMAGE";

/**
 * Lazily-created, cached FaceLandmarker instances — one per running mode.
 * VIDEO mode drives the live preview (detectForVideo + timestamp); IMAGE mode
 * handles the photo-upload fallback (detect on a still). Creating the WASM
 * fileset and model is expensive, so we never do it twice.
 *
 * Browser-only: callers live in "use client" components.
 */
const cache: Partial<Record<RunningMode, Promise<FaceLandmarker>>> = {};

export async function getFaceLandmarker(
  mode: RunningMode,
): Promise<FaceLandmarker> {
  silenceMediaPipeLogs();
  const existing = cache[mode];
  if (existing) return existing;

  const created = (async () => {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
    return FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL },
      runningMode: mode,
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
    });
  })();

  // Don't cache a rejected promise — allow retry after a transient failure.
  created.catch(() => {
    if (cache[mode] === created) delete cache[mode];
  });

  cache[mode] = created;
  return created;
}

export type { FaceLandmarkerResult };
