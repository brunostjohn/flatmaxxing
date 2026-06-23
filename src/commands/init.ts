import {
  defaultAlignmentDrills,
  defaultAvailableDrills,
  defaultAvailableMills,
  defaultCncBackside,
  defaultCncClearance,
  defaultCncDrilling,
  defaultCncIsolation,
  defaultCncNonCopperClearing,
  defaultDrills,
  defaultElectroplating,
  defaultMakeracam,
  defaultPaths,
  defaultPlace,
  defaultSolderMask,
  defaultStencil,
  resolveFrom,
  renderTomlAssignments,
  renderTomlSection,
} from "@/config";
import { Effect } from "effect";
import { Command } from "effect/unstable/cli";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline/promises";

export type InitPrompt = (question: string) => Effect.Effect<string, Error>;

export type InitOptions = {
  readonly cwd?: string | undefined;
  readonly userConfigPath?: string | undefined;
  readonly prompt?: InitPrompt | undefined;
  readonly selectBoard?:
    | ((
        projectDir: string,
        boardFiles: readonly string[],
      ) => Effect.Effect<string, Error>)
    | undefined;
};

export type InitProjectSelection = {
  readonly projectDir: string;
  readonly boardFile?: string | undefined;
};

export type InitResult = InitProjectSelection & {
  readonly configPath: string;
  readonly extendsUserConfig: boolean;
};

type InitSelectionOptions = {
  readonly cwd: string;
  readonly prompt?: InitPrompt | undefined;
  readonly selectBoard?: InitOptions["selectBoard"] | undefined;
};

const generatedConfigFilename = "flatmaxxing.toml";
const userConfigExtendsPath = "~/flatmaxxing.user.toml";

const isKicadBoardFile = (file: string) => file.endsWith(".kicad_pcb");

