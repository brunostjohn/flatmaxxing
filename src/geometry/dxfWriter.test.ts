import { expect, test } from "bun:test";
import { type PathCmd, renderDxfOutline } from "./dxfWriter";

const pair = (code: number, value: string) => `${code}\n${value}\n`;

test("a CCW arc emits its angles in start->end order (50=0, 51=90)", () => {
  const cmds: PathCmd[] = [
    { kind: "arc", to: { x: 0, y: 1 }, center: { x: 0, y: 0 }, cw: false },
  ];
  const out = renderDxfOutline({ x: 1, y: 0 }, cmds);

  expect(out).toContain(pair(0, "ARC"));
  expect(out).toContain(pair(40, "1"));
  expect(out).toContain(pair(50, "0"));
  expect(out).toContain(pair(51, "90"));
});

test("a CW arc swaps the angle order so the same DXF arc sweeps the other way", () => {
  const cmds: PathCmd[] = [
    { kind: "arc", to: { x: 0, y: 1 }, center: { x: 0, y: 0 }, cw: true },
  ];
  const out = renderDxfOutline({ x: 1, y: 0 }, cmds);

  expect(out).toContain(pair(50, "90"));
  expect(out).toContain(pair(51, "0"));
});

test("a line carries its start and end coordinates", () => {
  const out = renderDxfOutline({ x: 0, y: 0 }, [
    { kind: "line", to: { x: 10, y: 0 } },
  ]);

  expect(out).toContain(pair(0, "LINE"));
  expect(out).toContain(pair(10, "0"));
  expect(out).toContain(pair(20, "0"));
  expect(out).toContain(pair(11, "10"));
  expect(out).toContain(pair(21, "0"));
});

test("the header declares millimeter units and closes the section + file", () => {
  const out = renderDxfOutline({ x: 0, y: 0 }, []);

  expect(out).toContain(pair(9, "$INSUNITS"));
  expect(out).toContain(pair(70, "4"));
  expect(out).toContain(pair(2, "ENTITIES"));
  expect(out.endsWith(pair(0, "EOF"))).toBe(true);
});
