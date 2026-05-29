"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "error"
  | "unsupported";

interface UseCamera {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * Owns the webcam MediaStream lifecycle and surfaces a precise status so the UI
 * can show the right state (permission denied vs. no camera vs. generic error).
 * Stops all tracks on unmount — no dangling camera light.
 */
export function useCamera(): UseCamera {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {
          /* autoplay can reject silently; the stream is still attached */
        });
      }
      setStatus("ready");
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "SecurityError")
      ) {
        setStatus("denied");
      } else if (
        err instanceof DOMException &&
        (err.name === "NotFoundError" || err.name === "OverconstrainedError")
      ) {
        setStatus("error");
      } else {
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { videoRef, status, start, stop };
}
