import { formatDia } from "@/cnc/cncJobPlan";
import type {
  AlignmentDrillCategorizationOptions,
  DrillCategorizationOptions,
} from "@/config";
import { DrillError } from "@/errors";
import {
  createTasklist,
  markTaskBranch,
  nextStep,
  renderOnce,
  type TaskDef,
} from "@/inkHelpers";
import { Alert } from "@inkjs/ui";
import { Array, Effect, FileSystem, Match, Path, pipe } from "effect";
import { Box, Text } from "ink";
import { categorizeHoles, renderRoundedUpReport } from "./categorizeHoles";
import { MAX_SHOWN, ROUNDED_UP_FILE } from "./constants";
import { parseExcellon } from "./parseExcellon";
import { renderExcellon } from "./renderExcellon";
import type {
  Hole,
  RoundUpEvent,
  ToolInventory,
  UnmachinableHole,
} from "./types";

const PCB_SUFFIX = ".kicad_pcb";
const DRL_SUFFIX = ".drl";
const ALIGNMENT_SUFFIX = "-alignment.drl";

const holeLocation = (hole: Hole): string => {
  const p = hole.kind === "circle" ? hole : hole.path[0]!;
  return `(${p.x.toFixed(3)}, ${p.y.toFixed(3)})`;
};

const holeSize = (hole: Hole): string =>
  hole.kind === "circle"
    ? `Ø${formatDia(hole.diameter)}mm`
    : `${formatDia(hole.width)}mm slot`;

const UnmachinableReport = ({
  items,
  variant,
}: {
  items: readonly UnmachinableHole[];
  variant: "error" | "warning";
}) => {
  const shown = items.slice(0, MAX_SHOWN);
  const remaining = items.length - shown.length;
  return (
    <Box flexDirection="column">
      <Alert variant={variant}>
        {items.length} hole(s) cannot be made with the configured tools. Add a
        matching drill bit (within tolerance) or a smaller cornmill to pocket
        them.
      </Alert>
      {shown.map((item, index) => (
        <Text key={`${item.reason}-${index}`} dimColor>
          {"  • "}
          {holeSize(item.hole)} {item.category} @ {holeLocation(item.hole)} —{" "}
          {item.reason}
        </Text>
      ))}
      {remaining > 0 ? (
        <Text dimColor>{`  • …and ${remaining} more`}</Text>
      ) : null}
    </Box>
  );
};

const RoundUpReport = ({ events }: { events: readonly RoundUpEvent[] }) => {
  const shown = events.slice(0, MAX_SHOWN);
  const remaining = events.length - shown.length;
  return (
    <Box flexDirection="column">
      <Alert variant="warning">
        {events.length} hole(s) had no exact-size bit and were drilled OVERSIZE
        (rounded up). Even +0.05mm can matter on a small board — details written
        to ROUNDED_UP.txt.
      </Alert>
      {shown.map((e, index) => (
        <Text key={`${e.x}-${e.y}-${index}`} dimColor>
          {"  • "}
          {formatDia(e.trueDiameter)}mm {e.category} @ ({e.x.toFixed(3)},{" "}
          {e.y.toFixed(3)}) → {formatDia(e.bitDiameter)}mm (+
          {formatDia(e.delta)})
        </Text>
      ))}
      {remaining > 0 ? (
        <Text dimColor>{`  • …and ${remaining} more`}</Text>
      ) : null}
    </Box>
  );
};

const isComponentDrill = (file: string, board: string): boolean =>
  pipe(
    Match.value(file),
    Match.when(
      (f) => !f.toLowerCase().endsWith(DRL_SUFFIX),
      () => false,
    ),
    Match.when(
      (f) => f.endsWith(ALIGNMENT_SUFFIX),
      () => false,
    ),
    Match.orElse(
      (f) => f === `${board}${DRL_SUFFIX}` || f.startsWith(`${board}-`),
    ),
  );

const inventoryOf = (options: {
  readonly availableDrills: ToolInventory["drills"];
  readonly availableMills: ToolInventory["mills"];
  readonly matchToleranceMm: number;
}): ToolInventory => ({
  drills: options.availableDrills,
  mills: options.availableMills,
  toleranceMm: options.matchToleranceMm,
});

const categorizeTasks: TaskDef[] = [
  { id: "scan", label: "Scanning component drill files...", state: "loading" },
  { id: "categorize", label: "Categorizing holes...", state: "pending" },
  {
    id: "write",
    label: "Writing categorized drill files...",
    state: "pending",
  },
];

