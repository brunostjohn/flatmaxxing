import { expect, test } from "bun:test";
import { loadFlatmaxxConfig } from "@/config";
import { Effect } from "effect";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runConfigWorkflow } from "./configEditor";
import {
  assertConfigEditorDescriptorCoverage,
  buildConfigEditorSave,
  configToFormValues,
  prepareConfigEditorTarget,
} from "./configEditorModel";

const tempProject = () => mkdtempSync(join(tmpdir(), "flatmaxx-config-editor-"));

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

test("config editor descriptors cover every config leaf", () => {
  expect(() => assertConfigEditorDescriptorCoverage()).not.toThrow();
});

test("user config save writes sparse overrides", async () => {
  const root = tempProject();
  const userConfigPath = join(root, "flatmaxxing.user.toml");

  const result = await runConfigWorkflow({
    cwd: root,
    user: true,
    userConfigPath,
    renderer: (target) => {
      const values = configToFormValues(target.currentConfig);
      values["dependencies.kicadCli"] = "/custom/kicad-cli";
      values["paths.gcode"] = "./custom-gcodes";
      return Effect.succeed({ type: "save", values });
    },
  }).pipe(Effect.runPromise);

  expect(result.type).toBe("saved");
  const configText = readFileSync(userConfigPath, "utf8");
  expect(configText).toContain("[dependencies]");
  expect(configText).toContain('kicadCli = "/custom/kicad-cli"');
  expect(configText).toContain("[paths]");
  expect(configText).toContain('gcode = "./custom-gcodes"');
  expect(configText).not.toContain("flatcam");

  const config = await loadFlatmaxxConfig({
    projectRoot: root,
    configPath: userConfigPath,
  }).pipe(Effect.runPromise);
  expect(config.dependencies.kicadCli).toBe("/custom/kicad-cli");
  expect(config.paths.gcode).toBe(join(root, "custom-gcodes"));
});

test("project config extends user config and diffs against inherited values", async () => {
  const root = tempProject();
  const projectRoot = join(root, "project");
  const userConfigPath = join(root, "flatmaxxing.user.toml");
  mkdirSync(projectRoot, { recursive: true });
  writeFileSync(
    userConfigPath,
    `
[dependencies]
flatcam = "flatcam-from-user"

[solderMask]
generate = false
`,
  );

  const result = await runConfigWorkflow({
    cwd: root,
    kicadProject: "project",
    userConfigPath,
    renderer: (target) => {
      const values = configToFormValues(target.currentConfig);
      expect(values["dependencies.flatcam"]).toBe("flatcam-from-user");
      expect(values["solderMask.generate"]).toBe(false);
      values["drills.withEdgeCuts"] = true;
      return Effect.succeed({ type: "save", values });
    },
  }).pipe(Effect.runPromise);

  expect(result.type).toBe("saved");
  const configPath = join(projectRoot, "flatmaxxing.toml");
  const configText = readFileSync(configPath, "utf8");
  expect(configText).toContain(`extends = ["${userConfigPath}"`);
  expect(configText).toContain("[drills]");
  expect(configText).toContain("withEdgeCuts = true");
  expect(configText).not.toContain("flatcam-from-user");
  expect(configText).not.toContain("[solderMask]");

  const config = await loadFlatmaxxConfig({
    projectRoot,
  }).pipe(Effect.runPromise);
  expect(config.dependencies.flatcam).toBe("flatcam-from-user");
  expect(config.solderMask.generate).toBe(false);
  expect(config.drills.withEdgeCuts).toBe(true);
});

test("project config preserves explicit config path", async () => {
  const root = tempProject();
  const projectRoot = join(root, "project");
  mkdirSync(join(projectRoot, "config"), { recursive: true });

  const result = await runConfigWorkflow({
    cwd: root,
    kicadProject: "project",
    configPath: "config/custom.toml",
    renderer: (target) => {
      const values = configToFormValues(target.currentConfig);
      values["projectDir"] = "..";
      values["place.generate"] = false;
      return Effect.succeed({ type: "save", values });
    },
  }).pipe(Effect.runPromise);

  expect(result.type).toBe("saved");
  const configText = readFileSync(join(projectRoot, "config/custom.toml"), "utf8");
  expect(configText).toContain('projectDir = ".."');
  expect(configText).toContain("[place]");
  expect(configText).toContain("generate = false");
});

test("invalid submitted config fails before writing", () => {
  const root = tempProject();
  const target = prepareConfigEditorTarget({
    cwd: root,
    user: true,
    userConfigPath: join(root, "flatmaxxing.user.toml"),
  });
  const values = configToFormValues(target.currentConfig);
  values["solderMask.xtool.intensity"] = 999;

  expect(() => buildConfigEditorSave(target, values)).toThrow(
    "solderMask.xtool.intensity",
  );
});

test("config command help exposes user flag", async () => {
  const { stdout, stderr, exitCode } = await runHelp("config", "--help");

  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
  expect(stdout).toContain("flatmaxx config");
  expect(stdout).toContain("--user");
});
