import { expect, test } from "bun:test";
import { effectiveToolDiameter } from "./effectiveToolDiameter";

test("v-bit effective diameter grows with cut depth (FlatCAM formula)", () => {
  // 0.14mm tip, 60deg, 0.05mm depth -> 0.14 + 2*0.05*tan(30deg) ~= 0.19773
  const dia = effectiveToolDiameter(
    { type: "vbit", diameter: 0.14, angle: 60 },
    0.05,
  );
  expect(dia).toBeCloseTo(0.19773502691896, 9);
});

test("v-bit handles negative (signed) cut depth identically", () => {
  const pos = effectiveToolDiameter(
    { type: "vbit", diameter: 0.14, angle: 60 },
    0.05,
  );
  const neg = effectiveToolDiameter(
    { type: "vbit", diameter: 0.14, angle: 60 },
    -0.05,
  );
  expect(neg).toBe(pos);
});

test("deeper cut yields a wider v-bit width", () => {
  const tool = { type: "vbit" as const, diameter: 0.1, angle: 30 };
  expect(effectiveToolDiameter(tool, 0.1)).toBeGreaterThan(
    effectiveToolDiameter(tool, 0.05),
  );
});

test("flat mill/drill cut at nominal diameter regardless of depth", () => {
  expect(effectiveToolDiameter({ type: "mill", diameter: 0.8 }, 0.075)).toBe(
    0.8,
  );
  expect(effectiveToolDiameter({ type: "drill", diameter: 1.0 }, 5)).toBe(1.0);
});
