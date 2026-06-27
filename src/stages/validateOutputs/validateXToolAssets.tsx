import type { Side, XToolProjectOptions } from "@/config";
import { DxfError } from "@/errors";
import {
  createTasklist,
  markTaskBranch,
  nextStep,
  type TaskDef,
} from "@/inkHelpers";
import {
  dxfBoundsFile,
  dxfFileHasPlottableGeometry,
  getSolderMaskDxfPath,
  getSolderMaskPngPath,
  getSolderPasteStencilDxfPath,
  solderMaskSideConfig,
  solderPasteStencilSideConfig,
} from "@/stages/xtool";
import { Effect, FileSystem, Path } from "effect";

const sides: readonly Side[] = ["front", "back"];

const validateXToolAssetTasks: TaskDef[] = [
  {
    id: "solder-mask-assets",
    label: "Validate solder mask assets",
    state: "pending",
    children: [
      {
        id: "front",
        label: "Validate front solder mask assets",
        state: "pending",
        children: [
          { id: "dxf", label: "Validate front mask DXF", state: "pending" },
          { id: "png", label: "Validate front mask PNG", state: "pending" },
        ],
      },
      {
        id: "back",
        label: "Validate back solder mask assets",
        state: "pending",
        children: [
          { id: "dxf", label: "Validate back mask DXF", state: "pending" },
          { id: "png", label: "Validate back mask PNG", state: "pending" },
        ],
      },
    ],
  },
  {
    id: "stencil-assets",
    label: "Validate solder paste stencil assets",
    state: "pending",
    children: [
      {
        id: "front",
        label: "Validate front stencil DXF",
        state: "pending",
        children: [
          { id: "dxf", label: "Validate front paste DXF", state: "pending" },
        ],
      },
      {
        id: "back",
        label: "Validate back stencil DXF",
        state: "pending",
        children: [
          { id: "dxf", label: "Validate back paste DXF", state: "pending" },
        ],
      },
    ],
  },
];

const ensureFileExists = Effect.fn("flatmaxx.validate.ensureFileExists")(
  function* (path: string) {
    const fs = yield* FileSystem.FileSystem;

    if (!(yield* fs.exists(path))) {
      return yield* Effect.fail(
        new DxfError({ message: `Missing required file: ${path}` }),
      );
    }

    return path;
  },
);

export const validateSolderMaskAssetsForSide = Effect.fn(
  "flatmaxx.validate.solderMaskAssetsForSide",
)(function* (xtoolProjectPath: string, pcbName: string, side: Side) {
  const dxfPath = yield* getSolderMaskDxfPath(xtoolProjectPath, pcbName, side);
  const pngPath = yield* getSolderMaskPngPath(xtoolProjectPath, pcbName, side);
  const bounds = yield* dxfBoundsFile(dxfPath);
  yield* ensureFileExists(pngPath);
  return { dxfPath, pngPath, bounds };
});

export const validateStencilAssetsForSide = Effect.fn(
  "flatmaxx.validate.stencilAssetsForSide",
)(function* (xtoolProjectPath: string, pcbName: string, side: Side) {
  const dxfPath = yield* getSolderPasteStencilDxfPath(
    xtoolProjectPath,
    pcbName,
    side,
  );
  const hasPlottableGeometry = yield* dxfFileHasPlottableGeometry(dxfPath);
  return { dxfPath, hasPlottableGeometry };
});

