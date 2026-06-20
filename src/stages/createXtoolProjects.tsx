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
  clickSaveAs,
  clickScaleToFit,
  getIntensitySpanBox,
  getParameterOverviewItemBox,
  getPassesSpanBox,
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
  Effect.retry(
    Schedule.exponential(1000).pipe(Schedule.both(Schedule.recurs(3))),
  ),
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
    label: "Creating project in existing xTool Studio session...",
    status: "Finding CDP targets...",
  });

  const targets = yield* getTargets;

  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    state: "loading",
    label: "Creating project in existing xTool Studio session...",
    status: "Connecting to the xTool Studio shell...",
  });
  const shellClient = yield* getXToolStudioShell(targets);
  const { Runtime } = shellClient;

  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    state: "loading",
    label: "Creating project in existing xTool Studio session...",
    status: "Running browser script to create a new project...",
  });
  yield* runScriptInXToolStudio(shellCreateProjectBrowserScript, Runtime).pipe(
    Effect.ensuring(Effect.promise(() => shellClient.close())),
  );

  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    state: "loading",
    label: "Creating project in existing xTool Studio session...",
    status: "Getting new project target...",
  });
  const newProjectTarget = yield* getNewProjectTarget().pipe(
    Effect.retry(
      Schedule.exponential(1000).pipe(Schedule.both(Schedule.recurs(3))),
    ),
  );

  return newProjectTarget;
});

