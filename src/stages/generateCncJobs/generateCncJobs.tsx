import { CncError } from "@/errors";
import {
  createTasklist,
  markTaskBranch,
  nextStep,
  type TaskDef,
} from "@/inkHelpers";
import type { Side } from "@/config";
import {
  Array,
  Effect,
  FileSystem,
  Match,
  Option,
  Path,
  Result,
  Schema,
} from "effect";
import {
  alignmentDrillPoints,
  type BoardBounds,
  renderAlignmentExcellon,
} from "./alignmentDrills";
import {
  buildFlatcamScript,
  isoNcName,
  nccNcName,
  type SideGerber,
} from "./buildFlatcamScript";
import type { CncJobOptions } from "./buildCncJobOptions";
import {
  assembleCarveraGcode,
  extractToolpathBody,
  type ToolSection,
} from "./ncGcode";
import { runFlatcam } from "./runFlatcam";
import { BoundsTupleSchema } from "./schema";

const cncTasks: TaskDef[] = [
  {
    id: "flatcam",
    label: "Running FlatCAM (isolation + non-copper clearing)...",
    state: "loading",
  },
  { id: "drills", label: "Alignment drill Excellon...", state: "pending" },
  {
    id: "merge",
    label: "Assembling Carvera G-code...",
    state: "pending",
    children: [
      { id: "front", label: "front", state: "pending" },
      { id: "back", label: "back", state: "pending" },
    ],
  },
];

const layerForSide: Record<Side, string> = {
  front: "F_Cu",
  back: "B_Cu",
};

const findGerber = (
  files: readonly string[],
  board: string,
  layer: string,
): string | undefined => files.find((f) => f.startsWith(`${board}-${layer}.`));

const decodeBounds = Schema.decodeUnknownEffect(BoundsTupleSchema);

const parseBounds = (raw: string): Effect.Effect<BoardBounds, CncError> =>
  decodeBounds(raw.trim().split(/\s+/).map(Number)).pipe(
    Effect.mapError(
      (cause) =>
        new CncError({
          message: `Could not parse board bounds from: "${raw}"`,
          cause,
        }),
    ),
    Effect.map(([xmin, ymin, xmax, ymax]) => ({ xmin, ymin, xmax, ymax })),
  );

