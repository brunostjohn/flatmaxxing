import { renderWithOutput } from "@/inkHelpers";
import { renderBoardHeader } from "@/stages";
import { Form, type FormField, type FormStructure } from "ink-form";
import { ScrollView, type ScrollViewRef } from "ink-scroll-view";
import { Tab, Tabs } from "ink-tab";
import { Box, Text, useInput, useStdout } from "ink";
import { TitledBox, titleStyles } from "@mishieck/ink-titled-box";
import { Effect, FileSystem, Match, Option, Path } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { useEffect, useMemo, useRef, useState } from "react";
import type { rootBuildCommand } from "./build";
import {
  buildConfigEditorSave,
  configEditorFields,
  configEditorSections,
  configToFormValues,
  prepareConfigEditorTarget,
  sectionForFieldPath,
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

interface ConfigEditorSearchItem {
  readonly label: string;
  readonly value: string;
}

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

const sectionTitleById = new Map(
  configEditorSections.map((section) => [section.id, section.title]),
);

const searchItems = configEditorFields.map((field) => {
  const settingPath = fieldName(field);
  const title = sectionTitleById.get(field.sectionId) ?? field.sectionId;
  return {
    label: `${title} / ${field.label} (${settingPath})`,
    value: settingPath,
  } satisfies ConfigEditorSearchItem;
});

interface QuickSearchProps {
  readonly items: readonly ConfigEditorSearchItem[];
  readonly onSelect: (item: ConfigEditorSearchItem) => void;
  readonly onCancel: () => void;
  readonly focus?: boolean | undefined;
  readonly limit?: number | undefined;
  readonly label?: string | undefined;
}

const QuickSearchInputCompat = ({
  items,
  onSelect,
  onCancel,
  focus = true,
  limit = 8,
  label = "Search",
}: QuickSearchProps) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const matchingItems = useMemo(() => {
    const normalized = query.toLowerCase();
    return normalized === ""
      ? items
      : items.filter((item) => item.label.toLowerCase().includes(normalized));
  }, [items, query]);
  const visibleItems = matchingItems.slice(0, limit);
  const selectedItem =
    matchingItems[
      Math.min(selectedIndex, Math.max(matchingItems.length - 1, 0))
    ];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useInput(
    (input, key) => {
      if (key.escape) {
        onCancel();
        return;
      }

      if (key.return) {
        if (selectedItem) {
          onSelect(selectedItem);
        }
        return;
      }

      if (key.backspace || key.delete) {
        setQuery((value) => value.slice(0, -1));
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((index) =>
          matchingItems.length === 0
            ? 0
            : index === 0
              ? matchingItems.length - 1
              : index - 1,
        );
        return;
      }

      if (key.downArrow || key.tab) {
        setSelectedIndex((index) =>
          matchingItems.length === 0 ? 0 : (index + 1) % matchingItems.length,
        );
        return;
      }

      if (!key.ctrl && !key.meta && input !== "") {
        setQuery((value) => value + input);
      }
    },
    { isActive: focus },
  );

  return (
    <TitledBox
      borderStyle="single"
      borderColor="cyan"
      titleStyles={titleStyles.rectangle}
      titles={["Find Settings"]}
      flexDirection="column"
      paddingX={1}
    >
      <Text>
        <Text color="cyan">{label}: </Text>
        <Text>{query}</Text>
      </Text>
      {visibleItems.length === 0 ? (
        <Text color="red">No matches</Text>
      ) : (
        visibleItems.map((item) => {
          const isSelected = item === selectedItem;
          return (
            <Text key={item.value} color={isSelected ? "green" : undefined}>
              {isSelected ? "> " : "  "}
              {item.label}
            </Text>
          );
        })
      )}
      {matchingItems.length > visibleItems.length ? (
        <Text dimColor>
          Showing {visibleItems.length} of {matchingItems.length}
        </Text>
      ) : null}
    </TitledBox>
  );
};

interface ConfigEditorAppProps {
  readonly target: ConfigEditorTarget;
  readonly onFinish: (result: ConfigEditorResult) => void;
}