export const categorizeDrills = Effect.fn("flatmaxx.categorizeDrills")(
  function* (pcbFile: string, options: DrillCategorizationOptions) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const title = options.enabled
      ? `Step ${nextStep()}: Categorize drills`
      : "Categorize drills (skipped)";

    const controls = yield* createTasklist(categorizeTasks, title);
    const { patchTask } = controls;

    const board = path.basename(pcbFile, PCB_SUFFIX);
    const projectRoot = path.dirname(pcbFile);
    const roundedUpPath = path.join(projectRoot, ROUNDED_UP_FILE);

    const finishSkipped = (label: string) =>
      Effect.gen(function* () {
        yield* markTaskBranch(controls, categorizeTasks, "scan", {
          state: "success",
          label,
        });
        yield* markTaskBranch(controls, categorizeTasks, "categorize", {
          state: "success",
          label: "Nothing to categorize.",
        });
        yield* markTaskBranch(controls, categorizeTasks, "write", {
          state: "success",
          label: "No files written.",
        });
      });

    if (!options.enabled) {
      yield* finishSkipped("Drill categorization disabled — skipping.");
      return;
    }

    const gerbersExist = yield* fs.exists(options.gerbersDir);
    if (!gerbersExist) {
      yield* fs
        .remove(roundedUpPath)
        .pipe(Effect.when(fs.exists(roundedUpPath)));

      yield* finishSkipped("No gerbers directory — no drills to categorize.");

      return;
    }

    const drillFiles = pipe(
      yield* fs.readDirectory(options.gerbersDir),
      Array.filter((file) => isComponentDrill(file, board)),
    );
    if (drillFiles.length === 0) {
      yield* fs
        .remove(roundedUpPath)
        .pipe(Effect.when(fs.exists(roundedUpPath)));
      yield* finishSkipped("No component drill files found.");
      return;
    }

    yield* patchTask("scan", {
      state: "success",
      label: `Found ${drillFiles.length} component drill file(s).`,
    });
    yield* patchTask("categorize", { state: "loading" });

    const holes = yield* Effect.forEach(drillFiles, (file) =>
      fs.readFileString(path.join(options.gerbersDir, file)).pipe(
        Effect.mapError(
          (cause) =>
            new DrillError({
              message: `Could not read drill file ${file}.`,
              cause,
            }),
        ),
        Effect.map((text) => parseExcellon(text).holes),
      ),
    ).pipe(
      Effect.map(Array.flatten),
      Effect.tapError(() => patchTask("categorize", { state: "error" })),
    );

    if (holes.length === 0) {
      yield* fs
        .remove(roundedUpPath)
        .pipe(Effect.when(fs.exists(roundedUpPath)));

      yield* patchTask("categorize", {
        state: "success",
        label: "Drill files contain no holes.",
      });
      yield* patchTask("write", {
        state: "success",
        label: "No files written.",
      });

      return;
    }

    const { groups, unmachinable, roundUps } = categorizeHoles(
      holes,
      inventoryOf(options),
    );

    if (unmachinable.length > 0 && options.onFailure === "error") {
      yield* patchTask("categorize", {
        state: "error",
        label: `${unmachinable.length} of ${holes.length} hole(s) cannot be made with the configured tools.`,
      });

      yield* renderOnce(
        <UnmachinableReport items={unmachinable} variant="error" />,
      );

      return yield* Effect.fail(
        new DrillError({
          message: `Drill infeasible: ${unmachinable.length} hole(s) have no usable tool. Add a matching drill bit (within cnc.drilling.matchToleranceMm) or a smaller cornmill to availableMills.`,
        }),
      );
    }

    yield* patchTask("categorize", {
      state: "success",
      label: `Categorized ${holes.length} hole(s) into ${groups.length} group(s).`,
    });
    yield* patchTask("write", { state: "loading" });

    yield* fs.makeDirectory(options.drillsDir, { recursive: true });
    yield* Effect.forEach(groups, (group) =>
      fs.writeFileString(
        path.join(
          options.drillsDir,
          `${board}_${group.fileSuffix}${DRL_SUFFIX}`,
        ),
        renderExcellon(group.holes),
      ),
    );

    yield* fs
      .writeFileString(roundedUpPath, renderRoundedUpReport(board, roundUps))
      .pipe(
        Effect.filterOrElse(
          () => roundUps.length > 0,
          () =>
            fs
              .remove(roundedUpPath)
              .pipe(Effect.when(fs.exists(roundedUpPath))),
        ),
      );

    const fileNote = `${groups.length} file(s) in ${path.basename(
      options.drillsDir,
    )}/`;

    if (unmachinable.length > 0) {
      yield* patchTask("write", {
        state: "warning",
        label: `Categorized ${holes.length} holes → ${fileNote}; ${unmachinable.length} hole(s) NOT machinable (continuing, onFailure=warn).`,
      });
      yield* renderOnce(
        <UnmachinableReport items={unmachinable} variant="warning" />,
      );
    }

    if (roundUps.length > 0) {
      yield* patchTask("write", {
        state: "warning",
        label: `Categorized ${holes.length} holes → ${fileNote}; ${roundUps.length} hole(s) rounded up (see ${ROUNDED_UP_FILE}).`,
      });
      yield* renderOnce(<RoundUpReport events={roundUps} />);
    }

    if (!(unmachinable.length > 0 && roundUps.length > 0)) {
      yield* patchTask("write", {
        state: "success",
        label: `Categorized ${holes.length} holes → ${fileNote}.`,
      });
    }
  },
  Effect.scoped,
);

