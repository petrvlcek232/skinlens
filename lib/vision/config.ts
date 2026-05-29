/**
 * Central config for the on-device vision stack.
 *
 * WASM is loaded from a version-pinned jsDelivr CDN (keeps the repo lean and
 * avoids shipping ~33 MB of binaries). The model is self-hosted from
 * /public/models (downloaded by scripts/setup-models.mjs) so we don't depend
 * on Google's storage host at runtime.
 *
 * Pin must match the installed @mediapipe/tasks-vision version in package.json.
 */
export const MEDIAPIPE_VERSION = "0.10.35";

export const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;

export const FACE_LANDMARKER_MODEL_URL = "/models/face_landmarker.task";

/** MediaPipe FaceLandmarker emits 478 normalized landmarks per face. */
export const FACE_LANDMARK_COUNT = 478;
