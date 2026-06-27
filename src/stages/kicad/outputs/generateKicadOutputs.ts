import type { KicadOutputOptions } from "@/config";
import { createTasklist, nextStep } from "@/inkHelpers";
import { generateBoardImage } from "@/stages/kicad/outputs/boardImage";
import {
  defaultKicadOutputOptions,
  sideConfig,
} from "@/stages/kicad/outputs/constants";
import { generateDrill } from "@/stages/kicad/outputs/drill";
import { generateDxf } from "@/stages/kicad/outputs/dxf";
import { generateGerbers } from "@/stages/kicad/outputs/gerbers";
import { generatePlace } from "@/stages/kicad/outputs/place";
import { generateSolderMaskPng } from "@/stages/kicad/outputs/solderMaskPng";
import { generateSolderMaskSvg } from "@/stages/kicad/outputs/solderMaskSvg";
import { kicadOutputTasks } from "@/stages/kicad/outputs/tasks";
import type {
  GenerateKicadOutputsResult,
  KicadOutputContext,
} from "@/stages/kicad/outputs/types";
import { Array, Effect, FileSystem, Fiber, Latch, Path } from "effect";

export const generateKicadOutputs = Effect.fn("flatmaxx.generateKicadOutputs")(
  function* (
    kicadCli: string,
    project: string,
    pcbFile: string,
    options: KicadOutputOptions = defaultKicadOutputOptions,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const tasks = yield* createTasklist(
      kicadOutputTasks,
      `Step ${nextStep()}: Create KiCAD outputs`,
    );

    const boardFilename = path.basename(pcbFile, ".kicad_pcb");
    const outputPaths = {
      gerbers: path.resolve(project, options.paths.gerbers),
      svg: path.resolve(project, options.paths.svg),
      png: path.resolve(project, options.paths.png),
      dxf: path.resolve(project, options.paths.dxf),
      place: path.resolve(project, options.paths.place),
    };

    const context: KicadOutputContext = {
      kicadCli,
      project,
      pcbFile,
      boardFilename,
      options,
      outputPaths,
      enabledMaskLayers: Array.join(
        Array.map(
          options.solderMask.sides,
          (side) => sideConfig[side].maskLayer,
        ),
        ",",
      ),
      enabledPasteLayers: Array.join(
        Array.map(options.stencil.sides, (side) => sideConfig[side].pasteLayer),
        ",",
      ),
      shouldGenerateSolderMaskAssets:
        options.solderMask.generate && options.solderMask.sides.length > 0,
      tasks,
    };

    yield* fs.makeDirectory(outputPaths.gerbers, { recursive: true });
    yield* fs.makeDirectory(outputPaths.svg, { recursive: true });
    yield* fs.makeDirectory(outputPaths.dxf, { recursive: true });

    const latch = yield* Latch.make();

    const gerbers = yield* generateGerbers(context).pipe(Effect.forkChild);
    const drill = yield* generateDrill(context).pipe(Effect.forkChild);
    const svg = yield* generateSolderMaskSvg(context, latch).pipe(
      Effect.forkChild,
    );
    const png = yield* generateSolderMaskPng(context, latch).pipe(
      Effect.forkChild,
    );
    const dxf = yield* generateDxf(context).pipe(Effect.forkChild);
    const boardImage = yield* generateBoardImage(context).pipe(
      Effect.forkChild,
    );

    const results = yield* Effect.all(
      [
        Fiber.join(gerbers),
        Fiber.join(drill),
        Fiber.join(svg),
        Fiber.join(png),
        Fiber.join(dxf),
        Fiber.join(boardImage),
        generatePlace(context),
      ],
      { concurrency: "unbounded" },
    );

    return {
      boardImagePngPath: results[5],
    } satisfies GenerateKicadOutputsResult;
  },
  Effect.scoped,
);
