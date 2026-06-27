import { getDxfBounds } from "@/stages/xtool/geometry";
import { hasPlottableDxfGeometry } from "@/stages/xtool/workflow/hasPlottableDxfGeometry";
import type { DxfWorkerRequest, DxfWorkerResponse } from "./types";

declare const self: {
  onmessage: ((event: MessageEvent<DxfWorkerRequest>) => void) | null;
  postMessage: (message: DxfWorkerResponse) => void;
};

const compute = ({ op, dxf }: DxfWorkerRequest): DxfWorkerResponse => {
  try {
    const result =
      op === "plottable" ? hasPlottableDxfGeometry(dxf) : getDxfBounds(dxf);
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

self.onmessage = (event) => self.postMessage(compute(event.data));
