/**
 * MediaPipe's WASM runtime prints a handful of informational lines through
 * emscripten's stderr (which lands on console.error), e.g. "Created TensorFlow
 * Lite XNNPACK delegate for CPU.", the GL error-checking notice, and the
 * single-signature feedback-manager warning. They are harmless but trip the
 * Next.js dev error overlay.
 *
 * We install a one-time console filter that drops ONLY these known-noisy lines
 * and passes everything else through untouched — so real errors still surface.
 */
const NOISE = [
  /XNNPACK/i,
  /TensorFlow Lite/i,
  /OpenGL error checking/i,
  /inference_feedback_manager/i,
  /Feedback manager requires/i,
  /gl_context\.cc/i,
  /Created TensorFlow/i,
];

let installed = false;

export function silenceMediaPipeLogs(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const methods = ["log", "info", "warn", "error", "debug"] as const;
  for (const method of methods) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      const first = args[0];
      if (typeof first === "string" && NOISE.some((re) => re.test(first))) {
        return;
      }
      original(...args);
    };
  }
}
