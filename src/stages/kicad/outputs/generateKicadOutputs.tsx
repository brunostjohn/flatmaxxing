import type { KicadOutputOptions, Side } from "@/config";
import {
  createTasklist,
  markTaskBranch,
  nextStep,
  type TaskDef,
} from "@/inkHelpers";
import {
  getBoardImagePngPath,
  getBoardImageSvgPath,
} from "@/stages/kicad/outputs/boardImagePaths";
import { Resvg } from "@resvg/resvg-js";
import { Effect, Fiber, FileSystem, Latch, Ref, Stream } from "effect";
import { ChildProcess } from "effect/unstable/process";
import { basename, resolve } from "node:path";
import sharp, { type OutputInfo } from "sharp";

export const solderMaskPngZoom = 25;
export const boardImagePngZoom = 2;
export const boardImageLayers = "B.Cu,B.Mask,F.Cu,F.Mask,Edge.Cuts";

export const buildBoardImageSvgExportArgs = (svgPath: string) => [
  "pcb",
  "export",
  "svg",
  "--layers",
  boardImageLayers,
  "--mode-single",
  "--page-size-mode",
  "2",
  "--exclude-drawing-sheet",
  "--output",
  svgPath,
];

const defaultKicadOutputOptions: KicadOutputOptions = {
  paths: {
    svg: "./svg",
    dxf: "./dxf",
    png: "./png",
    gerbers: "./gerbers",
    place: "./place",
  },
  sides: ["front", "back"],
  drills: {
    generate: true,
    withEdgeCuts: false,
  },
  place: {
    generate: true,
  },
  boardImage: {
    generate: true,
  },
  solderMask: {
    generate: true,
    sides: ["front", "back"],
  },
  stencil: {
    generate: true,
    sides: ["front", "back"],
  },
};

const sideConfig = {
  front: {
    label: "front",
    maskLayer: "F.Mask",
    pasteLayer: "F.Paste",
    maskFileSuffix: "F_Mask",
    placeSide: "front",
    placeSuffix: "front",
  },
  back: {
    label: "back",
    maskLayer: "B.Mask",
    pasteLayer: "B.Paste",
    maskFileSuffix: "B_Mask",
    placeSide: "back",
    placeSuffix: "back",
  },
} as const satisfies Record<
  Side,
  {
    readonly label: string;
    readonly maskLayer: string;
    readonly pasteLayer: string;
    readonly maskFileSuffix: string;
    readonly placeSide: string;
    readonly placeSuffix: string;
  }
>;

const kicadOutputTasks: TaskDef[] = [
  {
    id: "gerbers",
    label: "Generating Gerbers...",
    state: "loading",
  },
  {
    id: "drill",
    label: "Generating drill files...",
    state: "loading",
  },
  {
    id: "svg",
    label: "Generating SVG files...",
    state: "loading",
  },
  {
    id: "png",
    label: "Generating PNG files...",
    state: "pending",
    children: [
      {
        id: "front",
        label: "Generating front PNG file...",
        state: "pending",
      },
      {
        id: "back",
        label: "Generating back PNG file...",
        state: "pending",
      },
    ],
  },
  {
    id: "board-image",
    label: "Generating board image...",
    state: "pending",
    children: [
      {
        id: "svg",
        label: "Generating board image SVG...",
        state: "pending",
      },
      {
        id: "png",
        label: "Generating board image PNG...",
        state: "pending",
      },
    ],
  },
  {
    id: "dxf",
    label: "Generating DXF files...",
    state: "loading",
    children: [
      {
        id: "paste-without-edge-cuts",
        label: "Generating paste DXF files without edge cuts...",
        state: "loading",
      },
      {
        id: "mask-with-edge-cuts",
        label: "Generating mask DXF files with edge cuts...",
        state: "loading",
      },
    ],
  },
  {
    id: "place",
    label: "Generating place files...",
    state: "loading",
    children: [
      {
        id: "front",
        label: "Generating front pos file...",
        state: "loading",
      },
      {
        id: "back",
        label: "Generating back pos file...",
        state: "loading",
      },
    ],
  },
];

