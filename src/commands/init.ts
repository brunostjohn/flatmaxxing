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
  defaultSkills,
  defaultSkipRenderBoard,
  defaultSolderMask,
  defaultStencil,
  loadFlatmaxxConfig,
  resolveFrom,
  renderTomlAssignments,
  renderTomlSection,
} from "@/config";
import { writeProjectSchemaAssociation } from "@/editorSchema";
import { CliError } from "@/errors";
import {
  installSkill,
  isNpxAvailable,
  isSkillInstalledGlobally,
  isSkillInstalledInProject,
} from "@/skills";
import { renderBoardHeader } from "@/stages";
import { Array, Effect, FileSystem, Match, Option, Order, Path } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { homedir } from "node:os";
import { createInterface } from "node:readline/promises";

export type InitPrompt = (question: string) => Effect.Effect<string, CliError>;

export interface InitOptions {
  readonly cwd?: string | undefined;
  readonly userConfigPath?: string | undefined;
  readonly prompt?: InitPrompt | undefined;
  readonly selectBoard?:
    | ((
        projectDir: string,
        boardFiles: readonly string[],
      ) => Effect.Effect<string, CliError>)
    | undefined;
}

export interface InitProjectSelection {
  readonly projectDir: string;
  readonly boardFile?: string | undefined;
}

export type InitResult = InitProjectSelection & {
  readonly configPath: string;
  readonly extendsUserConfig: boolean;
};

interface InitSelectionOptions {
  readonly cwd: string;
  readonly prompt?: InitPrompt | undefined;
  readonly selectBoard?: InitOptions["selectBoard"] | undefined;
}

const generatedConfigFilename = "flatmaxxing.toml";
const userConfigExtendsPath = "~/flatmaxxing.user.toml";
const userConfigFilename = "flatmaxxing.user.toml";
const kicadBoardExtension = ".kicad_pcb";

const boardNameOrder = Order.make<string>((a, b) =>
  a.localeCompare(b) < 0 ? -1 : a.localeCompare(b) > 0 ? 1 : 0,
);

const isKicadBoardFile = (file: string) => file.endsWith(kicadBoardExtension);

export const findKicadBoardFiles = Effect.fn("flatmaxx.init.findBoards")(
  function* (directory: string) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const exists = yield* fs.exists(directory);

    if (!exists) {
      return [] as readonly string[];
    }

    const entries = yield* fs.readDirectory(directory);
    const candidates = Array.filter(entries, isKicadBoardFile);
    const files = yield* Effect.filter(candidates, (name) =>
      fs.stat(path.join(directory, name)).pipe(
        Effect.map((info) => info.type === "File"),
        Effect.orElseSucceed(() => false),
      ),
    );

    return Array.sort(files, boardNameOrder);
  },
);

const relativeConfigPath = Effect.fn("flatmaxx.init.relativeConfigPath")(
  function* (fromDirectory: string, toPath: string) {
    const path = yield* Path.Path;
    const from = path.resolve(fromDirectory);
    const to = path.resolve(from, toPath);
    const rel = path.relative(from, to);

    if (rel === "") {
      return ".";
    }

    return rel.startsWith("..") || rel.startsWith(`.${path.sep}`)
      ? rel
      : `.${path.sep}${rel}`;
  },
);

