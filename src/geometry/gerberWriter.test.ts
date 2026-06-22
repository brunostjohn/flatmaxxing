import { expect, test } from "bun:test";
import { type PathCmd, renderGerberOutline } from "./gerberWriter";

const lines = (gerber: string) => gerber.split("\n");

test("a unit square emits the KiCad-style header, aperture, and M02", () => {
  const cmds: PathCmd[] = [
    { kind: "line", to: { x: 1, y: 0 } },
    { kind: "line", to: { x: 1, y: 1 } },
    { kind: "line", to: { x: 0, y: 1 } },
    { kind: "line", to: { x: 0, y: 0 } },
  ];

  const out = renderGerberOutline({ x: 0, y: 0 }, cmds);
  const l = lines(out);

  expect(l[0]).toBe("%FSLAX46Y46*%");
  expect(l).toContain("%MOMM*%");
  expect(l).toContain("%TF.FileFunction,Profile,NP*%");
  expect(l).toContain("%TA.AperFunction,Profile*%");
  expect(l).toContain("%ADD10C,0.200000*%");
  expect(l).toContain("D10*");

  expect(out).toContain("X0Y0D02*");
  expect(out).toContain("X1000000Y0D01*");
  expect(out).toContain("X1000000Y1000000D01*");
  expect(out).toContain("X0Y1000000D01*");

  expect(out).not.toContain("G75*");
  expect(out).not.toContain("G02*");
  expect(out).not.toContain("G03*");

  expect(l.at(-2)).toBe("M02*");
  expect(out.endsWith("\n")).toBe(true);
});

test("a custom aperture diameter is written with six decimals", () => {
  const out = renderGerberOutline({ x: 0, y: 0 }, [], {
    apertureDiaMm: 0.15,
  });
  expect(out).toContain("%ADD10C,0.150000*%");
});

test("a rounded rectangle emits correct arc winding and I/J offsets", () => {
  const r = 2;
  const w = 10;
  const h = 10;

  const cmds: PathCmd[] = [
    { kind: "line", to: { x: w - r, y: 0 } },
    { kind: "arc", to: { x: w, y: r }, center: { x: w - r, y: r }, cw: false },
    { kind: "line", to: { x: w, y: h - r } },
    {
      kind: "arc",
      to: { x: w - r, y: h },
      center: { x: w - r, y: h - r },
      cw: false,
    },
    { kind: "line", to: { x: r, y: h } },
    {
      kind: "arc",
      to: { x: 0, y: h - r },
      center: { x: r, y: h - r },
      cw: false,
    },
    { kind: "line", to: { x: 0, y: r } },
    { kind: "arc", to: { x: r, y: 0 }, center: { x: r, y: r }, cw: false },
  ];

  const out = renderGerberOutline({ x: r, y: 0 }, cmds);

  expect(out).toContain("G75*");
  expect(out).toContain("G03*");
  expect(out).not.toContain("G02*");

  expect(out).toContain("X10000000Y2000000I0J2000000D01*");

  expect(out).toContain("X8000000Y10000000I-2000000J0D01*");
});

test("clockwise arcs are emitted as G02", () => {
  const cmds: PathCmd[] = [
    {
      kind: "arc",
      to: { x: 0, y: 1 },
      center: { x: 0, y: 0 },
      cw: true,
    },
  ];
  const out = renderGerberOutline({ x: 1, y: 0 }, cmds);
  expect(out).toContain("G02*");
  expect(out).not.toContain("G03*");
  expect(out).toContain("X0Y1000000I-1000000J0D01*");
});