interface RunWithKicadAndTaskOptions {
  kicadCli: string;
  project: string;
  pcbFile: string;
  args: string[];
  setTaskOutput: (output: string) => Effect.Effect<void>;
  setError: (error: string) => Effect.Effect<void>;
  setSuccess: () => Effect.Effect<void>;
  latch?: Latch.Latch;
}

const runWithKicadAndTask = Effect.fn(
  "flatmaxx.generateKicadOutputs.runWithKicadAndTask",
)(function* ({
  kicadCli,
  project,
  pcbFile,
  args,
  setTaskOutput,
  setError,
  setSuccess,
  latch,
}: RunWithKicadAndTaskOptions) {
  const childProcess = yield* ChildProcess.make(kicadCli, [...args, pcbFile], {
    cwd: project,
  });

  const decoder = new TextDecoder();

  const completeStdout = yield* Ref.make("");

  const stderrFiber = yield* Stream.runForEach(childProcess.stderr, (line) =>
    Effect.gen(function* () {
      const out = decoder.decode(line);
      yield* setTaskOutput(out);
      yield* Ref.update(completeStdout, (old) => `${old}\n${out}`);
    }),
  ).pipe(Effect.forkChild);

  const stdoutFiber = yield* Stream.runForEach(childProcess.stdout, (line) =>
    Effect.gen(function* () {
      const out = decoder.decode(line);
      const split = out.split("\n");
      const last = split[split.length - 1];
      if (last) {
        yield* setTaskOutput(last);
      }
      yield* Ref.update(completeStdout, (old) => `${old}\n${out}`);
    }),
  ).pipe(Effect.forkChild);

  const code = yield* childProcess.exitCode;

  yield* Effect.all([Fiber.join(stderrFiber), Fiber.join(stdoutFiber)]);

  if (code !== 0) {
    yield* setError(
      `Failed to execute command: ${kicadCli} ${args.join(" ")}. Code: ${code}. Output: ${yield* Ref.get(completeStdout)}`,
    );
    yield* Effect.fail(new Error(yield* Ref.get(completeStdout)));
  }

  yield* setSuccess();

  if (latch) {
    yield* latch.open;
  }
}, Effect.scoped);

export type SvgToPngResult = {
  readonly pngFile: string;
  readonly info: OutputInfo;
};

export const generatePngFromSvg = Effect.fn(
  "flatmaxx.generateKicadOutputs.generatePngFromSvg",
)(function* (
  svgFile: string,
  pngFile: string,
  options: { readonly zoom?: number | undefined } = {},
) {
  const fs = yield* FileSystem.FileSystem;

  const svg = yield* fs.readFileString(svgFile);
  const zoom = options.zoom ?? solderMaskPngZoom;

  const resvg = new Resvg(svg, {
    background: "rgba(255, 255, 255, 0)",
    fitTo: {
      mode: "zoom",
      value: zoom,
    },
    font: {
      loadSystemFonts: true,
    },
  });

  const pngData = yield* Effect.sync(() => resvg.render());
  const pngBuffer = yield* Effect.sync(() => pngData.asPng());
  const trimmed = yield* Effect.promise(() =>
    sharp(pngBuffer).trim().toBuffer({ resolveWithObject: true }),
  );

  yield* fs.writeFile(pngFile, trimmed.data);

  return {
    pngFile,
    info: trimmed.info,
  } satisfies SvgToPngResult;
});

const formatPngTrimStatus = (info: OutputInfo) => {
  const left = info.trimOffsetLeft ?? 0;
  const top = info.trimOffsetTop ?? 0;
  return `${info.width}x${info.height}px, trim x=${left} y=${top}`;
};

export type GenerateKicadOutputsResult = {
  readonly boardImagePngPath?: string | undefined;
};

