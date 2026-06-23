import { expect, test } from "bun:test";
import { BunServices } from "@effect/platform-bun";
import { Effect } from "effect";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { maybeRenderBoardImagePreview } from "./build";

const tempProject = () => mkdtempSync(join(tmpdir(), "flatmaxx-build-"));

const run = <A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> =>
  Effect.runPromise(
    effect.pipe(Effect.provide(BunServices.layer)) as Effect.Effect<
      A,
      E,
      never
    >,
  );

test("renders an existing board image preview once", async () => {
  const root = tempProject();
  const pngPath = join(root, "board-Board_Image.png");
  const rendered: string[] = [];
  writeFileSync(pngPath, "");

  const shown = await maybeRenderBoardImagePreview({
    enabled: true,
    pngPath,
    isInteractive: true,
    renderPreview: (path) =>
      Effect.sync(() => {
        rendered.push(path);
      }),
  }).pipe(run);

  expect(shown).toBe(true);
  expect(rendered).toEqual([pngPath]);
});

test("skips generated board preview after cached preview was shown", async () => {
  const root = tempProject();
  const pngPath = join(root, "board-Board_Image.png");
  const rendered: string[] = [];
  writeFileSync(pngPath, "");

  const shown = await maybeRenderBoardImagePreview({
    enabled: true,
    pngPath,
    alreadyShown: true,
    isInteractive: true,
    renderPreview: (path) =>
      Effect.sync(() => {
        rendered.push(path);
      }),
  }).pipe(run);

  expect(shown).toBe(false);
  expect(rendered).toEqual([]);
});

test("missing board image does not render early preview", async () => {
  const root = tempProject();
  const rendered: string[] = [];

  const shown = await maybeRenderBoardImagePreview({
    enabled: true,
    pngPath: join(root, "missing-Board_Image.png"),
    isInteractive: true,
    renderPreview: (path) =>
      Effect.sync(() => {
        rendered.push(path);
      }),
  }).pipe(run);

  expect(shown).toBe(false);
  expect(rendered).toEqual([]);
});

test("missing cached board image can render after generation", async () => {
  const root = tempProject();
  const pngPath = join(root, "board-Board_Image.png");
  const rendered: string[] = [];

  const earlyShown = await maybeRenderBoardImagePreview({
    enabled: true,
    pngPath,
    isInteractive: true,
    renderPreview: (path) =>
      Effect.sync(() => {
        rendered.push(path);
      }),
  }).pipe(run);

  writeFileSync(pngPath, "");

  const postGenerationShown = await maybeRenderBoardImagePreview({
    enabled: true,
    pngPath,
    alreadyShown: earlyShown,
    isInteractive: true,
    renderPreview: (path) =>
      Effect.sync(() => {
        rendered.push(path);
      }),
  }).pipe(run);

  expect(earlyShown).toBe(false);
  expect(postGenerationShown).toBe(true);
  expect(rendered).toEqual([pngPath]);
});
