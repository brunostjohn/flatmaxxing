import {
  collectEdgeCutPrimitives,
  type EdgeCutPrimitive,
} from "@/stages/kicad/board/edgeCutsTraversal";
import { EdgeCutsError } from "@/errors";
import { Array } from "effect";
import type { KicadPcb } from "kicadts";
import { chainIntoLoop } from "./chain";
import { toEdges } from "./edges";
import type { Outline } from "./types";

const hasCircle = (primitives: readonly EdgeCutPrimitive[]) =>
  primitives.some((primitive) => primitive.kind === "circle");

export const collectEdgeCutsPrimitives = (pcb: KicadPcb): Outline => {
  const primitives = collectEdgeCutPrimitives(pcb);
  const edges = Array.flatMap(primitives, toEdges);

  if (edges.length === 0) {
    throw new EdgeCutsError({
      message: hasCircle(primitives)
        ? "Edge.Cuts circles are not supported for edge-cut DXF generation; redraw the outline as arcs or segments."
        : "No connectable Edge.Cuts geometry was found to build a board outline.",
    });
  }

  return chainIntoLoop(edges);
};
