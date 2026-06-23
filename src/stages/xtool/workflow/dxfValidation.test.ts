import { expect, test } from "bun:test";
import { BunServices } from "@effect/platform-bun";
import { Effect } from "effect";
import { resolve } from "node:path";
import { dxfBoundsFile, dxfFileHasPlottableGeometry } from "./dxfValidation";

const fixture = (filename: string) =>
  resolve(process.cwd(), "testdir/dxf", filename);
const run = <A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> =>
  Effect.runPromise(
    effect.pipe(Effect.provide(BunServices.layer)) as Effect.Effect<
      A,
      E,
      never
    >,
  );

test("checks a DXF file for plottable geometry", async () => {
  await expect(
    run(dxfFileHasPlottableGeometry(fixture("valid_board-F_Paste.dxf"))),
  ).resolves.toBe(true);

  await expect(
    run(dxfFileHasPlottableGeometry(fixture("valid_board-B_Paste.dxf"))),
  ).resolves.toBe(false);
});

test("measures bounds from a DXF file", async () => {
  await expect(
    run(dxfBoundsFile(fixture("valid_board-F_Mask.dxf"))),
  ).resolves.toEqual({
    width: 42.5,
    height: 25,
  });
});
