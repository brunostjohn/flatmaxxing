import { xToolTaskPaths } from "../tasks";
import type { SolderMaskSide } from "./types";

export const solderMaskSideConfig = {
  front: {
    label: "front",
    fileSuffix: "F_Mask",
    taskPaths: xToolTaskPaths.frontMask,
  },
  back: {
    label: "back",
    fileSuffix: "B_Mask",
    taskPaths: xToolTaskPaths.backMask,
  },
} as const satisfies Record<
  SolderMaskSide,
  {
    label: string;
    fileSuffix: string;
    taskPaths: typeof xToolTaskPaths.frontMask | typeof xToolTaskPaths.backMask;
  }
>;
