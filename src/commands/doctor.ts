import { promptYesNo } from "@/cli";
import {
  applySchemaAssociationToFile,
  ensureGlobalSchemaFile,
  schemaFileRef,
  settingsFileHasAssociation,
  vscodeUserSettingsCandidates,
} from "@/editorSchema";
import { runPreflight } from "@/preflight";
import {
  installSkill,
  isNpxAvailable,
  isSkillInstalledGlobally,
} from "@/skills";
import { renderBoardHeader } from "@/stages";
import { Effect } from "effect";
import { Command } from "effect/unstable/cli";
import { homedir } from "node:os";
import {
  type ProjectCliInput,
  type SharedCliInput,
  loadConfigFromCli,
  mergeWithParentInput,
  projectArgument,
  resolveBoardImagePngPath,
} from "./helpers";
import type { rootBuildCommand } from "./build";

const offerGlobalSkillInstall = Effect.fn("flatmaxx.doctor.offerSkill")(
  function* (autoInstall: boolean) {
    if (!autoInstall) {
      return;
    }

    if (!(yield* isNpxAvailable())) {
      yield* Effect.sync(() =>
        console.log("flatmaxxing skill: npx was not found on PATH; skipping."),
      );
      return;
    }

    if (yield* isSkillInstalledGlobally()) {
      yield* Effect.sync(() =>
        console.log("flatmaxxing skill is already installed globally."),
      );
      return;
    }

    const install = yield* promptYesNo(
      "Install the flatmaxxing agent skill globally? [Y/n] ",
    );

    if (!install) {
      return;
    }

    const home = yield* Effect.sync(() => homedir());
    yield* installSkill({ cwd: home, global: true }).pipe(
      Effect.catchTag("SkillInstallError", (error) =>
        Effect.sync(() =>
          console.warn(`flatmaxxing skill install failed: ${error.message}`),
        ),
      ),
    );
  },
);

const offerGlobalSchemaAssociation = Effect.fn("flatmaxx.doctor.offerSchema")(
  function* () {
    const candidates = yield* vscodeUserSettingsCandidates();

    if (candidates.length === 0) {
      return;
    }

    const missing = yield* Effect.filter(candidates, (settingsPath) =>
      settingsFileHasAssociation(settingsPath).pipe(Effect.map((has) => !has)),
    );

    if (missing.length === 0) {
      yield* Effect.sync(() =>
        console.log(
          "VS Code is already configured to validate flatmaxxing.toml files.",
        ),
      );
      return;
    }

    const apply = yield* promptYesNo(
      "Associate flatmaxxing.toml files with the schema in VS Code globally? [Y/n] ",
    );

    if (!apply) {
      return;
    }

    const schemaFile = yield* ensureGlobalSchemaFile();
    const ref = yield* schemaFileRef(schemaFile);

    yield* Effect.forEach(missing, (settingsPath) =>
      applySchemaAssociationToFile(settingsPath, ref).pipe(
        Effect.flatMap((changed) =>
          Effect.sync(() =>
            console.log(
              changed
                ? `Updated ${settingsPath}.`
                : `${settingsPath} already configured.`,
            ),
          ),
        ),
      ),
    );
  },
);

export const makeDoctorCommand = (parentCommand: typeof rootBuildCommand) =>
  Command.make(
    "doctor",
    {
      kicadProject: projectArgument,
    },
    Effect.fn("flatmaxx.doctor")(function* (input: ProjectCliInput) {
      const parent = (yield* parentCommand) as SharedCliInput;
      const config = yield* loadConfigFromCli(
        mergeWithParentInput(input, parent),
      );
      yield* renderBoardHeader(yield* resolveBoardImagePngPath(config));

      yield* runPreflight(config, {
        title: "flatmaxx doctor",
      });

      yield* offerGlobalSkillInstall(config.skills.autoInstall).pipe(
        Effect.ignore,
      );

      yield* offerGlobalSchemaAssociation().pipe(Effect.ignore);
    }),
  ).pipe(
    Command.withDescription(
      "Checks whether the required flatmaxx software and macOS permissions are available.",
    ),
  );
