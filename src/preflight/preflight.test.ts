import { loadFlatmaxxConfig, type ResolvedConfig } from "@/config";
import { BunServices } from "@effect/platform-bun";
import { expect, test } from "bun:test";
import { Effect, Path } from "effect";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { failIfPreflightFailed } from "./preflight";
import { buildPreflightRequirements } from "./requirements";
import { resolveExecutableDependency } from "./dependencyResolver";
import type { PreflightReport } from "./types";

const tempDir = (prefix = "flatmaxx-preflight-") =>
  mkdtempSync(join(tmpdir(), prefix));

const tempProject = () => tempDir("flatmaxx-preflight-project-");

const writeConfig = (root: string, content: string) => {
  writeFileSync(join(root, "flatmaxxing.toml"), content);
};

const loadConfig = (projectRoot: string) =>
  loadFlatmaxxConfig({ projectRoot }).pipe(
    Effect.provide(Path.layer),
    Effect.runPromise,
  );

const resolveExecutable = (
  value: string,
  options?: Parameters<typeof resolveExecutableDependency>[1],
) =>
  resolveExecutableDependency(value, options).pipe(
    Effect.provide(BunServices.layer),
    Effect.runPromise,
  );

const ids = (config: ResolvedConfig) =>
  buildPreflightRequirements(config).map((requirement) => requirement.id);

test("resolves an absolute executable path", async () => {
  const root = tempDir();
  const executable = join(root, "tool");
  writeFileSync(executable, "#!/bin/sh\n");
  chmodSync(executable, 0o755);

  expect(await resolveExecutable(executable)).toEqual({
    status: "found",
    path: executable,
  });
});

test("resolves a command from PATH", async () => {
  const root = tempDir();
  const executable = join(root, "flatcam");
  writeFileSync(executable, "#!/bin/sh\n");
  chmodSync(executable, 0o755);

  expect(
    await resolveExecutable("flatcam", {
      env: { PATH: root },
    }),
  ).toEqual({
    status: "found",
    path: executable,
  });
});

test("reports a missing command", async () => {
  expect(
    await resolveExecutable("definitely-not-flatmaxx", {
      env: { PATH: tempDir() },
    }),
  ).toMatchObject({
    status: "missing",
    message: '"definitely-not-flatmaxx" was not found on PATH.',
  });
});

test("reports a non-executable file", async () => {
  const root = tempDir();
  const executable = join(root, "tool");
  writeFileSync(executable, "#!/bin/sh\n");
  chmodSync(executable, 0o644);

  expect(await resolveExecutable(executable)).toMatchObject({
    status: "missing",
    message: `"${executable}" exists but is not executable.`,
  });
});

test("derives preflight checks from enabled stages", async () => {
  const root = tempProject();
  const config = await loadConfig(root);
  const defaultIds = ids(config);

  expect(defaultIds).toContain("dependency:kicad-cli");
  expect(defaultIds).toContain("dependency:flatcam");
  expect(defaultIds).toContain("dependency:xtool-studio");
  expect(defaultIds).toContain("dependency:makeracam");
  expect(defaultIds).toContain("macos:accessibility");

  writeConfig(
    root,
    `
[solderMask]
generate = false

[stencil]
generate = false

[makeracam.platedHoles]
generate = false

[makeracam.finalCut]
generate = false
`,
  );

  const disabledConfig = await loadConfig(root);
  const disabledIds = ids(disabledConfig);

  expect(disabledIds).toContain("dependency:kicad-cli");
  expect(disabledIds).toContain("dependency:flatcam");
  expect(disabledIds).not.toContain("dependency:xtool-studio");
  expect(disabledIds).not.toContain("dependency:makeracam");
  expect(disabledIds).not.toContain("macos:accessibility");
});

test("skips FlatCAM preflight when CNC jobs are disabled", async () => {
  const root = tempProject();
  const config = await loadConfig(root);
  const noCncConfig: ResolvedConfig = {
    ...config,
    cnc: {
      ...config.cnc,
      isolation: {
        ...config.cnc.isolation,
        tool: undefined,
      },
    },
  };

  expect(ids(noCncConfig)).not.toContain("dependency:flatcam");
});

test("preflight aggregation fails only for required failures", async () => {
  const warningOnly = {
    title: "test",
    results: [
      {
        id: "warning",
        label: "Warning",
        severity: "warning",
        status: "warn",
        message: "heads up",
      },
    ],
  } satisfies PreflightReport;

  await expect(
    Effect.runPromise(failIfPreflightFailed(warningOnly)),
  ).resolves.toBe(warningOnly);

  const requiredFailure = {
    title: "test",
    results: [
      {
        id: "required",
        label: "Required",
        severity: "required",
        status: "fail",
        message: "missing",
      },
    ],
  } satisfies PreflightReport;

  await expect(
    Effect.runPromise(failIfPreflightFailed(requiredFailure)),
  ).rejects.toThrow("Required: missing");
});
