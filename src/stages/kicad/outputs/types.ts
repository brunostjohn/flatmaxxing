import type { KicadOutputOptions, Side } from "@/config";
import type { TasklistControls } from "@/inkHelpers";
import type { Effect } from "effect";

export interface SideConfigEntry {
  readonly label: string;
  readonly maskLayer: string;
  readonly pasteLayer: string;
  readonly maskFileSuffix: string;
  readonly placeSide: string;
  readonly placeSuffix: string;
}

export interface OutputPaths {
  readonly gerbers: string;
  readonly svg: string;
  readonly png: string;
  readonly dxf: string;
  readonly place: string;
}

export interface KicadOutputContext {
  readonly kicadCli: string;
  readonly project: string;
  readonly pcbFile: string;
  readonly boardFilename: string;
  readonly options: KicadOutputOptions;
  readonly outputPaths: OutputPaths;
  readonly enabledMaskLayers: string;
  readonly enabledPasteLayers: string;
  readonly shouldGenerateSolderMaskAssets: boolean;
  readonly tasks: TasklistControls;
}

export interface RunWithKicadOptions {
  readonly context: KicadOutputContext;
  readonly args: readonly string[];
  readonly onOutput: (output: string) => Effect.Effect<void>;
}

export interface PngTrimInfo {
  readonly width: number;
  readonly height: number;
}

export interface SvgToPngResult {
  readonly pngFile: string;
  readonly info: PngTrimInfo;
}

export interface GenerateKicadOutputsResult {
  readonly boardImagePngPath?: string | undefined;
}

export const sideSkipStatus = (
  enabledSides: readonly Side[],
  side: Side,
  workflow: "solderMask" | "stencil",
): string =>
  enabledSides.includes(side)
    ? `${workflow}.excludeSides includes ${side}`
    : `board.ignoreSide=${side}`;