const relativeProjectPath = Effect.fn("flatmaxx.init.relativeProjectPath")(
  function* (fromDirectory: string, toPath: string) {
    const path = yield* Path.Path;
    const from = path.resolve(fromDirectory);
    const to = path.resolve(from, toPath);
    const rel = path.relative(from, to);
    return rel === "" ? "." : rel;
  },
);

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
    ["skipRenderBoard", defaultSkipRenderBoard],
  ]);

  return `${[
    topLevel,
    renderTomlSection("skills", [["autoInstall", defaultSkills.autoInstall]]),
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
    (readline) =>
      Effect.tryPromise({
        try: () => readline.question(question),
        catch: (cause) =>
          new CliError({ message: "Failed to read input.", cause }),
      }),
    (readline) => Effect.sync(() => readline.close()),
  );

const chooseBoardByAnswer = (
  answer: string,
  boardFiles: readonly string[],
  projectDir: string,
): Effect.Effect<string, CliError> => {
  const trimmed = answer.trim();
  const index = Number(trimmed);

  if (Number.isInteger(index) && index >= 1 && index <= boardFiles.length) {
    return Effect.succeed(boardFiles[index - 1]!);
  }

  if (boardFiles.includes(trimmed)) {
    return Effect.succeed(trimmed);
  }

  return Effect.fail(
    new CliError({
      message: `Invalid board selection "${answer}" for ${projectDir}.`,
    }),
  );
};

const chooseBoard = (
  projectDir: string,
  boardFiles: readonly string[],
  prompt: InitPrompt,
): Effect.Effect<string, CliError> =>
  Match.value(boardFiles.length === 1).pipe(
    Match.when(true, () => Effect.succeed(boardFiles[0]!)),
    Match.orElse(() => {
      const choices = boardFiles
        .map((file, index) => `${index + 1}. ${file}`)
        .join("\n");

      return prompt(
        `Found more than one KiCad board in ${projectDir}.\n${choices}\nSelect board [1-${boardFiles.length}]: `,
      ).pipe(
        Effect.flatMap((answer) =>
          chooseBoardByAnswer(answer, boardFiles, projectDir),
        ),
      );
    }),
  );

export const selectInitProject = Effect.fn("flatmaxx.init.selectProject")(
  function* ({
    cwd,
    prompt = defaultPrompt,
    selectBoard,
  }: InitSelectionOptions) {
    const path = yield* Path.Path;
    const cwdBoards = yield* findKicadBoardFiles(cwd);

    if (cwdBoards.length > 0) {
      const selectedBoard = yield* selectBoard?.(cwd, cwdBoards) ??
        chooseBoard(cwd, cwdBoards, prompt);

      return {
        projectDir: ".",
        boardFile: cwdBoards.length > 1 ? selectedBoard : undefined,
      };
    }

    const answer = yield* prompt(
      "No KiCad board was found in the current directory. KiCad project directory: ",
    );
    const projectDir = yield* resolveFrom(cwd, answer.trim());
    const fs = yield* FileSystem.FileSystem;

    if (!(yield* fs.exists(projectDir))) {
      return yield* Effect.fail(
        new CliError({
          message: `The directory "${projectDir}" does not exist.`,
        }),
      );
    }

    const projectBoards = yield* findKicadBoardFiles(projectDir);

    if (projectBoards.length === 0) {
      return yield* Effect.fail(
        new CliError({ message: `No KiCad boards found in "${projectDir}".` }),
      );
    }

    const selectedBoard = yield* selectBoard?.(projectDir, projectBoards) ??
      chooseBoard(projectDir, projectBoards, prompt);

    return {
      projectDir: yield* relativeConfigPath(cwd, projectDir),
      boardFile:
        projectBoards.length > 1
          ? yield* relativeProjectPath(
              projectDir,
              path.join(projectDir, selectedBoard),
            )
          : undefined,
    };
  },
);

export const runInitWorkflow = Effect.fn("flatmaxx.init")(function* (
  options: InitOptions = {},
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const configPath = path.join(cwd, generatedConfigFilename);

  if (yield* fs.exists(configPath)) {
    return yield* Effect.fail(
      new CliError({ message: `Config file "${configPath}" already exists.` }),
    );
  }

  const selection = yield* selectInitProject({
    cwd,
    prompt: options.prompt,
    selectBoard: options.selectBoard,
  });
  const home = yield* Effect.sync(() => homedir());
  const userConfigPath =
    options.userConfigPath ?? path.join(home, userConfigFilename);
  const extendsUserConfig = yield* fs.exists(userConfigPath);
  const toml = createProjectConfigToml({
    extendsUserConfig,
    projectDir: selection.projectDir,
    boardFile: selection.boardFile,
  });

  yield* fs.writeFileString(configPath, toml);
  yield* writeProjectSchemaAssociation(cwd).pipe(Effect.ignore);

  return {
    configPath,
    extendsUserConfig,
    ...selection,
  } satisfies InitResult;
});

const userConfigAutoInstall = Effect.fn("flatmaxx.init.userAutoInstall")(
  function* (userConfigPath: string) {
    const fs = yield* FileSystem.FileSystem;

    if (!(yield* fs.exists(userConfigPath))) {
      return defaultSkills.autoInstall;
    }

    return yield* loadFlatmaxxConfig({
      projectRoot: yield* Effect.sync(() => homedir()),
      configPath: userConfigPath,
    }).pipe(
      Effect.map((config) => config.skills.autoInstall),
      Effect.orElseSucceed(() => defaultSkills.autoInstall),
    );
  },
);

const maybeInstallSkillForInit = Effect.fn("flatmaxx.init.installSkill")(
  function* ({
    cwd,
    skipSkill,
  }: {
    readonly cwd: string;
    readonly skipSkill: boolean;
  }) {
    if (skipSkill) {
      return;
    }

    const path = yield* Path.Path;
    const home = yield* Effect.sync(() => homedir());

    if (!(yield* userConfigAutoInstall(path.join(home, userConfigFilename)))) {
      return;
    }

    if (!(yield* isNpxAvailable())) {
      yield* Effect.sync(() =>
        console.log(
          "Skipping flatmaxxing skill install: npx was not found on PATH.",
        ),
      );
      return;
    }

    if (yield* isSkillInstalledGlobally()) {
      yield* Effect.sync(() =>
        console.log("flatmaxxing skill is already installed globally."),
      );
      return;
    }

    if (yield* isSkillInstalledInProject(cwd)) {
      return;
    }

    yield* Effect.sync(() => console.log("Installing the flatmaxxing skill…"));
    yield* installSkill({ cwd, global: false }).pipe(
      Effect.catchTag("SkillInstallError", (error) =>
        Effect.sync(() =>
          console.warn(`flatmaxxing skill install failed: ${error.message}`),
        ),
      ),
    );
  },
);

export const makeInitCommand = () =>
  Command.make(
    "init",
    {
      skipSkill: Flag.boolean("skip-skill").pipe(
        Flag.withDescription(
          "Skip installing the flatmaxxing agent skill for this project.",
        ),
        Flag.optional,
      ),
    },
    Effect.fn("flatmaxx.init.command")(function* (input) {
      const path = yield* Path.Path;
      yield* renderBoardHeader(Option.none());
      const result = yield* runInitWorkflow();
      const name = path.basename(result.configPath);
      yield* Effect.sync(() => console.log(`Created ${name}.`));
      yield* maybeInstallSkillForInit({
        cwd: path.dirname(result.configPath),
        skipSkill: Option.getOrElse(input.skipSkill, () => false),
      }).pipe(Effect.ignore);
    }),
  ).pipe(
    Command.withDescription(
      "Creates a flatmaxxing.toml config for the current directory.",
    ),
    Command.withShortDescription("Creates a flatmaxxing.toml config."),
  );
