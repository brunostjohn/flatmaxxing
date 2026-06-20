import { createTasklist } from "@/inkHelpers";
import { Resvg } from "@resvg/resvg-js";
import { Effect, Fiber, FileSystem, Latch, Ref, Stream } from "effect";
import { ChildProcess } from "effect/unstable/process";
import { basename, resolve } from "node:path";
import sharp from "sharp";

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

const generatePngFromSvg = Effect.fn(
  "flatmaxx.generateKicadOutputs.generatePngFromSvg",
)(function* (svgFile: string, pngFile: string) {
  const fs = yield* FileSystem.FileSystem;

  const svg = yield* fs.readFileString(svgFile);

  const resvg = new Resvg(svg, {
    background: "rgba(255, 255, 255, 0)",
    fitTo: {
      mode: "zoom",
      value: 25,
    },
    font: {
      loadSystemFonts: true,
    },
  });

  const pngData = yield* Effect.sync(() => resvg.render());
  const pngBuffer = yield* Effect.sync(() => pngData.asPng());
  const trimmed = yield* Effect.promise(() =>
    sharp(pngBuffer).trim().toBuffer(),
  );

  yield* fs.writeFile(pngFile, trimmed);
});

export const generateKicadOutputs = Effect.fn("flatmaxx.generateKicadOutputs")(
  function* (kicadCli: string, project: string, pcbFile: string) {
    const { setTaskOutput, patchTask } = yield* createTasklist(
      [
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
          id: "dxf",
          label: "Generating DXF files...",
          state: "loading",
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
      ],
      "Step 1: Create KiCAD outputs",
    );

    const boardFilename = yield* Effect.sync(() =>
      basename(pcbFile, ".kicad_pcb"),
    );

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
        "./gerbers",
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

    const drill = yield* runWithKicadAndTask({
      kicadCli,
      project,
      pcbFile,
      args: [
        "pcb",
        "export",
        "drill",
        "--drill-origin",
        "plot",
        "--output",
        "./gerbers",
      ],
      setTaskOutput: (output) => setTaskOutput("drill", output),
      setError: (error) =>
        patchTask("drill", { state: "error", output: error }),
      setSuccess: () =>
        patchTask("drill", {
          state: "success",
          label: "Successfully generated drill files.",
        }),
    }).pipe(Effect.forkChild);

    const latch = yield* Latch.make();

    const svg = yield* runWithKicadAndTask({
      kicadCli,
      project,
      pcbFile,
      args: [
        "pcb",
        "export",
        "svg",
        "--layers",
        "F.Mask,B.Mask",
        "--common-layers",
        "Edge.Cuts",
        "--mode-multi",
        "--page-size-mode",
        "2",
        "--black-and-white",
        "--exclude-drawing-sheet",
        "--output",
        "./svg",
      ],
      setTaskOutput: (output) => setTaskOutput("svg", output),
      setError: (error) => patchTask("svg", { state: "error", status: error }),
      setSuccess: () =>
        patchTask("svg", {
          state: "success",
          label: "Successfully generated SVG files.",
        }),
      latch,
    }).pipe(Effect.forkChild);

    const [frontSvgFilename, backSvgFilename] = [
      `${boardFilename}-F_Mask.svg`,
      `${boardFilename}-B_Mask.svg`,
    ];

    const pngGeneration = yield* Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      yield* fs.makeDirectory(resolve(project, "png"), { recursive: true });

      yield* latch.await;

      yield* patchTask("png", {
        state: "loading",
        label: "Generating PNG files...",
      });

      const frontPngFiber = yield* Effect.gen(function* () {
        yield* patchTask(["png", "front"], {
          state: "loading",
        });

        yield* generatePngFromSvg(
          `${resolve(project, "svg", frontSvgFilename)}`,
          `${resolve(project, "png", `${boardFilename}-F_Mask.png`)}`,
        );

        yield* patchTask(["png", "front"], {
          state: "success",
          label: "Successfully generated front PNG file.",
        });
      }).pipe(Effect.forkChild);
      const backPngFiber = yield* Effect.gen(function* () {
        yield* patchTask(["png", "back"], {
          state: "loading",
        });

        yield* generatePngFromSvg(
          `${resolve(project, "svg", backSvgFilename)}`,
          `${resolve(project, "png", `${boardFilename}-B_Mask.png`)}`,
        );

        yield* patchTask(["png", "back"], {
          state: "success",
          label: "Successfully generated back PNG file.",
        });
      }).pipe(Effect.forkChild);

      yield* Effect.all([Fiber.join(frontPngFiber), Fiber.join(backPngFiber)], {
        concurrency: "unbounded",
      }).pipe(
        Effect.tapError(() =>
          Effect.gen(function* () {
            yield* patchTask("png", {
              state: "error",
              label: "Failed to generate PNG files.",
            });
          }),
        ),
      );

      yield* patchTask("png", {
        state: "success",
        label: "Successfully generated PNG files.",
      });
    }).pipe(Effect.forkChild);

    const dxf = yield* runWithKicadAndTask({
      kicadCli,
      project,
      pcbFile,
      args: [
        "pcb",
        "export",
        "dxf",
        "--layers",
        "F.Paste,B.Paste,F.Mask,B.Mask",
        "--common-layers",
        "Edge.Cuts",
        "--use-drill-origin",
        "--output-units",
        "mm",
        "--output",
        "./dxf",
      ],
      setTaskOutput: (output) => setTaskOutput("dxf", output),
      setError: (error) => patchTask("dxf", { state: "error", output: error }),
      setSuccess: () =>
        patchTask("dxf", {
          state: "success",
          label: "Successfully generated DXF files.",
        }),
    }).pipe(Effect.forkChild);

    const frontPlace = yield* runWithKicadAndTask({
      kicadCli,
      project,
      pcbFile,
      args: [
        "pcb",
        "export",
        "pos",
        "--side",
        "front",
        "--units",
        "mm",
        "--use-drill-file-origin",
        "--bottom-negate-x",
        "--output",
        `./place/${boardFilename}_front.pos`,
      ],
      setTaskOutput: (output) => setTaskOutput("place", output),
      setError: (error) =>
        patchTask(["place", "front"], { state: "error", output: error }),
      setSuccess: () =>
        patchTask(["place", "front"], {
          state: "success",
          label: "Successfully generated place files.",
        }),
    }).pipe(Effect.forkChild);

    const backPlace = yield* runWithKicadAndTask({
      kicadCli,
      project,
      pcbFile,
      args: [
        "pcb",
        "export",
        "pos",
        "--side",
        "back",
        "--units",
        "mm",
        "--use-drill-file-origin",
        "--bottom-negate-x",
        "--output",
        `./place/${boardFilename}_back.pos`,
      ],
      setTaskOutput: (output) => setTaskOutput("place", output),
      setError: (error) =>
        patchTask(["place", "back"], { state: "error", output: error }),
      setSuccess: () =>
        patchTask(["place", "back"], {
          state: "success",
          label: "Successfully generated place files.",
        }),
    }).pipe(Effect.forkChild);

    const place = Effect.all([
      Fiber.join(frontPlace),
      Fiber.join(backPlace),
    ]).pipe(
      Effect.andThen(() =>
        Effect.gen(function* () {
          yield* patchTask("place", {
            state: "success",
            label: "Successfully generated place files.",
          });
        }),
      ),
    );

    yield* Effect.all(
      [
        Fiber.join(gerbers),
        Fiber.join(drill),
        Fiber.join(svg),
        Fiber.join(pngGeneration),
        Fiber.join(dxf),
        place,
      ],
      {
        concurrency: "unbounded",
      },
    );
  },
  Effect.scoped,
);
