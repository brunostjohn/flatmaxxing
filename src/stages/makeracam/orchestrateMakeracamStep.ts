import { createTasklist, type TasklistControls } from "@/inkHelpers";
import { Effect, FileSystem, Layer, Match, Path } from "effect";
import {
  assertExportRowCount,
  calculatePath,
  chooseToolByDiameter,
  closeToolpathDialog,
  deleteDefaultPocketTool,
  exportGcode,
  importPcbFile,
  newProject3Axis,
  openToolpath,
  reorderContourLast,
  saveAllPaths,
  saveProjectMkc,
  selectLayerGraphics,
  setContourOutsideTabs,
  setEndDepth,
  setSequentialToolNumbers,
  setStockMaterialPCB,
} from "./actions";
import { MakeraCamReporter, withMakeraCamSession } from "./lifecycle";
import { selectStepDrills } from "./selectStepDrills";
import { buildMakeracamTasks, makeracamTaskPaths } from "./tasks";
import type {
  MakeracamStep,
  MakeracamStepOptions,
  PlannedToolpath,
  ToolpathKind,
} from "./types";

export const stepFilename = (board: string, step: MakeracamStep) =>
  step === "plated"
    ? `${board}_align-PTH_Holes-PTH_EdgeCuts`
    : `${board}_NPTH_Holes-Final_EdgeCuts`;

const kindForMethod = (method: string): ToolpathKind =>
  method === "drills" ? "drill" : "pocket";

export const planToolpaths = Effect.fn("flatmaxx.makeracam.planToolpaths")(
  function* (
    files: readonly string[],
    board: string,
    step: MakeracamStep,
    drillsDir: string,
    edgeCutGerberPath: string,
  ) {
    const path = yield* Path.Path;

    const drills = selectStepDrills(files, board, step).map(
      (drill): PlannedToolpath => ({
        file: drill.file,
        absPath: path.join(drillsDir, drill.file),
        kind: kindForMethod(drill.method),
        category: drill.category,
        method: drill.method,
        diameterMm: drill.diameterMm,
      }),
    );

    const contour: PlannedToolpath = {
      file: path.basename(edgeCutGerberPath),
      absPath: edgeCutGerberPath,
      kind: "contour",
      category: "edge",
      method: "contour",
      diameterMm: 0,
    };

    return [contour, ...drills];
  },
);

export const assignToolNumbers = (
  planned: readonly PlannedToolpath[],
  contourMillDiameterMm: number,
) => {
  const toolKey = (tp: PlannedToolpath) =>
    tp.kind === "drill"
      ? `drill:${tp.diameterMm}`
      : `mill:${tp.kind === "contour" ? contourMillDiameterMm : tp.diameterMm}`;
  const finalOrder = [
    ...planned.filter((tp) => tp.kind !== "contour"),
    ...planned.filter((tp) => tp.kind === "contour"),
  ];
  const seenTools = new Map<string, number>();
  return finalOrder.map((tp) => {
    const key = toolKey(tp);
    const existing = seenTools.get(key);
    if (existing !== undefined) return existing;
    const next = seenTools.size + 1;
    seenTools.set(key, next);
    return next;
  });
};

const reporterFromTasklist = (tasks: TasklistControls) =>
  Layer.succeed(MakeraCamReporter, {
    report: (message) =>
      tasks.setTaskStatus(makeracamTaskPaths.session.root, message),
  });

const buildToolpath = (
  tasks: TasklistControls,
  pid: number,
  toolpath: PlannedToolpath,
  index: number,
  options: MakeracamStepOptions,
  contourMillDiameterMm: number,
) =>
  Effect.gen(function* () {
    const paths = makeracamTaskPaths.toolpaths.step(index);
    const scope = tasks.scope(paths.root);

    yield* tasks.patchTask(paths.root, { state: "loading" });

    const layerSelector = yield* scope.runTask({
      path: paths.import,
      effect: importPcbFile(pid, toolpath.absPath),
    });
    yield* scope.runTask({
      path: paths.selectGraphics,
      effect: selectLayerGraphics(pid, layerSelector),
    });
    yield* scope.runTask({
      path: paths.openToolpath,
      effect: openToolpath(pid, toolpath.kind),
    });
    yield* scope.runTask({
      path: paths.setDepth,
      effect: setEndDepth(pid, toolpath.kind, options.cutDepthMm),
    });

    yield* scope.runTask({
      path: paths.chooseTool,
      effect: Match.value(toolpath.kind).pipe(
        Match.when("pocket", () =>
          Effect.gen(function* () {
            yield* deleteDefaultPocketTool(pid);
            yield* chooseToolByDiameter(
              pid,
              toolpath.method,
              toolpath.diameterMm,
              "Add Tool",
            );
          }),
        ),
        Match.when("contour", () =>
          Effect.gen(function* () {
            yield* chooseToolByDiameter(
              pid,
              "contour",
              contourMillDiameterMm,
              "Choose Tool",
            );
            yield* setContourOutsideTabs(
              pid,
              options.cutDepthMm,
              options.tabsPerContour,
            );
          }),
        ),
        Match.orElse(() =>
          chooseToolByDiameter(
            pid,
            toolpath.method,
            toolpath.diameterMm,
            "Choose Tool",
          ),
        ),
      ),
    });

    yield* scope.runTask({
      path: paths.calculate,
      effect: calculatePath(pid),
    });
    yield* scope.runTask({
      path: paths.closeDialog,
      effect: closeToolpathDialog(pid),
    });

    yield* tasks.patchTask(paths.root, { state: "success" });
  });