export const validateXToolAssets = Effect.fn("flatmaxx.validate.xToolAssets")(
  function* (
    projectPath: string,
    pcbName: string,
    options: XToolProjectOptions,
  ) {
    const path = yield* Path.Path;

    const title = options.enabled
      ? `Step ${nextStep()}: Validate xTool assets`
      : "Validate xTool assets (skipped)";

    const tasks = yield* createTasklist(validateXToolAssetTasks, title);
    const xtoolProjectPath = path.resolve(projectPath, options.outputPath);

    const skipBranch = (
      branch: string | readonly [string, ...string[]],
      label: string,
      status: string,
    ) =>
      markTaskBranch(tasks, validateXToolAssetTasks, branch, {
        state: "success",
        label,
        status,
        childStatus: status,
      });

    if (!options.enabled) {
      yield* skipBranch(
        "solder-mask-assets",
        "Solder mask asset validation skipped.",
        options.solderMask.skipReason ?? "solderMask disabled.",
      );
      yield* skipBranch(
        "stencil-assets",
        "Stencil asset validation skipped.",
        options.stencil.skipReason ?? "stencil disabled.",
      );
      return;
    }

    const validateSolderMaskSide = Effect.fn(
      "flatmaxx.validate.xToolAssets.solderMaskSide",
    )(function* (side: Side) {
      const config = solderMaskSideConfig[side];
      const root = ["solder-mask-assets", side] as const;

      if (
        !options.solderMask.enabled ||
        !options.solderMask.sides.includes(side)
      ) {
        const status =
          options.solderMask.sideSkipStatus[side] ??
          options.solderMask.skipReason ??
          `${config.label} solder mask disabled.`;
        yield* skipBranch(root, `${config.label} solder mask skipped.`, status);
        return;
      }

      yield* tasks.patchTask(root, {
        state: "loading",
        status: `Validating ${config.fileSuffix} assets...`,
      });

      const dxfPath = yield* getSolderMaskDxfPath(
        xtoolProjectPath,
        pcbName,
        side,
      );
      const bounds = yield* tasks.runTask({
        path: [...root, "dxf"] as const,
        effect: dxfBoundsFile(dxfPath),
        loading: { status: `Parsing and measuring ${dxfPath}...` },
        success: { label: `${config.fileSuffix} DXF parsed and measured.` },
        error: { label: `Failed to validate ${config.fileSuffix} DXF.` },
      });

      const pngPath = yield* getSolderMaskPngPath(
        xtoolProjectPath,
        pcbName,
        side,
      );
      yield* tasks.runTask({
        path: [...root, "png"] as const,
        effect: ensureFileExists(pngPath),
        loading: { status: `Checking ${pngPath} exists...` },
        success: { label: `${config.fileSuffix} PNG exists.` },
        error: { label: `Missing ${config.fileSuffix} PNG.` },
      });

      yield* tasks.patchTask(root, {
        state: "success",
        label: `${config.label} solder mask assets valid.`,
        status: `${bounds.width.toFixed(3)}mm x ${bounds.height.toFixed(3)}mm`,
      });
    });

    const validateStencilSide = Effect.fn(
      "flatmaxx.validate.xToolAssets.stencilSide",
    )(function* (side: Side) {
      const config = solderPasteStencilSideConfig[side];
      const root = ["stencil-assets", side] as const;

      if (!options.stencil.enabled || !options.stencil.sides.includes(side)) {
        const status =
          options.stencil.sideSkipStatus[side] ??
          options.stencil.skipReason ??
          `${config.label} stencil disabled.`;
        yield* skipBranch(root, `${config.label} stencil skipped.`, status);
        return;
      }

      yield* tasks.patchTask(root, {
        state: "loading",
        status: `Validating ${config.fileSuffix} DXF...`,
      });

      const dxfPath = yield* getSolderPasteStencilDxfPath(
        xtoolProjectPath,
        pcbName,
        side,
      );
      const hasPlottableGeometry = yield* tasks.runTask({
        path: [...root, "dxf"] as const,
        effect: dxfFileHasPlottableGeometry(dxfPath),
        loading: { status: `Checking ${dxfPath} for plottable geometry...` },
        success: { label: `${config.fileSuffix} DXF checked.` },
        error: { label: `Failed to validate ${config.fileSuffix} DXF.` },
      });

      yield* tasks.patchTask(root, {
        state: "success",
        label: hasPlottableGeometry
          ? `${config.label} stencil DXF has plottable objects.`
          : `${config.label} stencil DXF is empty; stencil import would skip.`,
        status: dxfPath,
      });
    });

    if (!options.solderMask.enabled) {
      yield* skipBranch(
        "solder-mask-assets",
        "Solder mask asset validation skipped.",
        options.solderMask.skipReason ?? "solderMask disabled.",
      );
    } else {
      yield* Effect.forEach(sides, validateSolderMaskSide);
      yield* tasks.patchTask("solder-mask-assets", {
        state: "success",
        label: "Solder mask assets valid.",
      });
    }

    if (!options.stencil.enabled) {
      yield* skipBranch(
        "stencil-assets",
        "Stencil asset validation skipped.",
        options.stencil.skipReason ?? "stencil disabled.",
      );
    } else {
      yield* Effect.forEach(sides, validateStencilSide);
      yield* tasks.patchTask("stencil-assets", {
        state: "success",
        label: "Solder paste stencil assets valid.",
      });
    }
  },
);
