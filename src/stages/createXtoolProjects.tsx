import { createTasklist, type TaskDef } from "@/inkHelpers";
import { runAppleScript } from "@/utils";
import CDP, { type Client } from "chrome-remote-interface";
import DxfParser from "dxf-parser";
import { Duration, Effect, FileSystem, Schedule } from "effect";
import { resolve } from "node:path";
import {
  applescriptBringDialogToFront,
  applescriptCopyFileToClipboard,
  applescriptEsc,
  applescriptOpenXtoolAndPaste,
  applescriptSave,
  applescriptSetWindowSize,
  clickConfirmSwitch,
  clickDeviceLibrary,
  clickDeviceSwitch,
  clickInkjetPrinting,
  clickM1Ultra,
  clickMode,
  clickScaleToFit,
  getWidthBoundingBox,
  getXBoundingBox,
  getYBoundingBox,
  shellClickOnSaveScript,
  shellCreateProjectBrowserScript,
} from "./xtool";
import { getDxfBounds } from "./xtool/getBoundingBoxFromDxf";

// const startXToolStudio = Effect.fn("flatmaxx.startXToolStudio")(function* () {
//   const studio = yield* ChildProcess.make(`/Applications/xTool Studio.app/Contents/MacOS/xTool Studio`, ["--remote-debugging-port=9333", "--remote-allow-origins=*"]);
// });

const getXToolStudioShell = Effect.fn("flatmaxx.getXToolStudioShell")(
  function* (targets: CDP.Target[]) {
    const target = targets.find(
      (t) => t.type === "page" && t.url === "atomm://renderer/shell",
    );

    if (!target) {
      return yield* Effect.fail(new Error("No xTool Studio shell found."));
    }

    const client = yield* Effect.promise(() =>
      CDP({ port: 9333, target: target?.id }),
    );

    return client;
  },
);

const getNewProjectTarget = Effect.fn("flatmaxx.getNewProjectTarget")(
  function* () {
    const targets = yield* getTargets;

    const target = targets.find(
      (t) =>
        t.type === "page" &&
        t.url === "atomm://renderer/editor/" &&
        t.title.includes("Untitled"),
    );

    if (!target) {
      return yield* Effect.fail(new Error("No new project target found."));
    }

    const client = yield* Effect.promise(() =>
      CDP({ port: 9333, target: target?.id }),
    );

    return client;
  },
);

const runScriptInXToolStudio = Effect.fn("flatmaxx.runScriptInXToolStudio")(
  function* (
    script: string,
    runtime: Client["Runtime"],
    returnByValue: boolean = false,
  ) {
    const res = yield* Effect.promise(() =>
      runtime.evaluate({
        expression: script,
        awaitPromise: true,
        returnByValue,
      }),
    );

    if (res.exceptionDetails) {
      return yield* Effect.fail(
        new Error(
          res.exceptionDetails.exception?.description ?? "Unknown error",
          { cause: res.exceptionDetails },
        ),
      );
    }

    return res.result.value;
  },
  Effect.retry(Schedule.exponential(1000)),
  Effect.timeout(Duration.seconds(10)),
);

const getTargets = Effect.promise(() => CDP.List({ port: 9333 }));

const createNewXtoolProject = Effect.fn(
  "flatmaxx.createXtoolProjects.createNewXtoolProject",
)(function* (
  modifyTaskChild: (
    id: string,
    childId: string,
    childDef: Partial<TaskDef>,
  ) => Effect.Effect<void>,
) {
  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    state: "loading",
    label: "Creating new project...",
    status: "Finding CDP targets...",
  });

  const targets = yield* getTargets;

  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    state: "loading",
    label: "Creating new project...",
    status: "Connecting to the xTool Studio shell...",
  });
  const shellClient = yield* getXToolStudioShell(targets);
  const { Runtime } = shellClient;

  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    state: "loading",
    label: "Creating new project...",
    status: "Running browser script to create a new project...",
  });
  yield* runScriptInXToolStudio(shellCreateProjectBrowserScript, Runtime).pipe(
    Effect.ensuring(Effect.promise(() => shellClient.close())),
  );

  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    state: "loading",
    label: "Creating new project...",
    status: "Getting new project target...",
  });
  const newProjectTarget = yield* getNewProjectTarget().pipe(
    Effect.retry(Schedule.exponential(1000)),
    Effect.timeout(Duration.seconds(10)),
  );

  return newProjectTarget;
});