export const findKicadBoardFiles = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isKicadBoardFile(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

const relativeConfigPath = (fromDirectory: string, toPath: string): string => {
  const from = resolve(fromDirectory);
  const to = resolve(from, toPath);
  const rel = relative(from, to);

  if (rel === "") {
    return ".";
  }

  return rel.startsWith("..") || rel.startsWith(`.${sep}`)
    ? rel
    : `.${sep}${rel}`;
};

const relativeProjectPath = (fromDirectory: string, toPath: string): string => {
  const from = resolve(fromDirectory);
  const to = resolve(from, toPath);
  const rel = relative(from, to);
  return rel === "" ? "." : rel;
};

export const createProjectConfigToml = ({
  extendsUserConfig,
  projectDir,
  boardFile,
}: {
  readonly extendsUserConfig: boolean;
  readonly projectDir: string;
  readonly boardFile?: string | undefined;
}) => {
  const topLevel = renderTomlAssignments([
    ["extends", extendsUserConfig ? [userConfigExtendsPath] : undefined],
    ["projectDir", projectDir],
  ]);

  return `${[
    topLevel,
    renderTomlSection("paths", [
      ["additionalProjects", defaultPaths.additionalProjects],
      ["gcode", defaultPaths.gcode],
      ["svg", defaultPaths.svg],
      ["dxf", defaultPaths.dxf],
      ["png", defaultPaths.png],
      ["gerbers", defaultPaths.gerbers],
      ["drills", defaultPaths.drills],
      ["xtool", defaultPaths.xtool],
      ["place", defaultPaths.place],
      ["cnc", defaultPaths.cnc],
    ]),
    renderTomlSection("board", [
      ["autoFix", false],
      ["file", boardFile],
    ]),
    renderTomlSection("alignmentDrills", [
      ["generate", defaultAlignmentDrills.generate],
      ["distance", defaultAlignmentDrills.distance],
      ["diameter", defaultAlignmentDrills.diameter],
    ]),
    renderTomlSection("electroplating", [
      [
        "generateEdgeCutsWithAlignmentDrills",
        defaultElectroplating.generateEdgeCutsWithAlignmentDrills,
      ],
      ["additionalDistance", defaultElectroplating.additionalDistance],
      ["cornerRadius", defaultElectroplating.cornerRadius],
    ]),
    renderTomlSection("solderMask", [
      ["generate", defaultSolderMask.generate],
      ["double", defaultSolderMask.double],
      ["excludeSides", defaultSolderMask.excludeSides],
      ["distance", defaultSolderMask.distance],
    ]),
    renderTomlSection("stencil", [
      ["generate", defaultStencil.generate],
      ["excludeSides", defaultStencil.excludeSides],
    ]),
    renderTomlSection("drills", [
      ["generate", defaultDrills.generate],
      ["withEdgeCuts", defaultDrills.withEdgeCuts],
    ]),
    renderTomlSection("place", [["generate", defaultPlace.generate]]),
    renderTomlSection("cnc", [
      ["availableDrills", defaultAvailableDrills],
      ["availableMills", defaultAvailableMills],
    ]),
    renderTomlSection("cnc.isolation", [
      ["feedRate", defaultCncIsolation.feedRate],
      ["spindleSpeed", defaultCncIsolation.spindleSpeed],
      ["zCutDepth", defaultCncIsolation.zCutDepth],
      ["zCutFeedRate", defaultCncIsolation.zCutFeedRate],
      ["tool", defaultCncIsolation.tool],
      ["passes", defaultCncIsolation.passes],
      ["overlap", defaultCncIsolation.overlap],
      ["isoType", defaultCncIsolation.isoType],
    ]),
    renderTomlSection("cnc.nonCopperClearing", [
      ["feedRate", defaultCncNonCopperClearing.feedRate],
      ["spindleSpeed", defaultCncNonCopperClearing.spindleSpeed],
      ["zCutDepth", defaultCncNonCopperClearing.zCutDepth],
      ["zCutFeedRate", defaultCncNonCopperClearing.zCutFeedRate],
      ["tool", defaultCncNonCopperClearing.tool],
      ["overlap", defaultCncNonCopperClearing.overlap],
      ["margin", defaultCncNonCopperClearing.margin],
      ["method", defaultCncNonCopperClearing.method],
      ["millZCutDepth", defaultCncNonCopperClearing.millZCutDepth],
    ]),
    renderTomlSection("cnc.clearance", [
      ["travelZ", defaultCncClearance.travelZ],
      ["endZ", defaultCncClearance.endZ],
      ["rapidFeedRate", defaultCncClearance.rapidFeedRate],
      ["seamZ", defaultCncClearance.seamZ],
    ]),
    renderTomlSection("cnc.backside", [
      ["mirrorAxis", defaultCncBackside.mirrorAxis],
    ]),
    renderTomlSection("cnc.drilling", [
      ["matchToleranceMm", defaultCncDrilling.matchToleranceMm],
    ]),
    renderTomlSection("makeracam.platedHoles", [
      ["generate", defaultMakeracam.platedHoles.generate],
    ]),
    renderTomlSection("makeracam.finalCut", [
      ["generate", defaultMakeracam.finalCut.generate],
    ]),
  ].join("\n\n")}\n`;
};

const defaultPrompt: InitPrompt = (question) =>
  Effect.acquireUseRelease(
    Effect.sync(() =>
      createInterface({
        input: process.stdin,
        output: process.stdout,
      }),
    ),
    (readline) => Effect.promise(() => readline.question(question)),
    (readline) => Effect.sync(() => readline.close()),
  );

const chooseBoard = (
  projectDir: string,
  boardFiles: readonly string[],
  prompt: InitPrompt,
): Effect.Effect<string, Error> => {
  if (boardFiles.length === 1) {
    return Effect.succeed(boardFiles[0]!);
  }

  const choices = boardFiles
    .map((file, index) => `${index + 1}. ${file}`)
    .join("\n");

  return prompt(
    `Found more than one KiCad board in ${projectDir}.\n${choices}\nSelect board [1-${boardFiles.length}]: `,
  ).pipe(
    Effect.flatMap((answer) => {
      const trimmed = answer.trim();
      const index = Number(trimmed);

      if (Number.isInteger(index) && index >= 1 && index <= boardFiles.length) {
        return Effect.succeed(boardFiles[index - 1]!);
      }

      if (boardFiles.includes(trimmed)) {
        return Effect.succeed(trimmed);
      }

      return Effect.fail(
        new Error(`Invalid board selection "${answer}" for ${projectDir}.`),
      );
    }),
  );
};

export const selectInitProject = Effect.fn("flatmaxx.init.selectProject")(
  function* ({
    cwd,
    prompt = defaultPrompt,
    selectBoard,
  }: InitSelectionOptions) {
    const cwdBoards = findKicadBoardFiles(cwd);

    if (cwdBoards.length > 0) {
      const selectedBoard = yield* (
        selectBoard?.(cwd, cwdBoards) ?? chooseBoard(cwd, cwdBoards, prompt)
      );

      return {
        projectDir: ".",
        boardFile: cwdBoards.length > 1 ? selectedBoard : undefined,
      };
    }

    const answer = yield* prompt(
      "No KiCad board was found in the current directory. KiCad project directory: ",
    );
    const projectDir = resolveFrom(cwd, answer.trim());

    if (!existsSync(projectDir)) {
      return yield* Effect.fail(
        new Error(`The directory "${projectDir}" does not exist.`),
      );
    }

    const projectBoards = findKicadBoardFiles(projectDir);

    if (projectBoards.length === 0) {
      return yield* Effect.fail(
        new Error(`No KiCad boards found in "${projectDir}".`),
      );
    }

    const selectedBoard = yield* (
      selectBoard?.(projectDir, projectBoards) ??
      chooseBoard(projectDir, projectBoards, prompt)
    );

    return {
      projectDir: relativeConfigPath(cwd, projectDir),
      boardFile:
        projectBoards.length > 1
          ? relativeProjectPath(projectDir, join(projectDir, selectedBoard))
          : undefined,
    };
  },
);

export const runInitWorkflow = Effect.fn("flatmaxx.init")(function* (
  options: InitOptions = {},
) {
  const cwd = options.cwd ? resolve(options.cwd) : process.cwd();
  const configPath = join(cwd, generatedConfigFilename);

  if (existsSync(configPath)) {
    return yield* Effect.fail(
      new Error(`Config file "${configPath}" already exists.`),
    );
  }

  const selection = yield* selectInitProject({
    cwd,
    prompt: options.prompt,
    selectBoard: options.selectBoard,
  });
  const userConfigPath =
    options.userConfigPath ?? join(homedir(), "flatmaxxing.user.toml");
  const extendsUserConfig = existsSync(userConfigPath);
  const toml = createProjectConfigToml({
    extendsUserConfig,
    projectDir: selection.projectDir,
    boardFile: selection.boardFile,
  });

  yield* Effect.promise(() => Bun.write(configPath, toml));

  return {
    configPath,
    extendsUserConfig,
    ...selection,
  } satisfies InitResult;
});

export const makeInitCommand = () =>
  Command.make(
    "init",
    {},
    Effect.fn("flatmaxx.init.command")(function* () {
      const result = yield* runInitWorkflow();
      yield* Effect.sync(() => {
        console.log(`Created ${basename(result.configPath)}.`);
      });
    }),
  ).pipe(
    Command.withDescription(
      "Creates a flatmaxxing.toml config for the current directory.",
    ),
    Command.withShortDescription("Creates a flatmaxxing.toml config."),
  );
