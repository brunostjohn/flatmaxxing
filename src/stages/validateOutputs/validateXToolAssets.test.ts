import { expect, test } from "bun:test";
import { BunServices } from "@effect/platform-bun";
import { Effect } from "effect";
import { resolve } from "node:path";
import {
  validateSolderMaskAssetsForSide,
  validateStencilAssetsForSide,
} from "./validateXToolAssets";

const xtoolProjectPath = resolve(process.cwd(), "testdir/xtool");
const run = <A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> =>
  Effect.runPromise(
    effect.pipe(Effect.provide(BunServices.layer)) as Effect.Effect<
      A,
      E,
      never
    >,
  );

test("validates solder-mask DXF and PNG assets for a side", async () => {
  const result = await validateSolderMaskAssetsForSide(
    xtoolProjectPath,
    "valid_board",
    "front",
  ).pipe(run);

  expect(result.dxfPath).toContain("valid_board-F_Mask.dxf");
  expect(result.pngPath).toContain("valid_board-F_Mask.png");
  expect(result.bounds).toEqual({ width: 42.5, height: 25 });
});

test("treats empty paste DXFs as a successful skip signal", async () => {
  const front = await validateStencilAssetsForSide(
    xtoolProjectPath,
    "valid_board",
    "front",
  ).pipe(run);
  const back = await validateStencilAssetsForSide(
    xtoolProjectPath,
    "valid_board",
    "back",
  ).pipe(run);

  expect(front.hasPlottableGeometry).toBe(true);
  expect(back.hasPlottableGeometry).toBe(false);
});