const saveXtoolProjectAndClose = Effect.fn(
  "flatmaxx.createXtoolProjects.saveXtoolProjectAndClose",
)(function* (desiredAbsolutePath: string, { Input, Runtime }: Client) {
  const absolutePath = yield* Effect.sync(() =>
    resolve(desiredAbsolutePath, "solder_mask.xs"),
  );

  yield* runScriptInXToolStudio(
    `document.querySelector('body').focus()`,
    Runtime,
  );

  yield* Effect.promise(() =>
    Input.dispatchKeyEvent({
      type: "rawKeyDown",
      modifiers: 4,
      key: "s",
      code: "KeyS",
      windowsVirtualKeyCode: 83,
      text: "s",
      unmodifiedText: "s",
      commands: ["save"],
    }),
  );

  yield* Effect.promise(() =>
    Input.dispatchKeyEvent({
      type: "keyUp",
      modifiers: 8,
      key: "s",
      code: "KeyS",
      windowsVirtualKeyCode: 83,
    }),
  );

  yield* Effect.promise(() =>
    Input.dispatchKeyEvent({
      type: "keyUp",
      modifiers: 0,
      key: "Meta",
      code: "MetaLeft",
      windowsVirtualKeyCode: 91,
    }),
  );

  yield* runScriptInXToolStudio(shellClickOnSaveScript, Runtime).pipe(
    Effect.retry(Schedule.exponential(1000)),
    Effect.timeout(Duration.seconds(10)),
  );

  const app = "xTool Studio";
  const dir = absolutePath;
  const filename = "solder_mask.xs";

  yield* runAppleScript(applescriptBringDialogToFront(app));
  yield* runAppleScript(applescriptSave(app, dir, filename));
});

const cdpClickOn = Effect.fn("flatmaxx.createXtoolProjects.cdpClickOn")(
  function* (x: number, y: number, Input: Client["Input"]) {
    yield* Effect.promise(() =>
      Input.dispatchMouseEvent({
        type: "mouseMoved",
        x,
        y,
        button: "none",
      }),
    );

    yield* Effect.promise(() =>
      Input.dispatchMouseEvent({
        type: "mousePressed",
        x,
        y,
        button: "left",
        clickCount: 1,
      }),
    );

    yield* Effect.promise(() =>
      Input.dispatchMouseEvent({
        type: "mouseReleased",
        x,
        y,
        button: "left",
        clickCount: 1,
      }),
    );
  },
);

const cdpTypeIn = Effect.fn("flatmaxx.createXtoolProjects.cdpTypeIn")(
  function* (
    text: string,
    Input: Client["Input"],
    pressEnterWhenDone: boolean = false,
  ) {
    yield* Effect.promise(() =>
      Input.dispatchKeyEvent({
        type: "keyDown",
        modifiers: 4,
        key: "a",
        code: "KeyA",
        windowsVirtualKeyCode: 65,
        commands: ["selectAll"],
      }),
    );

    yield* Effect.promise(() =>
      Input.dispatchKeyEvent({
        type: "keyUp",
        modifiers: 4,
        key: "a",
        code: "KeyA",
        windowsVirtualKeyCode: 65,
      }),
    );

    yield* Effect.promise(() =>
      Input.insertText({
        text,
      }),
    );

    if (pressEnterWhenDone) {
      yield* Effect.promise(() =>
        Input.dispatchKeyEvent({
          type: "keyDown",
          key: "Enter",
          code: "Enter",
          windowsVirtualKeyCode: 13,
        }),
      );

      yield* Effect.promise(() =>
        Input.dispatchKeyEvent({
          type: "keyUp",
          key: "Enter",
          code: "Enter",
          windowsVirtualKeyCode: 13,
        }),
      );
    }
  },
);

const cdpClickEmptyCanvas = Effect.fn(
  "flatmaxx.createXtoolProjects.cdpClickEmptyCanvas",
)(function* (Input: Client["Input"]) {
  // Pick a boring empty spot in the editor viewport.
  // Tune these once against xTool. Avoid toolbar/sidebar/object bounds.
  const x = 180;
  const y = 180;

  yield* cdpClickOn(x, y, Input);
  yield* Effect.sleep(Duration.millis(150));
});

