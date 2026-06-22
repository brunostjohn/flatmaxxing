/**
 * A small, KiCad-aware Excellon (NC drill) parser.
 *
 * We parse our own files rather than lean on a generic gerber/drill library
 * because we need two things those tend to drop or normalise away:
 *   1. **Plating** — KiCad annotates each tool with a `TA.AperFunction` comment
 *      (`Plated,PTH,…` / `NonPlated,NPTH,…`) right before its `T<n>C<dia>` def, so
 *      one merged "MixedPlating" file carries PTH/NPTH per hole.
 *   2. **Slot geometry** — oval pads exported with `--excellon-oval-format route`
 *      become an explicit routed toolpath (`G00`→`M15`→`G01…`→`M16`), where the
 *      tool diameter is the slot *width* and the path is the slot centerline.
 *
 * The output is a flat list of holes (circles + slots) in millimetres, ready for
 * tool categorisation. Coordinates are assumed absolute decimal (KiCad's default
 * `--excellon-zeros-format decimal`); inch files are converted to mm on the way out.
 */

export type Plating = "PTH" | "NPTH" | "unknown";

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A plain drilled hole. */
export interface CircleHole {
  readonly kind: "circle";
  readonly plating: Plating;
  readonly diameter: number;
  readonly x: number;
  readonly y: number;
  /** Originating tool number, for diagnostics. */
  readonly tool: number;
}

/** A routed slot / oblong pad (oval drill in `route` format). */
export interface SlotHole {
  readonly kind: "slot";
  readonly plating: Plating;
  /** Slot width = the routing tool's diameter. */
  readonly width: number;
  /** Centerline polyline (≥ 2 points). */
  readonly path: readonly Point[];
  /** Overall slot length = centerline length + width (the rounded ends). */
  readonly length: number;
  readonly tool: number;
}

export type Hole = CircleHole | SlotHole;

export interface ParsedExcellon {
  readonly units: "metric" | "inch";
  readonly holes: readonly Hole[];
}

interface ToolDef {
  readonly diameter: number;
  readonly plating: Plating;
}

const TOOL_DEF = /^T(\d+)C([0-9.]+)/;
const TOOL_SELECT = /^T(\d+)\s*$/;
const LEADING_CODE = /^([GM])(\d+)/;
const X_COORD = /X(-?[0-9.]+)/;
const Y_COORD = /Y(-?[0-9.]+)/;

const platingFromComment = (comment: string): Plating => {
  // Order matters: "NonPlated" contains "Plated", and "NPTH" contains "PTH".
  if (/NonPlated|NPTH/.test(comment)) return "NPTH";
  if (/Plated|PTH/.test(comment)) return "PTH";
  return "unknown";
};

const polylineLength = (path: readonly Point[]): number => {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1]!;
    const b = path[i]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
};

/** Parse Excellon drill text into a flat, millimetre list of holes. */
export const parseExcellon = (text: string): ParsedExcellon => {
  const tools = new Map<number, ToolDef>();
  const holes: Hole[] = [];

  let units: "metric" | "inch" = "metric";
  let pendingPlating: Plating = "unknown";
  let currentTool: number | undefined;
  let lastX = 0;
  let lastY = 0;
  let inRoute = false;
  let routePath: Point[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "") continue;

    // Attribute / metadata comments carry the plating for the next tool def.
    if (line.startsWith(";")) {
      if (line.includes("TA.AperFunction")) {
        pendingPlating = platingFromComment(line);
      } else if (/\bTD\b/.test(line)) {
        pendingPlating = "unknown";
      }
      continue;
    }

    if (line === "METRIC" || line === "M71") {
      units = "metric";
      continue;
    }
    if (line === "INCH" || line === "M72") {
      units = "inch";
      continue;
    }

    const def = TOOL_DEF.exec(line);
    if (def) {
      tools.set(Number(def[1]), {
        diameter: Number(def[2]),
        plating: pendingPlating,
      });
      pendingPlating = "unknown";
      continue;
    }

    const xMatch = X_COORD.exec(line);
    const yMatch = Y_COORD.exec(line);
    const hasCoord = xMatch !== null || yMatch !== null;
    const x = xMatch ? Number(xMatch[1]) : lastX;
    const y = yMatch ? Number(yMatch[1]) : lastY;

    const code = LEADING_CODE.exec(line);
    if (code) {
      const letter = code[1];
      const num = Number(code[2]);

      if (letter === "M") {
        if (num === 15) {
          // Plunge: begin a routed slot at the current position.
          inRoute = true;
          routePath = [{ x: lastX, y: lastY }];
        } else if (num === 16) {
          // Retract: finalise the slot.
          if (inRoute && currentTool !== undefined) {
            const tool = tools.get(currentTool);
            if (tool && routePath.length >= 2) {
              holes.push({
                kind: "slot",
                plating: tool.plating,
                width: tool.diameter,
                path: routePath,
                length: polylineLength(routePath) + tool.diameter,
                tool: currentTool,
              });
            }
          }
          inRoute = false;
          routePath = [];
        }
        continue;
      }

      // G-codes.
      if (num === 0 || num === 1 || num === 2 || num === 3) {
        // Rapid (G00) positions; G01/02/03 cut. Both update position; a cut
        // inside a route appends to the centerline.
        if (hasCoord) {
          if (inRoute && num !== 0) routePath.push({ x, y });
          lastX = x;
          lastY = y;
        }
        continue;
      }
      // G05 carrying coordinates is a drill hit; otherwise (G90/G05 alone…) ignore.
      if (num === 5 && hasCoord && currentTool !== undefined) {
        const tool = tools.get(currentTool);
        if (tool) {
          holes.push({
            kind: "circle",
            plating: tool.plating,
            diameter: tool.diameter,
            x,
            y,
            tool: currentTool,
          });
        }
        lastX = x;
        lastY = y;
      }
      continue;
    }

    const select = TOOL_SELECT.exec(line);
    if (select) {
      const t = Number(select[1]);
      currentTool = t === 0 ? undefined : t;
      continue;
    }

    // A bare coordinate line is a canned drill hit at the selected tool.
    if (hasCoord) {
      if (currentTool !== undefined) {
        const tool = tools.get(currentTool);
        if (tool) {
          holes.push({
            kind: "circle",
            plating: tool.plating,
            diameter: tool.diameter,
            x,
            y,
            tool: currentTool,
          });
        }
      }
      lastX = x;
      lastY = y;
    }
    // Everything else (M48, FMAT,2, %, G90 …) is structural — ignore.
  }

  if (units === "inch") {
    return { units, holes: holes.map(scaleHoleToMm) };
  }
  return { units, holes };
};

const IN_TO_MM = 25.4;

const scaleHoleToMm = (hole: Hole): Hole => {
  if (hole.kind === "circle") {
    return {
      ...hole,
      diameter: hole.diameter * IN_TO_MM,
      x: hole.x * IN_TO_MM,
      y: hole.y * IN_TO_MM,
    };
  }
  const path = hole.path.map((p) => ({ x: p.x * IN_TO_MM, y: p.y * IN_TO_MM }));
  return {
    ...hole,
    width: hole.width * IN_TO_MM,
    path,
    length: polylineLength(path) + hole.width * IN_TO_MM,
  };
};