export const orchestrateMakeracamStep = Effect.fn(
  "flatmaxx.makeracam.orchestrateStep",
)(function* (
  options: MakeracamStepOptions,
  pcbName: string,
  edgeCutGerberPath: string,
  contourMillDiameterMm: number,
  title: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const listing = (yield* fs.readDirectory(options.drillsDir)).filter((file) =>
    file.toLowerCase().endsWith(".drl"),
  );
  const planned = yield* planToolpaths(
    listing,
    pcbName,
    options.step,
    options.drillsDir,
    edgeCutGerberPath,
  );

  const base = stepFilename(pcbName, options.step);
  const gcodeFinal = path.join(options.gcodeDir, `${base}.gcode`);
  const mkcFinal = path.join(options.cncDir, `${base}.mkc`);

  yield* fs.makeDirectory(options.gcodeDir, { recursive: true });
  yield* fs.makeDirectory(options.cncDir, { recursive: true });

  const tasks = yield* createTasklist(buildMakeracamTasks(planned), title);

  const work = Effect.gen(function* () {
    const sessionPaths = makeracamTaskPaths.session;
    const session = yield* withMakeraCamSession(options);
    const pid = session.pid;

    yield* tasks.runTask({
      path: sessionPaths.newProject,
      effect: newProject3Axis(pid),
    });
    yield* tasks.runTask({
      path: sessionPaths.setStock,
      effect: setStockMaterialPCB(pid),
    });
    yield* tasks.patchTask(sessionPaths.root, { state: "success", status: "" });

    yield* Effect.forEach(planned, (toolpath, index) =>
      buildToolpath(
        tasks,
        pid,
        toolpath,
        index,
        options,
        contourMillDiameterMm,
      ),
    );
    yield* tasks.patchTask(makeracamTaskPaths.toolpaths.root, {
      state: "success",
    });

    const finalize = makeracamTaskPaths.finalize;
    yield* tasks.runTask({
      path: finalize.reorder,
      effect: reorderContourLast(pid),
    });
    yield* tasks.runTask({
      path: finalize.savePaths,
      effect: saveAllPaths(pid),
    });
    yield* tasks.runTask({
      path: finalize.assertRows,
      effect: assertExportRowCount(pid, planned.length),
    });
    yield* tasks.runTask({
      path: finalize.toolNumbers,
      effect: setSequentialToolNumbers(
        pid,
        assignToolNumbers(planned, contourMillDiameterMm),
      ),
    });

    const ncVariant = `${gcodeFinal}.nc`;
    yield* tasks.runTask({
      path: finalize.exportGcode,
      effect: Effect.gen(function* () {
        yield* fs.remove(ncVariant, { force: true }).pipe(Effect.ignore);
        yield* fs.remove(gcodeFinal, { force: true }).pipe(Effect.ignore);
        yield* exportGcode(pid, gcodeFinal);
        if (yield* fs.exists(ncVariant)) {
          yield* fs.remove(gcodeFinal).pipe(Effect.ignore);
          yield* fs.rename(ncVariant, gcodeFinal);
        }
      }),
    });

    yield* tasks.runTask({
      path: finalize.saveMkc,
      effect: Effect.gen(function* () {
        yield* fs.remove(mkcFinal, { force: true }).pipe(Effect.ignore);
        yield* saveProjectMkc(pid, mkcFinal);
      }),
    });
    yield* tasks.patchTask(finalize.root, { state: "success" });

    return {
      gcodePath: gcodeFinal,
      mkcPath: mkcFinal,
      pathCount: planned.length,
    };
  });

  return yield* work.pipe(
    Effect.provide(reporterFromTasklist(tasks)),
    Effect.scoped,
  );
}, Effect.scoped);
