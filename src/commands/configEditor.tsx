import { renderWithOutput } from "@/inkHelpers";
import { renderBoardHeader } from "@/stages";
import { Form, type FormField, type FormStructure } from "ink-form";
import { Box, Text, useInput, useStdout } from "ink";
import { Effect, FileSystem, Match, Option, Path } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { useEffect, useMemo, useState } from "react";
import type { rootBuildCommand } from "./build";
import {
  buildConfigEditorSave,
  configEditorSections,
  configToFormValues,
  prepareConfigEditorTarget,
  type BuildConfigEditorSaveResult,
  type ConfigEditorField,
  type ConfigEditorTarget,
  type PrepareConfigEditorTargetOptions,
} from "./configEditorModel";
import {
  type ProjectCliInput,
  type SharedCliInput,
  loadConfigFromCli,
  mergeWithParentInput,
  projectArgument,
  resolveBoardImagePngPath,
} from "./helpers";

type ConfigEditorResult =
  | {
      readonly type: "save";
      readonly values: Record<string, unknown>;
    }
  | {
      readonly type: "cancel";
    };

export type ConfigEditorRenderer = (
  target: ConfigEditorTarget,
) => Effect.Effect<ConfigEditorResult, Error>;

export type RunConfigWorkflowOptions = PrepareConfigEditorTargetOptions & {
  readonly renderer?: ConfigEditorRenderer | undefined;
};

export type RunConfigWorkflowResult =
  | (BuildConfigEditorSaveResult & { readonly type: "saved" })
  | { readonly type: "cancelled"; readonly targetPath: string };

const userFlag = Flag.boolean("user").pipe(
  Flag.withDescription(
    "Edit ~/flatmaxxing.user.toml instead of the project config.",
  ),
);

const fieldName = (field: Pick<ConfigEditorField, "path">): string =>
  field.path.join(".");

const toFormField = (field: ConfigEditorField): FormField => {
  const base = {
    name: fieldName(field),
    label: field.label,
    description: field.description,
  };

  switch (field.kind) {
    case "boolean":
      return { ...base, type: "boolean" };
    case "float":
      return {
        ...base,
        type: "float",
        min: field.min,
        max: field.max,
        step: field.step ?? 0.1,
      };
    case "integer":
      return {
        ...base,
        type: "integer",
        min: field.min,
        max: field.max,
        step: field.step ?? 1,
      };
    case "numberSelect":
    case "select":
      return {
        ...base,
        type: "select",
        options: [...(field.options ?? [])],
      };
    case "optionalFloat":
    case "optionalString":
    case "string":
    case "toml":
      return {
        ...base,
        type: "string",
        placeholder: field.placeholder,
      };
  }
};

const formSections = configEditorSections.map((section) => ({
  title: section.title,
  fields: section.fields.map(toFormField),
}));

interface TerminalSize {
  readonly rows: number;
  readonly columns: number;
}

const useTerminalSize = (): TerminalSize => {
  const { stdout } = useStdout();
  const [size, setSize] = useState<TerminalSize>(() => ({
    rows: stdout?.rows ?? 24,
    columns: stdout?.columns ?? 80,
  }));

  useEffect(() => {
    if (!stdout) {
      return;
    }
    const onResize = () =>
      setSize({ rows: stdout.rows, columns: stdout.columns });
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  return size;
};

interface ConfigEditorAppProps {
  readonly target: ConfigEditorTarget;
  readonly onFinish: (result: ConfigEditorResult) => void;
}

const ConfigEditorApp = ({ target, onFinish }: ConfigEditorAppProps) => {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    configToFormValues(target.currentConfig),
  );
  const { rows, columns } = useTerminalSize();

  const formStructure: FormStructure = useMemo(
    () => ({
      title:
        target.mode === "user"
          ? "flatmaxx user config"
          : "flatmaxx project config",
      sections: formSections,
    }),
    [target.mode],
  );

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      onFinish({ type: "cancel" });
      return;
    }
    if (key.ctrl && input === "s") {
      onFinish({ type: "save", values });
    }
  });

  return (
    <Box flexDirection="column" width={columns} height={Math.max(8, rows - 1)}>
      <Box flexDirection="column" flexShrink={0}>
        <Text bold>
          {target.mode === "user" ? "User config" : "Project config"}:{" "}
          <Text color="cyan">{target.targetPath}</Text>
        </Text>
        <Text dimColor>
          number/←→ switch tab · ↑↓ select field · Enter edit · Ctrl+S save ·
          Ctrl+C cancel
        </Text>
      </Box>

      <Box flexGrow={1} overflow="hidden">
        <Form
          form={formStructure}
          value={values}
          onChange={(next) => setValues(next as Record<string, unknown>)}
          onSubmit={(next) =>
            onFinish({
              type: "save",
              values: next as Record<string, unknown>,
            })
          }
        />
      </Box>
    </Box>
  );
};

export const defaultConfigEditorRenderer: ConfigEditorRenderer = (target) =>
  renderWithOutput<ConfigEditorResult>((send) => (
    <ConfigEditorApp target={target} onFinish={send} />
  ));

export const saveConfigEditorValues = Effect.fn("flatmaxx.config.save")(
  function* (target: ConfigEditorTarget, values: Record<string, unknown>) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const built = buildConfigEditorSave(target, values);
    yield* fs.makeDirectory(path.dirname(built.targetPath), {
      recursive: true,
    });
    yield* fs.writeFileString(built.targetPath, built.toml);
    return built;
  },
);

export const runConfigWorkflow = Effect.fn("flatmaxx.config.command.run")(
  function* (options: RunConfigWorkflowOptions = {}) {
    const target = prepareConfigEditorTarget(options);
    const result = yield* (options.renderer ?? defaultConfigEditorRenderer)(
      target,
    );

    if (result.type === "cancel") {
      return {
        type: "cancelled",
        targetPath: target.targetPath,
      } satisfies RunConfigWorkflowResult;
    }

    const saved = yield* saveConfigEditorValues(target, result.values);
    return {
      ...saved,
      type: "saved",
    } satisfies RunConfigWorkflowResult;
  },
);

export const makeConfigCommand = (parentCommand: typeof rootBuildCommand) =>
  Command.make(
    "config",
    {
      kicadProject: projectArgument,
      user: userFlag,
    },
    Effect.fn("flatmaxx.config.command")(function* (
      input: ProjectCliInput & { readonly user: boolean },
    ) {
      const path = yield* Path.Path;
      const parent = (yield* parentCommand) as SharedCliInput;
      const headerPng = yield* loadConfigFromCli(
        mergeWithParentInput(input, parent),
      ).pipe(
        Effect.flatMap(resolveBoardImagePngPath),
        Effect.catch(() => Effect.succeed(Option.none<string>())),
      );
      yield* renderBoardHeader(headerPng);
      const result = yield* runConfigWorkflow({
        kicadProject: input.kicadProject,
        user: input.user,
        configPath: Option.getOrUndefined(parent.configPath),
      });
      const name = path.basename(result.targetPath);
      const message = Match.value(result.type).pipe(
        Match.when("saved", () => `Saved ${name}.`),
        Match.orElse(() => `No changes written to ${name}.`),
      );

      yield* Effect.sync(() => console.log(message));
    }),
  ).pipe(
    Command.withDescription(
      "Opens an interactive editor for flatmaxxing TOML config.",
    ),
    Command.withShortDescription("Edits flatmaxxing config."),
  );