export const pasteIntoXToolStudio = Effect.fn(
  "flatmaxx.createXtoolProjects.pasteIntoXToolStudio",
)(function* (
  { Runtime, Input }: Client,
  modifyTaskChild: (
    id: string,
    childId: string,
    childDef: Partial<TaskDef>,
  ) => Effect.Effect<void>,
  { width }: { width: number; height: number },
  offsetToTheRightBy: number,
) {
  yield* runAppleScript(applescriptOpenXtoolAndPaste);

  yield* runScriptInXToolStudio(clickScaleToFit, Runtime);

  const wBox: { width: number; height: number; x: number; y: number } =
    yield* runScriptInXToolStudio(getWidthBoundingBox(), Runtime, true);
  yield* cdpClickOn(wBox.x + wBox.width / 2, wBox.y + wBox.height / 2, Input);
  yield* cdpTypeIn(width.toString(), Input, true);

  const xBox: { width: number; height: number; x: number; y: number } =
    yield* runScriptInXToolStudio(getXBoundingBox(), Runtime, true);
  yield* cdpClickOn(xBox.x + xBox.width / 2, xBox.y + xBox.height / 2, Input);
  yield* cdpTypeIn(
    (0 + (offsetToTheRightBy > 0 ? width + offsetToTheRightBy : 0)).toString(),
    Input,
    true,
  );

  const yBox: { width: number; height: number; x: number; y: number } =
    yield* runScriptInXToolStudio(getYBoundingBox(), Runtime, true);
  yield* cdpClickOn(yBox.x + yBox.width / 2, yBox.y + yBox.height / 2, Input);
  yield* cdpTypeIn("0", Input, true);

  yield* runAppleScript(applescriptEsc);
  yield* cdpClickEmptyCanvas(Input);
});

const importFrontSolderMask = Effect.fn(
  "flatmaxx.createXtoolProjects.importFrontSolderMask",
)(function* (
  projectPath: string,
  pcbName: string,
  newProjectTarget: Client,
  modifyTaskChild: (
    id: string,
    childId: string,
    childDef: Partial<TaskDef>,
  ) => Effect.Effect<void>,
  offsetSecondToTheRightBy: number,
) {
  const fs = yield* FileSystem.FileSystem;

  yield* modifyTaskChild("create-solder-mask-project", "get-bounds", {
    state: "loading",
    label: "Getting width and height of the board...",
    status: "Reading DXF file...",
  });
  const dxfFile = yield* fs.readFileString(
    resolve(projectPath, "..", "dxf", `${pcbName}-F_Mask.dxf`),
  );

  yield* modifyTaskChild("create-solder-mask-project", "get-bounds", {
    state: "loading",
    label: "Getting width and height of the board...",
    status: "Parsing DXF file...",
  });
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfFile);
  if (!dxf) {
    yield* modifyTaskChild("create-solder-mask-project", "get-bounds", {
      state: "error",
      label: "Getting width and height of the board...",
      status: "Failed to parse DXF file.",
    });
    return yield* Effect.fail(new Error("Failed to parse DXF file."));
  }

  yield* modifyTaskChild("create-solder-mask-project", "get-bounds", {
    state: "loading",
    label: "Getting width and height of the board...",
    status: "DXF file parsed successfully.",
  });

  const bounds = getDxfBounds(dxf);

  yield* modifyTaskChild("create-solder-mask-project", "get-bounds", {
    state: "success",
    label: `Got ${bounds.width}x${bounds.height}mm bounds from DXF file.`,
    status: "",
  });

  yield* modifyTaskChild(
    "create-solder-mask-project",
    "import-front-solder-mask",
    {
      state: "loading",
      label: "Importing front solder mask...",
      status: "Copying front PNG file to clipboard...",
    },
  );

  yield* runAppleScript(
    applescriptCopyFileToClipboard(
      resolve(projectPath, "..", "png", `${pcbName}-F_Mask.png`),
    ),
  );

  yield* modifyTaskChild(
    "create-solder-mask-project",
    "import-front-solder-mask",
    {
      state: "loading",
      status: "Pasting front PNG file to xTool Studio (1/2)...",
    },
  );

  yield* pasteIntoXToolStudio(newProjectTarget, modifyTaskChild, bounds, 0);

  yield* modifyTaskChild(
    "create-solder-mask-project",
    "import-front-solder-mask",
    {
      state: "loading",
      status: "Pasting front PNG file to xTool Studio (2/2)...",
    },
  );

  yield* pasteIntoXToolStudio(
    newProjectTarget,
    modifyTaskChild,
    bounds,
    offsetSecondToTheRightBy,
  );

  yield* modifyTaskChild(
    "create-solder-mask-project",
    "import-front-solder-mask",
    {
      state: "success",
      label: "Front solder mask imported successfully.",
      status: "",
    },
  );
});