export const generateCncJobs = Effect.fn("flatmaxx.generateCncJobs")(function* (
  flatcam: string,
  pcbFile: string,
  options: CncJobOptions,
) {
  const title = options.enabled
    ? `Step ${nextStep()}: Generate CNC jobs`
    : "Generate CNC jobs (skipped)";
  const { setTaskOutput, patchTask, ...rest } = yield* createTasklist(
    cncTasks,
    title,
  );
  const taskControls = { setTaskOutput, patchTask, ...rest };

  if (!options.enabled) {
    yield* markTaskBranch(taskControls, cncTasks, "flatcam", {
      state: "success",
      label: "CNC generation skipped.",
      status: "no isolation tool configured",
    });
    yield* markTaskBranch(taskControls, cncTasks, "drills", {
      state: "success",
      label: "Alignment drills skipped.",
    });
    yield* markTaskBranch(taskControls, cncTasks, "merge", {
      state: "success",
      label: "G-code assembly skipped.",
      childStatus: "skipped",
    });
    return;
  }

  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const board = path.basename(pcbFile, ".kicad_pcb");

  const gerberFiles = yield* fs.readDirectory(options.gerbersDir);
  const edgeCuts = findGerber(gerberFiles, board, "Edge_Cuts");
  if (!edgeCuts) {
    yield* patchTask("flatcam", {
      state: "error",
      output: `No Edge_Cuts gerber found in ${options.gerbersDir}`,
    });
    return yield* Effect.fail(
      new CncError({
        message: `Missing ${board}-Edge_Cuts.* in ${options.gerbersDir}`,
      }),
    );
  }

  const sideGerbers: SideGerber[] = Array.filterMap(options.sides, (side) => {
    const copper = findGerber(gerberFiles, board, layerForSide[side]);
    return copper
      ? Result.succeed({
          side,
          copperGerber: path.join(options.gerbersDir, copper),
        } satisfies SideGerber)
      : Result.fail(undefined);
  });

  const scratch = yield* fs.makeTempDirectoryScoped({
    prefix: "flatmaxx-cnc-",
  });
  const boundsFile = path.join(scratch, "bounds.txt");
  const shellFile = path.join(scratch, "job.tcl");
  const logFile = path.join(scratch, "flatcam.log");
  const doneFile = path.join(scratch, "done.flag");

  yield* fs.writeFileString(
    shellFile,
    buildFlatcamScript({
      sides: sideGerbers,
      edgeCutsGerber: path.join(options.gerbersDir, edgeCuts),
      mirrorAxis: options.mirrorAxis,
      plan: options.plan,
      scratchDir: scratch,
      boundsFile,
      doneFile,
    }),
  );

  yield* setTaskOutput(
    "flatcam",
    "isolation + clearing (this can take a while)",
  );
  yield* runFlatcam({
    flatcam,
    shellFile,
    logFile,
    doneFile,
    onProgress: (line) => setTaskOutput("flatcam", line),
  }).pipe(
    Effect.tapError((error) =>
      patchTask("flatcam", {
        state: "error",
        output: error instanceof Error ? error.message : String(error),
      }),
    ),
  );
  yield* patchTask("flatcam", {
    state: "success",
    label: "FlatCAM finished.",
  });

  const backMachined = yield* fs.exists(path.join(scratch, isoNcName("back")));
  if (options.alignmentDrills.generate && backMachined) {
    const bounds = yield* parseBounds(yield* fs.readFileString(boundsFile));
    const points = alignmentDrillPoints(
      bounds,
      options.alignmentDrills.distance,
    );
    const drlPath = path.join(options.gerbersDir, `${board}-alignment.drl`);
    yield* fs.writeFileString(
      drlPath,
      renderAlignmentExcellon(points, options.alignmentDrills.diameter),
    );
    yield* patchTask("drills", {
      state: "success",
      label: `Wrote ${board}-alignment.drl (4 × ${options.alignmentDrills.diameter}mm).`,
    });
  } else {
    yield* patchTask("drills", {
      state: "success",
      label: "Alignment drills not needed (single-sided).",
    });
  }

  yield* fs.makeDirectory(options.gcodeDir, { recursive: true });
  yield* patchTask("merge", { state: "loading" });

  const readBody = Effect.fn("flatmaxx.generateCncJobs.readBody")(function* (
    name: string,
  ) {
    const filePath = path.join(scratch, name);
    return yield* Match.value(yield* fs.exists(filePath)).pipe(
      Match.when(true, () =>
        fs.readFileString(filePath).pipe(Effect.map(extractToolpathBody)),
      ),
      Match.orElse(() => Effect.succeed([] as string[])),
    );
  });

  const sectionOf = (
    body: readonly string[],
    label: string,
    spindleSpeed: number,
  ): Option.Option<ToolSection> =>
    Array.isReadonlyArrayNonEmpty(body)
      ? Option.some({
          toolNumber: 0,
          label,
          spindleSpeed,
          travelZ: options.plan.clearance.travelZ,
          body,
        })
      : Option.none();

  const nccLabel = (tool: CncJobOptions["plan"]["ncc"]["tools"][number]) =>
    tool.kind === "vbit" ? `${tool.label} (clearing)` : tool.label;

  const assembleSide = Effect.fn("flatmaxx.generateCncJobs.assembleSide")(
    function* (side: Side) {
      const isoBody = yield* readBody(isoNcName(side));
      const isoSection = sectionOf(
        isoBody,
        `${options.plan.isolation.label} (isolation)`,
        options.plan.isolation.spindleSpeed,
      );

      const nccSections = yield* Effect.forEach(
        options.plan.ncc.tools,
        (tool) =>
          readBody(nccNcName(side, tool.uid)).pipe(
            Effect.map((body) =>
              sectionOf(body, nccLabel(tool), tool.spindleSpeed),
            ),
          ),
      );

      const sections = Array.map(
        Array.getSomes([isoSection, ...nccSections]),
        (section, index) => ({ ...section, toolNumber: index + 1 }),
      );

      if (sections.length === 0) {
        yield* markTaskBranch(taskControls, cncTasks, ["merge", side], {
          state: "success",
          label: `${side} skipped (no copper).`,
        });
        return;
      }

      const gcode = assembleCarveraGcode(sections, {
        seamZ: options.plan.clearance.seamZ,
        endZ: options.plan.clearance.endZ,
        headerComments: [
          `flatmaxx CNC job — ${board} ${side}`,
          `Tools: ${sections.map((s) => `T${s.toolNumber}=${s.label}`).join(", ")}`,
          "Carvera-targeted; manual tool changes at M6 (TLO re-probe).",
        ],
      });
      const outPath = path.join(options.gcodeDir, `${board}-${side}.nc`);
      yield* fs.writeFileString(outPath, gcode);
      yield* markTaskBranch(taskControls, cncTasks, ["merge", side], {
        state: "success",
        label: `${board}-${side}.nc (${sections.length} tool${sections.length === 1 ? "" : "s"}).`,
      });
    },
  );

  yield* Effect.forEach(["front", "back"] as const, (side) =>
    Match.value(options.sides.includes(side)).pipe(
      Match.when(true, () => assembleSide(side)),
      Match.orElse(() =>
        markTaskBranch(taskControls, cncTasks, ["merge", side], {
          state: "success",
          label: `${side} skipped (board.ignoreSide).`,
        }),
      ),
    ),
  );

  yield* patchTask("merge", {
    state: "success",
    label: "Assembled Carvera G-code.",
  });
}, Effect.scoped);
