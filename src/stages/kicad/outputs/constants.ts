import type { KicadOutputOptions, Side } from "@/config";
import type { SideConfigEntry } from "@/stages/kicad/outputs/types";

export const solderMaskPngZoom = 25;
export const boardImagePngZoom = 2;
export const boardImageLayers = "B.Cu,B.Mask,F.Cu,F.Mask,Edge.Cuts";

export const defaultKicadOutputOptions: KicadOutputOptions = {
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

export const sideConfig = {
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
} as const satisfies Record<Side, SideConfigEntry>;
