import { expect, test } from "bun:test";
import { loadFlatmaxxConfig } from "@/config";
import { Effect, Path } from "effect";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildCliOverrides,
  parseCliSetOverride,
  parseCliUnsetOverride,
} from "./cliOverrides";

const tempProject = () =>
  mkdtempSync(join(tmpdir(), "flatmaxx-cli-overrides-"));

const writeConfig = (root: string, filename: string, content: string) => {
  const path = join(root, filename);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
  return path;
};

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

test("parses --set path=value TOML literals", () => {
  expect(parseCliSetOverride("cnc.isolation.feedRate=120")).toMatchObject({
    type: "set",
    path: "cnc.isolation.feedRate",
    value: 120,
  });

  expect(
    buildCliOverrides({
      set: [
        'solderMask.excludeSides=["front"]',
        'cnc.availableMills=[{ type = "mill", diameter = 1.2 }]',
      ],
    }),
  ).toEqual({
    solderMask: {
      excludeSides: ["front"],
    },
    cnc: {
      availableMills: [{ type: "mill", diameter: 1.2 }],
    },
  });
});

test("rejects unknown paths, malformed values, and duplicate overrides", () => {
  expect(() => parseCliSetOverride("cnc.nope=1")).toThrow(
    "unknown config path",
  );
  expect(() => parseCliSetOverride("paths.gcode=./gcode")).toThrow(
    "invalid TOML literal",
  );
  expect(() =>
    buildCliOverrides({
      set: ['paths.gcode="./a"', 'paths.gcode="./b"'],
    }),
  ).toThrow("overridden more than once");
  expect(() =>
    buildCliOverrides({
      aliases: [
        {
          path: "solderMask.generate",
          value: true,
          source: "--solder-mask",
        },
      ],
      set: ["solderMask.generate=false"],
    }),
  ).toThrow("overridden more than once");
});

test("--unset only clears optional config paths", () => {
  expect(parseCliUnsetOverride("board.file")).toMatchObject({
    type: "unset",
    path: "board.file",
  });

  expect(buildCliOverrides({ unset: ["board.file"] })).toEqual({
    board: {
      file: undefined,
    },
  });
  expect(() => parseCliUnsetOverride("paths.gcode")).toThrow(
    "only clear optional",
  );
});

test("curated aliases produce the same sparse config as --set", () => {
  const fromAlias = buildCliOverrides({
    aliases: [
      {
        path: "dependencies.kicadCli",
        value: "/custom/kicad-cli",
        source: "--path-to-kicad",
      },
      {
        path: "solderMask.generate",
        value: false,
        source: "--solder-mask",
      },
      {
        path: "cnc.isolation.feedRate",
        value: 120,
        source: "--isolation-feed-rate",
      },
    ],
  });
  const fromSet = buildCliOverrides({
    set: [
      'dependencies.kicadCli="/custom/kicad-cli"',
      "solderMask.generate=false",
      "cnc.isolation.feedRate=120",
    ],
  });

  expect(fromAlias).toEqual(fromSet);
});

test("CLI overrides win over extends and project config before normalization", async () => {
  const root = tempProject();
  writeConfig(
    root,
    "base.toml",
    `
[paths]
gcode = "./from-base"

[dependencies]
flatcam = "flatcam-from-base"
`,
  );
  writeConfig(
    root,
    "flatmaxxing.toml",
    `
extends = ["base.toml"]

[paths]
gcode = "./from-project"
`,
  );

  const config = await loadFlatmaxxConfig({
    projectRoot: root,
    cliOverrides: buildCliOverrides({
      set: ['paths.gcode="./from-cli"'],
      aliases: [
        {
          path: "dependencies.flatcam",
          value: "flatcam-from-cli",
          source: "--flatcam",
        },
      ],
    }),
  }).pipe(Effect.provide(Path.layer), Effect.runPromise);

  expect(config.paths.gcode).toBe(join(root, "from-cli"));
  expect(config.dependencies.flatcam).toBe("flatcam-from-cli");
});

test("CLI override values still pass through resolved config validation", async () => {
  const root = tempProject();

  await expect(
    loadFlatmaxxConfig({
      projectRoot: root,
      cliOverrides: buildCliOverrides({
        set: ["solderMask.xtool.intensity=200"],
      }),
    }).pipe(Effect.provide(Path.layer), Effect.runPromise),
  ).rejects.toThrow("solderMask.xtool.intensity");
});

test("help exposes universal and curated shared override flags", async () => {
  for (const args of [
    ["--help"],
    ["build", "--help"],
    ["validate", "--help"],
    ["doctor", "--help"],
  ]) {
    const { stdout, stderr, exitCode } = await runHelp(...args);

    expect(stderr).toBe("");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--set");
    expect(stdout).toContain("--unset");
    expect(stdout).toContain("--flatcam");
    expect(stdout).toContain("--solder-mask");
    expect(stdout).toContain("--isolation-feed-rate");
    expect(stdout).toContain("--xtool-cdp-port");
  }
});