const ConfigEditorApp = ({ target, onFinish }: ConfigEditorAppProps) => {
  const [activeSectionId, setActiveSectionId] = useState<string>(
    configEditorSections[0]!.id,
  );
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    configToFormValues(target.currentConfig),
  );
  const [isSearching, setIsSearching] = useState(false);
  const [spotlightPath, setSpotlightPath] = useState<string | undefined>();
  const scrollRef = useRef<ScrollViewRef>(null);
  const { stdout } = useStdout();

  const activeSection =
    configEditorSections.find((section) => section.id === activeSectionId) ??
    configEditorSections[0]!;
  const spotlightField =
    spotlightPath === undefined
      ? undefined
      : activeSection.fields.find(
          (field) => fieldName(field) === spotlightPath,
        );
  const visibleFields =
    spotlightField === undefined
      ? activeSection.fields
      : [
          spotlightField,
          ...activeSection.fields.filter((field) => field !== spotlightField),
        ];
  const formStructure: FormStructure = {
    title:
      target.mode === "user"
        ? "flatmaxx user config"
        : "flatmaxx project config",
    sections: [
      {
        title: activeSection.title,
        fields: visibleFields.map(toFormField),
      },
    ],
  };

  useEffect(() => {
    const resize = () => scrollRef.current?.remeasure();
    stdout?.on("resize", resize);
    return () => {
      stdout?.off("resize", resize);
    };
  }, [stdout]);

  useEffect(() => {
    scrollRef.current?.scrollToTop();
  }, [activeSectionId, spotlightPath]);

  useInput(
    (input, key) => {
      if (key.ctrl && input === "f") {
        setIsSearching(true);
        return;
      }

      if (key.ctrl && input === "c") {
        onFinish({ type: "cancel" });
        return;
      }

      if (input === "q") {
        onFinish({ type: "cancel" });
        return;
      }

      if (key.escape && spotlightPath !== undefined) {
        setSpotlightPath(undefined);
        return;
      }

      if (key.pageUp) {
        const height = scrollRef.current?.getViewportHeight() ?? 1;
        scrollRef.current?.scrollBy(-height);
      }

      if (key.pageDown) {
        const height = scrollRef.current?.getViewportHeight() ?? 1;
        scrollRef.current?.scrollBy(height);
      }
    },
    { isActive: !isSearching },
  );

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text bold>
          {target.mode === "user" ? "User config" : "Project config"}:{" "}
          <Text color="cyan">{target.targetPath}</Text>
        </Text>
        <Text dimColor>
          Ctrl+F find settings, PageUp/PageDown scroll, q cancel
        </Text>
      </Box>

      {isSearching ? (
        <QuickSearchInputCompat
          items={searchItems}
          onCancel={() => setIsSearching(false)}
          onSelect={(item) => {
            const sectionId = sectionForFieldPath(item.value);
            if (sectionId) {
              setActiveSectionId(sectionId);
              setSpotlightPath(item.value);
            }
            setIsSearching(false);
          }}
        />
      ) : (
        <>
          <Tabs
            key={activeSectionId}
            defaultValue={activeSectionId}
            showIndex={false}
            keyMap={{ useTab: false, useNumbers: true }}
            colors={{ activeTab: { color: "black", backgroundColor: "cyan" } }}
            onChange={(name) => setActiveSectionId(name)}
          >
            {configEditorSections.map((section) => (
              <Tab key={section.id} name={section.id}>
                {section.title}
              </Tab>
            ))}
          </Tabs>
          <TitledBox
            borderStyle="single"
            borderColor={spotlightPath ? "yellow" : "gray"}
            titleStyles={titleStyles.rectangle}
            titles={[
              spotlightField
                ? `${activeSection.title}: ${spotlightField.label}`
                : activeSection.title,
            ]}
            height={22}
            flexDirection="column"
          >
            <ScrollView ref={scrollRef}>
              {spotlightField ? (
                <Text color="yellow">
                  Search result: {spotlightField.label} ({spotlightPath})
                </Text>
              ) : null}
              <Form
                key={`${activeSectionId}:${spotlightPath ?? "all"}`}
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
            </ScrollView>
          </TitledBox>
        </>
      )}
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
