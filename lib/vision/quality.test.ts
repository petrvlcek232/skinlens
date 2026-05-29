import { describe, it, expect } from "vitest";
import { assessFraming } from "./quality";
import type { Landmark } from "./types";

/** Build a rectangular cloud of landmarks spanning the given normalized box. */
function boxFace(minX: number, minY: number, maxX: number, maxY: number): Landmark[] {
  return [
    { x: minX, y: minY, z: 0 },
    { x: maxX, y: minY, z: 0 },
    { x: minX, y: maxY, z: 0 },
    { x: maxX, y: maxY, z: 0 },
    { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: 0 },
  ];
}

describe("assessFraming", () => {
  it("reports not-detected for empty input", () => {
    const f = assessFraming(null);
    expect(f.faceDetected).toBe(false);
    expect(f.ready).toBe(false);
  });

  it("is ready for a well-centered, well-sized face", () => {
    const f = assessFraming(boxFace(0.35, 0.25, 0.65, 0.7));
    expect(f.faceDetected).toBe(true);
    expect(f.centered).toBe(true);
    expect(f.sizeOk).toBe(true);
    expect(f.ready).toBe(true);
  });

  it("asks the user to move closer when the face is tiny", () => {
    const f = assessFraming(boxFace(0.46, 0.46, 0.54, 0.56));
    expect(f.sizeOk).toBe(false);
    expect(f.ready).toBe(false);
    expect(f.hint).toMatch(/closer/i);
  });

  it("asks the user to center when off to the side", () => {
    const f = assessFraming(boxFace(0.02, 0.25, 0.22, 0.7));
    expect(f.centered).toBe(false);
    expect(f.hint).toMatch(/center/i);
  });
});