export const generateKicadOutputs = Effect.fn("flatmaxx.generateKicadOutputs")(
  function* (
    kicadCli: string,
    project: string,
    pcbFile: string,
    options: KicadOutputOptions = defaultKicadOutputOptions,
  ) {
    const { setTaskOutput, patchTask, ...tasks } = yield* createTasklist(
      kicadOutputTasks,
      `Step ${nextStep()}: Create KiCAD outputs`,
    );

    const taskControls = {
      setTaskOutput,
      patchTask,
      ...tasks,
    };
    const skipBranch = (
      path: string | readonly [string, ...string[]],
      label: string,
      status: string,
    ) =>
      markTaskBranch(taskControls, kicadOutputTasks, path, {
        state: "success",
        label,
        status,
        childStatus: status,
      });

    const boardFilename = yield* Effect.sync(() =>
      basename(pcbFile, ".kicad_pcb"),
    );
    const fs = yield* FileSystem.FileSystem;
    const outputPaths = {
      gerbers: resolve(project, options.paths.gerbers),
      svg: resolve(project, options.paths.svg),
      png: resolve(project, options.paths.png),
      dxf: resolve(project, options.paths.dxf),
      place: resolve(project, options.paths.place),
    };
    const enabledSides = options.sides;
    const enabledMaskSides = options.solderMask.sides;
    const enabledStencilSides = options.stencil.sides;
    const sideSkipStatus = (side: Side, workflow: "solderMask" | "stencil") =>
      enabledSides.includes(side)
        ? `${workflow}.excludeSides includes ${side}`
        : `board.ignoreSide=${side}`;
    const enabledMaskLayers = enabledMaskSides
      .map((side) => sideConfig[side].maskLayer)
      .join(",");
    const enabledPasteLayers = enabledStencilSides
      .map((side) => sideConfig[side].pasteLayer)
      .join(",");

    yield* fs.makeDirectory(outputPaths.gerbers, { recursive: true });
    yield* fs.makeDirectory(outputPaths.svg, { recursive: true });

    const gerbers = yield* runWithKicadAndTask({
      kicadCli,
      project,
      pcbFile,
      args: [
        "pcb",
        "export",
        "gerbers",
        "--use-drill-file-origin",
        "--output",
        outputPaths.gerbers,
      ],
      setTaskOutput: (output) => setTaskOutput("gerbers", output),
      setError: (error) =>
        patchTask("gerbers", { state: "error", output: error }),
      setSuccess: () =>
        patchTask("gerbers", {
          state: "success",
          label: "Successfully generated Gerbers.",
        }),
    }).pipe(Effect.forkChild);

    const drill = yield* (
      options.drills.generate
        ? runWithKicadAndTask({
            kicadCli,
            project,
            pcbFile,
            args: [
              "pcb",
              "export",
              "drill",
              "--drill-origin",
              "plot",
              "--excellon-oval-format",
              "route",
              "--output",
              outputPaths.gerbers,
            ],
            setTaskOutput: (output) => setTaskOutput("drill", output),
            setError: (error) =>
              patchTask("drill", { state: "error", output: error }),
            setSuccess: () =>
              patchTask("drill", {
                state: "success",
                label: "Successfully generated drill files.",
                status: options.drills.withEdgeCuts
                  ? "withEdgeCuts is enabled for downstream drill handling."
                  : "",
              }),
          })
        : skipBranch(
            "drill",
            "Drill generation skipped.",
            "drills.generate=false",
          )
    ).pipe(Effect.forkChild);

    const latch = yield* Latch.make();

    const shouldGenerateSolderMaskAssets =
      options.solderMask.generate && enabledMaskSides.length > 0;

    const svg = yield* (
      shouldGenerateSolderMaskAssets
        ? runWithKicadAndTask({
            kicadCli,
            project,
            pcbFile,
            args: [
              "pcb",
              "export",
              "svg",
              "--layers",
              enabledMaskLayers,
              "--common-layers",
              "Edge.Cuts",
              "--mode-multi",
              "--page-size-mode",
              "2",
              "--black-and-white",
              "--exclude-drawing-sheet",
              "--output",
              outputPaths.svg,
            ],
            setTaskOutput: (output) => setTaskOutput("svg", output),
            setError: (error) =>
              patchTask("svg", { state: "error", status: error }),
            setSuccess: () =>
              patchTask("svg", {
                state: "success",
                label: "Successfully generated SVG files.",
              }),
            latch,
          })
        : skipBranch(
            "svg",
            "Solder mask SVG generation skipped.",
            options.solderMask.generate
              ? (options.solderMask.skipReason ??
                  "No enabled solder mask sides.")
              : "solderMask.generate=false",
          ).pipe(Effect.andThen(latch.open))
    ).pipe(Effect.forkChild);

    const pngGeneration = yield* (
      shouldGenerateSolderMaskAssets
        ? Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;

            yield* fs.makeDirectory(outputPaths.png, { recursive: true });
            yield* latch.await;

            yield* patchTask("png", {
              state: "loading",
              label: "Generating PNG files...",
            });

            const sideEffects = (["front", "back"] as const).map((side) => {
              const config = sideConfig[side];

              if (!enabledMaskSides.includes(side)) {
                return skipBranch(
                  ["png", side],
                  `${config.label} PNG generation skipped.`,
                  sideSkipStatus(side, "solderMask"),
                );
              }

              return Effect.gen(function* () {
                yield* patchTask(["png", side], {
                  state: "loading",
                });

                yield* generatePngFromSvg(
                  resolve(
                    outputPaths.svg,
                    `${boardFilename}-${config.maskFileSuffix}.svg`,
                  ),
                  resolve(
                    outputPaths.png,
                    `${boardFilename}-${config.maskFileSuffix}.png`,
                  ),
                  { zoom: solderMaskPngZoom },
                );

                yield* patchTask(["png", side], {
                  state: "success",
                  label: `Successfully generated ${config.label} PNG file.`,
                });
              });
            });

            yield* Effect.all(sideEffects, { concurrency: "unbounded" }).pipe(
              Effect.tapError(() =>
                patchTask("png", {
                  state: "error",
                  label: "Failed to generate PNG files.",
                }),
              ),
            );

            yield* patchTask("png", {
              state: "success",
              label: "Successfully generated PNG files.",
            });
          })
        : skipBranch(
            "png",
            "Solder mask PNG generation skipped.",
            options.solderMask.generate
              ? (options.solderMask.skipReason ??
                  "No enabled solder mask sides.")
              : "solderMask.generate=false",
          )
    ).pipe(Effect.forkChild);

    const boardImage = yield* (
      options.boardImage.generate
        ? Effect.gen(function* () {
            const svgPath = getBoardImageSvgPath(
              outputPaths.svg,
              boardFilename,
            );
            const pngPath = getBoardImagePngPath(
              outputPaths.png,
              boardFilename,
            );

            yield* fs.makeDirectory(outputPaths.png, { recursive: true });
            yield* patchTask("board-image", {
              state: "loading",
              label: "Generating board image...",
            });

            yield* patchTask(["board-image", "svg"], {
              state: "loading",
            });

            yield* runWithKicadAndTask({
              kicadCli,
              project,
              pcbFile,
              args: buildBoardImageSvgExportArgs(svgPath),
              setTaskOutput: (output) =>
                setTaskOutput(["board-image", "svg"], output),
              setError: (error) =>
                patchTask(["board-image", "svg"], {
                  state: "error",
                  output: error,
                }),
              setSuccess: () =>
                patchTask(["board-image", "svg"], {
                  state: "success",
                  label: "Successfully generated board image SVG.",
                }),
            });

            yield* patchTask(["board-image", "png"], {
              state: "loading",
            });

            const png = yield* generatePngFromSvg(svgPath, pngPath, {
              zoom: boardImagePngZoom,
            });

            yield* patchTask(["board-image", "png"], {
              state: "success",
              label: "Successfully generated board image PNG.",
              status: formatPngTrimStatus(png.info),
            });
            yield* patchTask("board-image", {
              state: "success",
              label: "Successfully generated board image.",
              status: pngPath,
            });

            return pngPath;
          }).pipe(
            Effect.tapError((error) =>
              patchTask("board-image", {
                state: "error",
                output: error instanceof Error ? error.message : String(error),
              }),
            ),
          )
        : skipBranch(
            "board-image",
            "Board image generation skipped.",
            options.boardImage.skipReason ?? "board image disabled.",
          ).pipe(Effect.as(undefined))
    ).pipe(Effect.forkChild);

    yield* fs.makeDirectory(outputPaths.dxf, { recursive: true });

    const pasteDxf =
      options.stencil.generate && enabledStencilSides.length > 0
        ? runWithKicadAndTask({
            kicadCli,
            project,
            pcbFile,
            args: [
              "pcb",
              "export",
              "dxf",
              "--layers",
              enabledPasteLayers,
              "--use-drill-origin",
              "--output-units",
              "mm",
              "--output",
              outputPaths.dxf,
            ],
            setTaskOutput: (output) =>
              setTaskOutput(["dxf", "paste-without-edge-cuts"], output),
            setError: (error) =>
              patchTask(["dxf", "paste-without-edge-cuts"], {
                state: "error",
                output: error,
              }),
            setSuccess: () =>
              patchTask(["dxf", "paste-without-edge-cuts"], {
                state: "success",
                label:
                  "Successfully generated paste DXF files without edge cuts.",
              }),
          })
        : skipBranch(
            ["dxf", "paste-without-edge-cuts"],
            "Paste DXF generation skipped.",
            options.stencil.generate
              ? (options.stencil.skipReason ?? "No enabled stencil sides.")
              : "stencil.generate=false",
          );

    const maskDxf = shouldGenerateSolderMaskAssets
      ? runWithKicadAndTask({
          kicadCli,
          project,
          pcbFile,
          args: [
            "pcb",
            "export",
            "dxf",
            "--layers",
            enabledMaskLayers,
            "--common-layers",
            "Edge.Cuts",
            "--use-drill-origin",
            "--output-units",
            "mm",
            "--output",
            outputPaths.dxf,
          ],
          setTaskOutput: (output) =>
            setTaskOutput(["dxf", "mask-with-edge-cuts"], output),
          setError: (error) =>
            patchTask(["dxf", "mask-with-edge-cuts"], {
              state: "error",
              output: error,
            }),
          setSuccess: () =>
            patchTask(["dxf", "mask-with-edge-cuts"], {
              state: "success",
              label: "Successfully generated mask DXF files with edge cuts.",
            }),
        })
      : skipBranch(
          ["dxf", "mask-with-edge-cuts"],
          "Mask DXF generation skipped.",
          options.solderMask.generate
            ? (options.solderMask.skipReason ?? "No enabled solder mask sides.")
            : "solderMask.generate=false",
        );

    const dxf = yield* Effect.all([pasteDxf, maskDxf], {
      concurrency: "unbounded",
    }).pipe(
      Effect.andThen(() =>
        patchTask("dxf", {
          state: "success",
          label: "Successfully generated DXF files.",
          status: "",
        }),
      ),
      Effect.tapError((error) =>
        patchTask("dxf", {
          state: "error",
          output: error instanceof Error ? error.message : String(error),
        }),
      ),
      Effect.forkChild,
    );

    const place = options.place.generate
      ? Effect.gen(function* () {
          yield* fs.makeDirectory(outputPaths.place, { recursive: true });

          const sideEffects = (["front", "back"] as const).map((side) => {
            const config = sideConfig[side];

            if (!enabledSides.includes(side)) {
              return skipBranch(
                ["place", side],
                `${config.label} place generation skipped.`,
                `board.ignoreSide=${side}`,
              );
            }

            return runWithKicadAndTask({
              kicadCli,
              project,
              pcbFile,
              args: [
                "pcb",
                "export",
                "pos",
                "--side",
                config.placeSide,
                "--units",
                "mm",
                "--use-drill-file-origin",
                "--bottom-negate-x",
                "--output",
                resolve(
                  outputPaths.place,
                  `${boardFilename}_${config.placeSuffix}.pos`,
                ),
              ],
              setTaskOutput: (output) => setTaskOutput("place", output),
              setError: (error) =>
                patchTask(["place", side], { state: "error", output: error }),
              setSuccess: () =>
                patchTask(["place", side], {
                  state: "success",
                  label: `Successfully generated ${config.label} place file.`,
                }),
            });
          });

          yield* Effect.all(sideEffects, { concurrency: "unbounded" });
          yield* patchTask("place", {
            state: "success",
            label: "Successfully generated place files.",
          });
        })
      : skipBranch(
          "place",
          "Place file generation skipped.",
          "place.generate=false",
        );

    const results = yield* Effect.all(
      [
        Fiber.join(gerbers),
        Fiber.join(drill),
        Fiber.join(svg),
        Fiber.join(pngGeneration),
        Fiber.join(dxf),
        Fiber.join(boardImage),
        place,
      ],
      {
        concurrency: "unbounded",
      },
    );

    return {
      boardImagePngPath: results[5],
    } satisfies GenerateKicadOutputsResult;
  },
  Effect.scoped,
);