const saveXtoolProjectAndClose = Effect.fn(
  "flatmaxx.createXtoolProjects.saveXtoolProjectAndClose",
)(function* (
  desiredAbsolutePath: string,
  pcbName: string,
  filetype: "solderMask" | "solderPaste",
  { Runtime }: Client,
) {
  const fs = yield* FileSystem.FileSystem;
  const fileExists = yield* fs.exists(
    resolve(desiredAbsolutePath, `${pcbName}-${filetype}.xs`),
  );
  if (fileExists) {
    yield* fs.remove(
      resolve(desiredAbsolutePath, `${pcbName}-${filetype}.xs`),
      { force: true },
    );
  }

  const absolutePath = yield* Effect.sync(() =>
    resolve(desiredAbsolutePath, `${pcbName}-${filetype}.xs`),
  );

  yield* runScriptInXToolStudio(clickSaveAs(), Runtime);

  yield* runScriptInXToolStudio(shellClickOnSaveScript, Runtime);

  yield* runAppleScript(applescriptBringDialogToFront("xTool Studio"));
  yield* runAppleScript(applescriptSave("xTool Studio", absolutePath));
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

type RectBounds = { x: number; y: number; width: number; height: number };

const getCanvasBoundingBox = () => `
(() => {
  const canvas = document.querySelector("canvas");
  if (!canvas) {
    throw new Error("Canvas not found");
  }

  const boundingBox = canvas.getBoundingClientRect();

  return {
    x: boundingBox.x,
    y: boundingBox.y,
    width: boundingBox.width,
    height: boundingBox.height,
  };
})();
`;

const clearXToolSelection = Effect.fn(
  "flatmaxx.createXtoolProjects.clearXToolSelection",
)(function* ({ Runtime, Input }: Pick<Client, "Runtime" | "Input">) {
  yield* runAppleScript(applescriptEsc);

  const { x, y, height }: RectBounds = yield* runScriptInXToolStudio(
    getCanvasBoundingBox(),
    Runtime,
    true,
  );

  yield* cdpClickOn(x + 2, y + height - 2, Input);
  yield* Effect.sleep(Duration.millis(150));
});

type ModifyTaskChild = (
  id: string,
  childId: string,
  childDef: Partial<TaskDef>,
) => Effect.Effect<void>;

type SolderMaskBounds = { width: number; height: number };

export type SolderMaskPasteOffsets = {
  right?: number;
  bottom?: number;
};

export function getSolderMaskPastePosition(
  { width, height }: SolderMaskBounds,
  { right, bottom }: SolderMaskPasteOffsets = {},
) {
  return {
    x: right === undefined ? 0 : width + right,
    y: bottom === undefined ? 0 : height + bottom,
  };
}

export const pasteIntoXToolStudio = Effect.fn(
  "flatmaxx.createXtoolProjects.pasteIntoXToolStudio",
)(function* (
  { Runtime, Input }: Client,
  bounds: SolderMaskBounds,
  offsets: SolderMaskPasteOffsets = {},
) {
  const { x, y } = getSolderMaskPastePosition(bounds, offsets);

  yield* clearXToolSelection({ Runtime, Input });
  yield* runAppleScript(applescriptOpenXtoolAndPaste);

  yield* runScriptInXToolStudio(clickScaleToFit, Runtime);

  yield* Effect.sleep(Duration.millis(500));

  const wBox: { width: number; height: number; x: number; y: number } =
    yield* runScriptInXToolStudio(getWidthBoundingBox(), Runtime, true);
  yield* cdpClickOn(wBox.x + wBox.width / 2, wBox.y + wBox.height / 2, Input);
  yield* cdpTypeIn(bounds.width.toString(), Input, true);

  const xBox: { width: number; height: number; x: number; y: number } =
    yield* runScriptInXToolStudio(getXBoundingBox(), Runtime, true);
  yield* cdpClickOn(xBox.x + xBox.width / 2, xBox.y + xBox.height / 2, Input);
  yield* cdpTypeIn(x.toString(), Input, true);

  const yBox: { width: number; height: number; x: number; y: number } =
    yield* runScriptInXToolStudio(getYBoundingBox(), Runtime, true);
  yield* cdpClickOn(yBox.x + yBox.width / 2, yBox.y + yBox.height / 2, Input);
  yield* cdpTypeIn(y.toString(), Input, true);

  yield* Effect.sleep(Duration.millis(500));

  yield* clearXToolSelection({ Runtime, Input });
});

type SolderMaskSide = "front" | "back";

const solderMaskSideConfig = {
  front: {
    label: "front",
    fileSuffix: "F_Mask",
    boundsTaskId: "get-front-bounds",
    importTaskId: "import-front-solder-mask",
  },
  back: {
    label: "back",
    fileSuffix: "B_Mask",
    boundsTaskId: "get-back-bounds",
    importTaskId: "import-back-solder-mask",
  },
} as const satisfies Record<
  SolderMaskSide,
  {
    label: string;
    fileSuffix: string;
    boundsTaskId: string;
    importTaskId: string;
  }
>;

const getSolderMaskBounds = Effect.fn(
  "flatmaxx.createXtoolProjects.getSolderMaskBounds",
)(function* (
  projectPath: string,
  pcbName: string,
  side: SolderMaskSide,
  modifyTaskChild: ModifyTaskChild,
) {
  const fs = yield* FileSystem.FileSystem;
  const config = solderMaskSideConfig[side];

  yield* modifyTaskChild("create-solder-mask-project", config.boundsTaskId, {
    state: "loading",
    label: `Getting ${config.label} solder mask bounds...`,
    status: `Reading ${config.fileSuffix} DXF file...`,
  });
  const dxfFile = yield* fs.readFileString(
    resolve(projectPath, "..", "dxf", `${pcbName}-${config.fileSuffix}.dxf`),
  );

  yield* modifyTaskChild("create-solder-mask-project", config.boundsTaskId, {
    state: "loading",
    label: `Getting ${config.label} solder mask bounds...`,
    status: `Parsing ${config.fileSuffix} DXF file...`,
  });
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfFile);
  if (!dxf) {
    yield* modifyTaskChild("create-solder-mask-project", config.boundsTaskId, {
      state: "error",
      label: `Getting ${config.label} solder mask bounds...`,
      status: `Failed to parse ${config.fileSuffix} DXF file.`,
    });
    return yield* Effect.fail(new Error("Failed to parse DXF file."));
  }

  yield* modifyTaskChild("create-solder-mask-project", config.boundsTaskId, {
    state: "loading",
    label: `Getting ${config.label} solder mask bounds...`,
    status: `${config.fileSuffix} DXF file parsed successfully.`,
  });

  const bounds = getDxfBounds(dxf);

  yield* modifyTaskChild("create-solder-mask-project", config.boundsTaskId, {
    state: "success",
    label: `Got ${bounds.width}x${bounds.height}mm ${config.label} bounds.`,
    status: "",
  });

  return bounds;
});

const importSolderMask = Effect.fn(
  "flatmaxx.createXtoolProjects.importSolderMask",
)(function* (
  projectPath: string,
  pcbName: string,
  side: SolderMaskSide,
  newProjectTarget: Client,
  modifyTaskChild: ModifyTaskChild,
  firstPasteOffsets: SolderMaskPasteOffsets,
  secondPasteOffsets: SolderMaskPasteOffsets,
) {
  const config = solderMaskSideConfig[side];
  const bounds = yield* getSolderMaskBounds(
    projectPath,
    pcbName,
    side,
    modifyTaskChild,
  );

  yield* modifyTaskChild("create-solder-mask-project", config.importTaskId, {
    state: "loading",
    label: `Importing ${config.label} solder mask...`,
    status: `Copying ${config.fileSuffix} PNG file to clipboard...`,
  });

  yield* runAppleScript(
    applescriptCopyFileToClipboard(
      resolve(projectPath, "..", "png", `${pcbName}-${config.fileSuffix}.png`),
    ),
  );

  yield* modifyTaskChild("create-solder-mask-project", config.importTaskId, {
    state: "loading",
    status: `Pasting ${config.fileSuffix} PNG file to xTool Studio (1/2)...`,
  });

  yield* pasteIntoXToolStudio(newProjectTarget, bounds, firstPasteOffsets);

  yield* modifyTaskChild("create-solder-mask-project", config.importTaskId, {
    state: "loading",
    status: `Pasting ${config.fileSuffix} PNG file to xTool Studio (2/2)...`,
  });

  yield* pasteIntoXToolStudio(newProjectTarget, bounds, secondPasteOffsets);

  yield* modifyTaskChild("create-solder-mask-project", config.importTaskId, {
    state: "success",
    label: `${config.label[0]?.toUpperCase()}${config.label.slice(1)} solder mask imported successfully.`,
    status: "",
  });
});

const importFrontSolderMask = Effect.fn(
  "flatmaxx.createXtoolProjects.importFrontSolderMask",
)(function* (
  projectPath: string,
  pcbName: string,
  newProjectTarget: Client,
  modifyTaskChild: ModifyTaskChild,
  offsetSecondToTheRightBy: number,
) {
  yield* importSolderMask(
    projectPath,
    pcbName,
    "front",
    newProjectTarget,
    modifyTaskChild,
    {},
    { right: offsetSecondToTheRightBy },
  );
});

const importBackSolderMask = Effect.fn(
  "flatmaxx.createXtoolProjects.importBackSolderMask",
)(function* (
  projectPath: string,
  pcbName: string,
  newProjectTarget: Client,
  modifyTaskChild: ModifyTaskChild,
  offsetSecondToTheRightBy: number,
  offsetBackToTheBottomBy: number,
) {
  yield* importSolderMask(
    projectPath,
    pcbName,
    "back",
    newProjectTarget,
    modifyTaskChild,
    { bottom: offsetBackToTheBottomBy },
    { right: offsetSecondToTheRightBy, bottom: offsetBackToTheBottomBy },
  );
});

const configureSettingsForSolderMask = Effect.fn(
  "flatmaxx.createXtoolProjects.configureSettingsForSolderMask",
)(function* (
  { Runtime, Input }: Pick<Client, "Runtime" | "Input">,
  _modifyTaskChild: ModifyTaskChild,
) {
  const { x, y, width, height }: RectBounds = yield* runScriptInXToolStudio(
    getParameterOverviewItemBox(),
    Runtime,
    true,
  );
  yield* cdpClickOn(x + width / 2, y + height / 2, Input);

  yield* Effect.sleep(Duration.millis(500));

  const {
    x: intensityX,
    y: intensityY,
    width: intensityWidth,
    height: intensityHeight,
  }: RectBounds = yield* runScriptInXToolStudio(
    getIntensitySpanBox(),
    Runtime,
    true,
  );
  yield* cdpClickOn(
    intensityX + intensityWidth / 2,
    intensityY + intensityHeight / 2,
    Input,
  );
  yield* cdpTypeIn("100", Input, true);

  yield* Effect.sleep(Duration.millis(500));

  const {
    x: passesX,
    y: passesY,
    width: passesWidth,
    height: passesHeight,
  }: RectBounds = yield* runScriptInXToolStudio(
    getPassesSpanBox(),
    Runtime,
    true,
  );
  yield* cdpClickOn(
    passesX + passesWidth / 2,
    passesY + passesHeight / 2,
    Input,
  );
  yield* cdpTypeIn("3", Input, true);

  yield* Effect.sleep(Duration.millis(500));

  yield* clearXToolSelection({ Runtime, Input });

  yield* Effect.sleep(Duration.millis(500));
});

const createSolderMaskProject = Effect.fn(
  "flatmaxx.createXtoolProjects.createSolderMaskProject",
)(function* (
  desiredAbsolutePath: string,
  pcbName: string,
  modifyTaskChild: ModifyTaskChild,
  offsetSecondToTheRightBy: number,
  offsetBackToTheBottomBy: number,
) {
  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    state: "loading",
    label: "Creating project in existing xTool Studio session...",
  });
  const newProjectTarget = yield* createNewXtoolProject(modifyTaskChild);

  yield* modifyTaskChild("create-solder-mask-project", "create-new-project", {
    state: "loading",
    label: "Creating project in existing xTool Studio session...",
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

  yield* importBackSolderMask(
    desiredAbsolutePath,
    pcbName,
    newProjectTarget,
    modifyTaskChild,
    offsetSecondToTheRightBy,
    offsetBackToTheBottomBy,
  );

  yield* configureSettingsForSolderMask(
    { Runtime: newProjectTarget.Runtime, Input: newProjectTarget.Input },
    modifyTaskChild,
  );

  yield* saveXtoolProjectAndClose(
    desiredAbsolutePath,
    pcbName,
    "solderMask",
    newProjectTarget,
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
            id: "create-solder-mask-project",
            label: "Create solder mask project.",
            state: "pending",
          },
        ],
        "Step 2: Create xTool projects",
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
          label: "Creating project in existing xTool Studio session...",
          state: "pending",
        },
        {
          id: "get-front-bounds",
          label: "Getting front solder mask bounds...",
          state: "pending",
        },
        {
          id: "import-front-solder-mask",
          label: "Importing front solder mask...",
          state: "pending",
        },
        {
          id: "get-back-bounds",
          label: "Getting back solder mask bounds...",
          state: "pending",
        },
        {
          id: "import-back-solder-mask",
          label: "Importing back solder mask...",
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
    ).pipe(
      Effect.tapError((error) =>
        patchTask("create-solder-mask-project", {
          state: "error",
          label: "Failed to create solder mask project.",
          output: error instanceof Error ? error.message : String(error),
        }),
      ),
    );

    yield* patchTask("create-solder-mask-project", {
      state: "success",
      label: "Solder mask project created.",
      status: "",
    });
  },
);