const createSolderMaskProject = Effect.fn(
  "flatmaxx.createXtoolProjects.createSolderMaskProject",
)(function* (
  desiredAbsolutePath: string,
  pcbName: string,
  modifyTaskChild: (
    id: string,
    childId: string,
    childDef: Partial<TaskDef>,
  ) => Effect.Effect<void>,
  offsetSecondToTheRightBy: number,
  offsetBackToTheBottomBy: number,
) {
  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    state: "loading",
    label: "Creating new project...",
  });
  const newProjectTarget = yield* createNewXtoolProject(modifyTaskChild);

  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    state: "loading",
    label: "Creating new project...",
    status: "Clicking switch device...",
  });
  yield* runScriptInXToolStudio(clickDeviceSwitch, newProjectTarget.Runtime);

  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    state: "loading",
    status: "Clicking device library...",
  });
  yield* runScriptInXToolStudio(clickDeviceLibrary, newProjectTarget.Runtime);

  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    status: "Clicking M1 Ultra...",
  });
  yield* runScriptInXToolStudio(clickM1Ultra, newProjectTarget.Runtime);

  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    status: "Confirming switch...",
  });
  yield* runScriptInXToolStudio(clickConfirmSwitch, newProjectTarget.Runtime);

  yield* runScriptInXToolStudio(clickMode, newProjectTarget.Runtime);
  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    status: "Clicking mode...",
  });

  yield* runScriptInXToolStudio(clickInkjetPrinting, newProjectTarget.Runtime);
  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    status: "Clicking inkjet printing...",
  });

  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    state: "success",
    label: "New project created.",
    status: "",
  });

  yield* runAppleScript(
    applescriptSetWindowSize("xTool Studio", 1280, 720),
  ).pipe(
    Effect.retry(Schedule.exponential(1000)),
    Effect.timeout(Duration.seconds(10)),
  );

  yield* importFrontSolderMask(
    desiredAbsolutePath,
    pcbName,
    newProjectTarget,
    modifyTaskChild,
    offsetSecondToTheRightBy,
  );

  yield* saveXtoolProjectAndClose(desiredAbsolutePath, newProjectTarget).pipe(
    Effect.ensuring(Effect.promise(() => newProjectTarget.close())),
  );
});

export const createXtoolProjects = Effect.fn("flatmaxx.createXtoolProjects")(
  function* (
    projectPath: string,
    pcbName: string,
    offsetSecondToTheRightBy: number,
    offsetBackToTheBottomBy: number,
  ) {
    const fs = yield* FileSystem.FileSystem;

    const { executeWithTask, patchTask, modifyTaskChild } =
      yield* createTasklist(
        [
          {
            id: "create-folder",
            label: "Creating xTool folder...",
            state: "loading",
          },
          {
            id: "start-app",
            label: "Start xTool Studio.",
            state: "pending",
          },
          {
            id: "create-solder-mask-project",
            label: "Create solder mask project.",
            state: "pending",
          },
          {
            id: "stop-app",
            label: "Stop xTool Studio.",
            state: "pending",
          },
        ],
        "Step X: Create xTool projects",
      );

    if (!(yield* fs.exists(resolve(projectPath, "xtool")))) {
      yield* executeWithTask({
        taskId: "create-folder",
        effect: fs.makeDirectory(resolve(projectPath, "xtool"), {
          recursive: true,
        }),
        executingLabel: "Creating xTool folder...",
        doneLabel: "xTool folder created.",
        errorLabel: "Failed to create xTool folder.",
      });
    } else {
      yield* patchTask("create-folder", {
        state: "success",
        label: "xTool folder already exists.",
      });
    }

    yield* patchTask("create-solder-mask-project", {
      state: "loading",
      label: "Creating solder mask project...",
      children: [
        {
          id: "create-new-project",
          label: "Creating new project...",
          state: "pending",
        },
        {
          id: "get-bounds",
          label: "Getting width and height of the board...",
          state: "pending",
        },
        {
          id: "import-front-solder-mask",
          label: "Importing front solder mask...",
          state: "pending",
        },
        {
          id: "import-back-solder-mask",
          label: "Importing back solder mask...",
          state: "pending",
        },
        {
          id: "save-project",
          label: "Saving project...",
          state: "pending",
        },
        {
          id: "close-project",
          label: "Closing project...",
          state: "pending",
        },
      ],
    });
    yield* createSolderMaskProject(
      resolve(projectPath, "xtool"),
      pcbName,
      modifyTaskChild,
      offsetSecondToTheRightBy,
      offsetBackToTheBottomBy,
    );
  },
);
