import { expect, test } from "bun:test";
import { loadFlatmaxxConfig } from "@/config";
import { Effect } from "effect";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createProjectConfigToml,
  runInitWorkflow,
  type InitPrompt,
} from "./init";

const tempProject = () => mkdtempSync(join(tmpdir(), "flatmaxx-init-"));

const writeBoard = (directory: string, filename = "board.kicad_pcb") => {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, filename), "");
};

const promptWith =
  (answer: string): InitPrompt =>
  () =>
    Effect.succeed(answer);

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

test("generated project config can omit user extends", () => {
  const toml = createProjectConfigToml({
    extendsUserConfig: false,
    projectDir: ".",
  });

  expect(toml).toContain('projectDir = "."');
  expect(toml).not.toContain("extends");
  expect(toml).toContain("[paths]");
  expect(toml).toContain("[cnc.isolation]");
  expect(toml).toContain("[makeracam.finalCut]");
});

test("generated project config extends user config when requested", () => {
  const toml = createProjectConfigToml({
    extendsUserConfig: true,
    projectDir: ".",
  });

  expect(toml).toContain('extends = ["~/flatmaxxing.user.toml"]');
});

test("init inside a KiCad project writes projectDir dot", async () => {
  const root = tempProject();
  writeBoard(root);

  const result = await runInitWorkflow({
    cwd: root,
    userConfigPath: join(root, "missing-user.toml"),
  }).pipe(Effect.runPromise);
  const configText = readFileSync(result.configPath, "utf8");
  const config = await loadFlatmaxxConfig({ projectRoot: root }).pipe(
    Effect.runPromise,
  );

  expect(configText).toContain('projectDir = "."');
  expect(configText).not.toContain("extends");
  expect(config.projectDir).toBe(root);
  expect(config.paths.gerbers).toBe(join(root, "gerbers"));
});

test("init outside a KiCad project prompts for projectDir", async () => {
  const root = tempProject();
  const projectDir = join(root, "pcb");
  writeBoard(projectDir);

  const result = await runInitWorkflow({
    cwd: root,
    userConfigPath: join(root, "missing-user.toml"),
    prompt: promptWith("./pcb"),
  }).pipe(Effect.runPromise);
  const configText = readFileSync(result.configPath, "utf8");
  const config = await loadFlatmaxxConfig({ projectRoot: root }).pipe(
    Effect.runPromise,
  );

  expect(configText).toContain('projectDir = "./pcb"');
  expect(config.projectDir).toBe(projectDir);
  expect(config.paths.drills).toBe(join(projectDir, "drills"));
});

test("init writes board file when multiple boards are available", async () => {
  const root = tempProject();
  writeBoard(root, "a.kicad_pcb");
  writeBoard(root, "b.kicad_pcb");

  const result = await runInitWorkflow({
    cwd: root,
    userConfigPath: join(root, "missing-user.toml"),
    selectBoard: () => Effect.succeed("b.kicad_pcb"),
  }).pipe(Effect.runPromise);
  const configText = readFileSync(result.configPath, "utf8");
  const config = await loadFlatmaxxConfig({ projectRoot: root }).pipe(
    Effect.runPromise,
  );

  expect(configText).toContain('file = "b.kicad_pcb"');
  expect(config.board.file).toBe(join(root, "b.kicad_pcb"));
});

test("init detects user config and refuses to overwrite project config", async () => {
  const root = tempProject();
  const userConfig = join(root, "flatmaxxing.user.toml");
  writeBoard(root);
  writeFileSync(userConfig, '[dependencies]\nflatcam = "flatcam"\n');

  const result = await runInitWorkflow({
    cwd: root,
    userConfigPath: userConfig,
  }).pipe(Effect.runPromise);
  const configText = readFileSync(result.configPath, "utf8");

  expect(configText).toContain('extends = ["~/flatmaxxing.user.toml"]');

  writeFileSync(result.configPath, "original");

  await expect(
    runInitWorkflow({
      cwd: root,
      userConfigPath: userConfig,
    }).pipe(Effect.runPromise),
  ).rejects.toThrow("already exists");
  expect(readFileSync(result.configPath, "utf8")).toBe("original");
});

test("init help exposes the subcommand", async () => {
  const { stdout, stderr, exitCode } = await runHelp("init", "--help");

  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
  expect(stdout).toContain("flatmaxx init");
});