const alignmentTasks: TaskDef[] = [
  {
    id: "scan",
    label: "Scanning alignment drill file...",
    state: "loading",
  },
  {
    id: "categorize",
    label: "Categorizing alignment holes...",
    state: "pending",
  },
  {
    id: "write",
    label: "Writing categorized alignment drills...",
    state: "pending",
  },
];

const appendRoundedUpSection = Effect.fn(
  "flatmaxx.categorizeAlignmentDrills.appendRoundedUpSection",
)(function* (roundedUpPath: string, section: string) {
  const fs = yield* FileSystem.FileSystem;
  const existing = yield* fs.exists(roundedUpPath).pipe(
    Effect.flatMap((found) =>
      Match.value(found).pipe(
        Match.when(true, () => fs.readFileString(roundedUpPath)),
        Match.orElse(() => Effect.succeed("")),
      ),
    ),
  );
  yield* fs.writeFileString(
    roundedUpPath,
    existing === "" ? section : `${existing}\n${section}`,
  );
});

export const categorizeAlignmentDrills = Effect.fn(
  "flatmaxx.categorizeAlignmentDrills",
)(function* (pcbFile: string, options: AlignmentDrillCategorizationOptions) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const controls = yield* createTasklist(
    alignmentTasks,
    "Categorize alignment drills",
  );
  const { patchTask } = controls;

  const board = path.basename(pcbFile, PCB_SUFFIX);
  const alignmentPath = path.join(
    options.gerbersDir,
    `${board}${ALIGNMENT_SUFFIX}`,
  );

  const finishSkipped = (label: string) =>
    Effect.gen(function* () {
      yield* markTaskBranch(controls, alignmentTasks, "scan", {
        state: "success",
        label,
      });
      yield* markTaskBranch(controls, alignmentTasks, "categorize", {
        state: "success",
        label: "Nothing to categorize.",
      });
      yield* markTaskBranch(controls, alignmentTasks, "write", {
        state: "success",
        label: "No files written.",
      });
    });

  if (!options.enabled) {
    yield* finishSkipped("Alignment drills disabled — skipping.");
    return;
  }

  const exists = yield* fs.exists(alignmentPath);
  if (!exists) {
    yield* finishSkipped("No alignment drill file (single-sided) — skipping.");
    return;
  }

  const text = yield* fs.readFileString(alignmentPath).pipe(
    Effect.mapError(
      (cause) =>
        new DrillError({
          message: `Could not read alignment drill file ${alignmentPath}.`,
          cause,
        }),
    ),
    Effect.tapError(() => patchTask("scan", { state: "error" })),
  );
  const { holes } = parseExcellon(text);
  if (holes.length === 0) {
    yield* finishSkipped("Alignment drill file is empty — skipping.");
    return;
  }

  yield* patchTask("scan", {
    state: "success",
    label: `Found ${holes.length} alignment hole(s).`,
  });
  yield* patchTask("categorize", { state: "loading" });

  const { groups, unmachinable, roundUps } = categorizeHoles(
    holes,
    inventoryOf(options),
    { categoryOverride: "alignment" },
  );

  yield* Match.value(unmachinable.length > 0).pipe(
    Match.when(true, () =>
      Effect.gen(function* () {
        yield* patchTask("categorize", {
          state: "error",
          label: `${unmachinable.length} alignment hole(s) cannot be made with any configured tool.`,
        });
        yield* renderOnce(
          <UnmachinableReport items={unmachinable} variant="error" />,
        );
        return yield* Effect.fail(
          new DrillError({
            message: `Alignment drills infeasible: ${unmachinable.length} hole(s) have no usable tool. Add a drill bit or a cornmill that fits the registration holes.`,
          }),
        );
      }),
    ),
    Match.orElse(() => Effect.void),
  );

  yield* patchTask("categorize", {
    state: "success",
    label: `Categorized ${holes.length} alignment hole(s) into ${groups.length} group(s).`,
  });
  yield* patchTask("write", { state: "loading" });

  yield* fs.makeDirectory(options.drillsDir, { recursive: true });
  yield* Effect.forEach(groups, (group) =>
    fs.writeFileString(
      path.join(options.drillsDir, `${board}_${group.fileSuffix}${DRL_SUFFIX}`),
      renderExcellon(group.holes),
    ),
  );

  yield* Match.value(roundUps.length > 0).pipe(
    Match.when(true, () =>
      Effect.gen(function* () {
        const roundedUpPath = path.join(path.dirname(pcbFile), ROUNDED_UP_FILE);
        const section = renderRoundedUpReport(`${board} (alignment)`, roundUps);
        yield* appendRoundedUpSection(roundedUpPath, section);
        yield* patchTask("write", {
          state: "warning",
          label: `Categorized ${holes.length} alignment hole(s) → ${groups.length} file(s); ${roundUps.length} rounded up (see ${ROUNDED_UP_FILE}).`,
        });
        yield* renderOnce(<RoundUpReport events={roundUps} />);
      }),
    ),
    Match.orElse(() =>
      patchTask("write", {
        state: "success",
        label: `Categorized ${holes.length} alignment hole(s) → ${groups.length} file(s) in ${path.basename(
          options.drillsDir,
        )}/.`,
      }),
    ),
  );
}, Effect.scoped);
