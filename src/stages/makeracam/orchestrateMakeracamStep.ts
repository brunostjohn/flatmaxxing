import { Effect, FileSystem } from "effect";
import { basename, join } from "node:path";
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
import { type LifecycleReport, withMakeraCamSession } from "./lifecycle";
import { selectStepDrills } from "./selectStepDrills";
import type {
  MakeracamStepOptions,
  PlannedToolpath,
  ToolpathKind,
} from "./types";

export const stepFilename = (board: string, step: "plated" | "final") =>
  step === "plated"
    ? `${board}_align-PTH_Holes-PTH_EdgeCuts`
    : `${board}_NPTH_Holes-Final_EdgeCuts`;

const kindForMethod = (method: string) => {
  const kind: ToolpathKind = method === "drills" ? "drill" : "pocket";
  return kind;
};

export const planToolpaths = (
  files: readonly string[],
  board: string,
  step: "plated" | "final",
  drillsDir: string,
  edgeCutGerberPath: string,
) => {
  const drills: PlannedToolpath[] = selectStepDrills(files, board, step).map(
    (d) => ({
      file: d.file,
      absPath: join(drillsDir, d.file),
      kind: kindForMethod(d.method),
      category: d.category,
      method: d.method,
      diameterMm: d.diameterMm,
    }),
  );

  const contour: PlannedToolpath = {
    file: basename(edgeCutGerberPath),
    absPath: edgeCutGerberPath,
    kind: "contour",
    category: "edge",
    method: "contour",
    diameterMm: 0,
  };

  return [contour, ...drills];
};

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
    const k = toolKey(tp);
    let n = seenTools.get(k);
    if (n === undefined) {
      n = seenTools.size + 1;
      seenTools.set(k, n);
    }
    return n;
  });
};

export const orchestrateMakeracamStep = Effect.fn(
  "flatmaxx.makeracam.orchestrateStep",
)(function* (
  options: MakeracamStepOptions,
  pcbName: string,
  edgeCutGerberPath: string,
  contourMillDiameterMm: number,
  report: LifecycleReport = () => Effect.void,
) {
  const fs = yield* FileSystem.FileSystem;

  const listing = (yield* fs.readDirectory(options.drillsDir)).filter((f) =>
    f.toLowerCase().endsWith(".drl"),
  );
  const planned = planToolpaths(
    listing,
    pcbName,
    options.step,
    options.drillsDir,
    edgeCutGerberPath,
  );

  if (planned.length === 0) {
    return yield* Effect.fail(
      new Error(
        `No toolpaths planned for the ${options.step} step (no matching drills in ${options.drillsDir}).`,
      ),
    );
  }

  const base = stepFilename(pcbName, options.step);
  const gcodeFinal = join(options.gcodeDir, `${base}.gcode`);
  const mkcFinal = join(options.cncDir, `${base}.mkc`);

  yield* fs.makeDirectory(options.gcodeDir, { recursive: true });
  yield* fs.makeDirectory(options.cncDir, { recursive: true });

  return yield* withMakeraCamSession(
    options,
    (session) =>
      Effect.gen(function* () {
        const pid = session.pid;

        yield* report("Creating a new 3-axis project...");
        yield* newProject3Axis(pid);

        yield* report("Setting stock material to PCB...");
        yield* setStockMaterialPCB(pid);

        for (let i = 0; i < planned.length; i++) {
          const tp = planned[i];
          if (tp === undefined) continue;
          yield* report(
            `Building toolpath ${i + 1}/${planned.length}: ${tp.file}...`,
          );

          const layerSelector = yield* importPcbFile(pid, tp.absPath);
          yield* selectLayerGraphics(pid, layerSelector);

          yield* openToolpath(pid, tp.kind);
          yield* setEndDepth(pid, tp.kind, options.cutDepthMm);

          if (tp.kind === "pocket") {
            yield* deleteDefaultPocketTool(pid);
            yield* chooseToolByDiameter(
              pid,
              tp.method,
              tp.diameterMm,
              "Add Tool",
            );
          } else if (tp.kind === "contour") {
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
          } else {
            yield* chooseToolByDiameter(
              pid,
              tp.method,
              tp.diameterMm,
              "Choose Tool",
            );
          }

          yield* calculatePath(pid);
          yield* closeToolpathDialog(pid);
        }

        yield* report("Reordering — moving the edge-cut contour to last...");
        yield* reorderContourLast(pid);

        yield* report("Saving all paths → Export ToolPaths...");
        yield* saveAllPaths(pid);

        yield* assertExportRowCount(pid, planned.length);

        yield* report("Assigning tool numbers (reusing repeated tools)...");
        yield* setSequentialToolNumbers(
          pid,
          assignToolNumbers(planned, contourMillDiameterMm),
        );

        yield* report("Exporting G-code...");
        const ncVariant = `${gcodeFinal}.nc`;
        yield* fs.remove(ncVariant, { force: true }).pipe(Effect.ignore);
        yield* fs.remove(gcodeFinal, { force: true }).pipe(Effect.ignore);
        yield* exportGcode(pid, gcodeFinal);
        if (yield* fs.exists(ncVariant)) {
          yield* fs.remove(gcodeFinal).pipe(Effect.ignore);
          yield* fs.rename(ncVariant, gcodeFinal);
        }

        yield* report("Saving the MakeraCAM project (.mkc)...");
        yield* fs.remove(mkcFinal, { force: true }).pipe(Effect.ignore);
        yield* saveProjectMkc(pid, mkcFinal);

        return {
          gcodePath: gcodeFinal,
          mkcPath: mkcFinal,
          pathCount: planned.length,
        };
      }),
    report,
  );
});
