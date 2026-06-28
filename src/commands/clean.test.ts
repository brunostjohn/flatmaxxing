import { expect, test } from "bun:test";
import { loadFlatmaxxConfig } from "@/config";
import { BunServices } from "@effect/platform-bun";
import { Effect } from "effect";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanProjectOutputs } from "./clean";

const tempProject = () => mkdtempSync(join(tmpdir(), "flatmaxx-clean-"));

const seedOutputs = (root: string) => {
  for (const dir of ["gerbers", "drills", "gcodes", "svg", "dxf", "png"]) {
    mkdirSync(join(root, dir), { recursive: true });
    writeFileSync(join(root, dir, "artifact.txt"), "x");
  }
  writeFileSync(join(root, "ROUNDED_UP.txt"), "x");
  writeFileSync(join(root, "PLATING.txt"), "x");
  writeFileSync(join(root, "board.kicad_pcb"), "");
  writeFileSync(join(root, "flatmaxxing.toml"), "");
};

const loadConfig = (root: string) =>
  loadFlatmaxxConfig({ projectRoot: root }).pipe(
    Effect.provide(BunServices.layer),
    Effect.runPromise,
  );

const runClean = (root: string, dryRun: boolean) =>
  loadConfig(root).then((config) =>
    cleanProjectOutputs(config, { dryRun }).pipe(
      Effect.provide(BunServices.layer),
      Effect.runPromise,
    ),
  );

const runHelp = async (...args: string[]) => {
  const proc = Bun.spawn(["bun", "src/index.ts", ...args], {
    cwd: process.cwd(),
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
};

test("clean removes output directories and loose report files", async () => {
  const root = tempProject();
  seedOutputs(root);

  const result = await runClean(root, false);

  expect(result.dryRun).toBe(false);
  expect(result.removed).toContain(join(root, "gerbers"));
  expect(result.removed).toContain(join(root, "drills"));
  expect(result.removed).toContain(join(root, "gcodes"));
  expect(result.removed).toContain(join(root, "ROUNDED_UP.txt"));
  expect(result.removed).toContain(join(root, "PLATING.txt"));

  expect(existsSync(join(root, "gerbers"))).toBe(false);
  expect(existsSync(join(root, "drills"))).toBe(false);
  expect(existsSync(join(root, "ROUNDED_UP.txt"))).toBe(false);
  expect(existsSync(join(root, "PLATING.txt"))).toBe(false);
});

test("clean never touches source board or config files", async () => {
  const root = tempProject();
  seedOutputs(root);

  await runClean(root, false);

  expect(existsSync(join(root, "board.kicad_pcb"))).toBe(true);
  expect(existsSync(join(root, "flatmaxxing.toml"))).toBe(true);
});

test("clean dry-run reports outputs without deleting them", async () => {
  const root = tempProject();
  seedOutputs(root);

  const result = await runClean(root, true);

  expect(result.dryRun).toBe(true);
  expect(result.removed).toContain(join(root, "gerbers"));
  expect(existsSync(join(root, "gerbers"))).toBe(true);
  expect(existsSync(join(root, "ROUNDED_UP.txt"))).toBe(true);
});

test("clean never removes the project dir when a path is misconfigured to dot", async () => {
  const root = tempProject();
  seedOutputs(root);
  writeFileSync(join(root, "flatmaxxing.toml"), '[paths]\nsvg = "."\n');

  const result = await runClean(root, false);

  expect(result.removed).not.toContain(root);
  expect(existsSync(root)).toBe(true);
  expect(existsSync(join(root, "board.kicad_pcb"))).toBe(true);
});

test("clean reports nothing when there are no outputs", async () => {
  const root = tempProject();
  writeFileSync(join(root, "board.kicad_pcb"), "");

  const result = await runClean(root, false);

  expect(result.removed).toEqual([]);
});

test("clean help exposes the subcommand and dry-run flag", async () => {
  const { stdout, stderr, exitCode } = await runHelp("clean", "--help");

  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
  expect(stdout).toContain("flatmaxx clean");
  expect(stdout).toContain("--dry-run");
});
