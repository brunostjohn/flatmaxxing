/**
 * Bun worker entry for off-main-thread DXF geometry computation.
 *
 * Measuring DXF bounds solves cubic-Bézier extrema for splines (see
 * geometry/cubicBezierBounds) and walks every entity — CPU-bound work that runs
 * here so the main event loop stays responsive. The parsed DXF (plain data from
 * dxf-parser, structured-cloneable) is passed in; the pure functions are
 * unchanged and remain directly unit-tested.
 */
import type { IDxf } from "dxf-parser";
import { getDxfBounds } from "@/stages/xtool/geometry";
import { hasPlottableDxfGeometry } from "@/stages/xtool/workflow/hasPlottableDxfGeometry";

export type DxfWorkerRequest = {
  readonly op: "bounds" | "plottable";
  readonly dxf: IDxf;
};

export type DxfWorkerResponse =
  | {
      readonly ok: true;
      readonly result: { width: number; height: number } | boolean;
    }
  | { readonly ok: false; readonly error: string };

declare const self: {
  onmessage: ((event: MessageEvent<DxfWorkerRequest>) => void) | null;
  postMessage: (message: DxfWorkerResponse) => void;
};

self.onmessage = (event) => {
  const { op, dxf } = event.data;
  try {
    const result =
      op === "plottable" ? hasPlottableDxfGeometry(dxf) : getDxfBounds(dxf);
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
