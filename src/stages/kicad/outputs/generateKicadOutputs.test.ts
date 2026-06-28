import { expect, test } from "bun:test";
import type { KicadOutputOptions } from "@/config";
import { BunServices } from "@effect/platform-bun";
import { Effect } from "effect";
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildBoardImageSvgExportArgs } from "./boardImage";
import { getBoardImagePngPath, getBoardImageSvgPath } from "./boardImagePaths";
import {
  boardImageLayers,
  boardImagePngZoom,
  solderMaskPngZoom,
} from "./constants";
import { generateKicadOutputs } from "./generateKicadOutputs";
import { generatePngFromSvg } from "./generatePngFromSvg";

const tempProject = () => mkdtempSync(join(tmpdir(), "flatmaxx-kicad-"));

const run = <A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> =>
  Effect.runPromise(
    effect.pipe(Effect.provide(BunServices.layer)) as Effect.Effect<
      A,
      E,
      never
    >,
  );

test("board image paths use the Board_Image suffix", () => {
  expect(getBoardImageSvgPath("/project/svg", "my-board")).toBe(
    "/project/svg/my-board-Board_Image.svg",
  );
  expect(getBoardImagePngPath("/project/png", "my-board")).toBe(
    "/project/png/my-board-Board_Image.png",
  );
});

test("board image SVG export args match the KiCad single-file command", () => {
  expect(
    buildBoardImageSvgExportArgs("/project/svg/board-Board_Image.svg"),
  ).toEqual([
    "pcb",
    "export",
    "svg",
    "--layers",
    boardImageLayers,
    "--mode-single",
    "--page-size-mode",
    "2",
    "--exclude-drawing-sheet",
    "--output",
    "/project/svg/board-Board_Image.svg",
  ]);
});

test("board image and solder mask PNG zooms stay distinct", () => {
  expect(boardImagePngZoom).toBe(2);
  expect(solderMaskPngZoom).toBe(25);
});

test("disabled board image output skips board image export", async () => {
  const root = tempProject();
  const project = join(root, "project");
  const fakeKicad = join(root, "kicad-cli");
  const logPath = join(root, "kicad-args.log");
  const pcbFile = join(project, "board.kicad_pcb");
  mkdirSync(project, { recursive: true });
  writeFileSync(pcbFile, "");
  writeFileSync(
    fakeKicad,
    `#!/bin/sh
printf '%s\\n' "$*" >> '${logPath}'
`,
  );
  chmodSync(fakeKicad, 0o755);

  const result = await generateKicadOutputs(fakeKicad, project, pcbFile, {
    paths: {
      svg: "./svg",
      dxf: "./dxf",
      png: "./png",
      gerbers: "./gerbers",
      place: "./place",
    },
    sides: ["front", "back"],
    drills: { generate: false, withEdgeCuts: false },
    place: { generate: false },
    boardImage: { generate: false, skipReason: "skipRenderBoard=true" },
    solderMask: { generate: false, sides: [], skipReason: "test" },
    stencil: { generate: false, sides: [], skipReason: "test" },
  } satisfies KicadOutputOptions).pipe(run);

  const loggedArgs = readFileSync(logPath, "utf8");
  expect(result.boardImagePngPath).toBeUndefined();
  expect(loggedArgs).not.toContain("Board_Image");
  expect(loggedArgs).not.toContain(boardImageLayers);
});

test("SVG to PNG rendering trims transparent padding", async () => {
  const root = tempProject();
  const svgDir = join(root, "svg");
  const pngDir = join(root, "png");
  mkdirSync(svgDir, { recursive: true });
  mkdirSync(pngDir, { recursive: true });

  const svgPath = join(svgDir, "padded.svg");
  const pngPath = join(pngDir, "padded.png");
  writeFileSync(
    svgPath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10">
      <rect x="2" y="3" width="4" height="5" fill="red"/>
    </svg>`,
  );

  const result = await generatePngFromSvg(svgPath, pngPath, {
    zoom: boardImagePngZoom,
  }).pipe(run);

  expect(result.pngFile).toBe(pngPath);
  expect(result.info.width).toBe(8);
  expect(result.info.height).toBe(10);
});
