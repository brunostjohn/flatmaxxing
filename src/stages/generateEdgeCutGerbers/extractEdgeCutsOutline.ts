import type { Coordinate, PathCmd } from "@/geometry/gerberWriter";
import {
	angleOf,
	circleFromThreePoints,
	isAngleBetweenClockwise,
} from "@/stages/boardValidation/kicadBoardBounds";
import {
	collectEdgeCutPrimitives,
	type EdgeCutArc,
	type EdgeCutPrimitive,
} from "@/stages/boardValidation/edgeCutsTraversal";
import type { KicadPcb } from "kicadts";

/** Raised when the board lacks a `setup.aux_axis_origin` to anchor the Gerber. */
export class MissingAuxAxisOriginError extends Error {
	override readonly name = "MissingAuxAxisOriginError";
}

/** Raised when the Edge.Cuts geometry cannot be walked into a closed outline. */
export class EdgeCutsOutlineError extends Error {
	override readonly name = "EdgeCutsOutlineError";
}

/** An ordered, closed outline ready for {@link renderGerberOutline}. */
export interface Outline {
	readonly start: Coordinate;
	readonly cmds: PathCmd[];
}

/**
 * Endpoint match tolerance (mm). KiCad writes Edge.Cuts vertices to 6 dp; two
 * primitives "meet" when their endpoints agree to well within a micron.
 */
const JOIN_TOLERANCE_MM = 1e-3;

/** Cubic-Bézier flattening tolerance (mm) — max chord deviation per segment. */
const BEZIER_TOLERANCE_MM = 0.01;

/**
 * Build the affine map from KiCad board millimetres to Gerber millimetres. KiCad
 * gerbers are emitted relative to the auxiliary axis origin with Y flipped (KiCad
 * Y grows downward, Gerber Y grows upward): `gx = x - auxX`, `gy = auxY - y`.
 *
 * THROWS {@link MissingAuxAxisOriginError} if the board has no `aux_axis_origin`.
 * There is deliberately no silent identity fallback: without the origin the
 * outline would be offset (and un-mirrored) off the stock, ruining registration.
 */
export const kicadToGerberTransform = (
	pcb: KicadPcb,
): ((point: Coordinate) => Coordinate) => {
	const origin = pcb.setup?.auxAxisOrigin;
	if (!origin) {
		throw new MissingAuxAxisOriginError(
			"The board has no setup.aux_axis_origin; cannot place the edge-cut Gerber. " +
				"Set the drill/place origin in KiCad (Place > Drill/Place File Origin) before exporting.",
		);
	}

	const auxX = origin.x;
	const auxY = origin.y;
	return (point) => ({ x: point.x - auxX, y: auxY - point.y });
};

/**
 * Apply a point transform to every coordinate of an outline. If the transform is
 * orientation-reversing (e.g. {@link kicadToGerberTransform}'s Y-flip), arc
 * winding is inverted so `cw` still describes the geometry in the *transformed*
 * frame — without this the Gerber would emit G02 where G03 is needed and the
 * rounded corners would bulge the wrong way.
 */
export const transformOutline = (
	outline: Outline,
	transform: (point: Coordinate) => Coordinate,
): Outline => {
	const flipWinding = isOrientationReversing(transform);
	return {
		start: transform(outline.start),
		cmds: outline.cmds.map((cmd) =>
			cmd.kind === "line"
				? { kind: "line", to: transform(cmd.to) }
				: {
						kind: "arc",
						to: transform(cmd.to),
						center: transform(cmd.center),
						cw: flipWinding ? !cmd.cw : cmd.cw,
					},
		),
	};
};

/**
 * Numerically test whether an affine point transform reverses orientation, by
 * the sign of its Jacobian determinant sampled around the origin. A Y-flip
 * (det < 0) is orientation-reversing and inverts arc winding.
 */
const isOrientationReversing = (
	transform: (point: Coordinate) => Coordinate,
): boolean => {
	const o = transform({ x: 0, y: 0 });
	const ux = transform({ x: 1, y: 0 });
	const uy = transform({ x: 0, y: 1 });
	const ax = ux.x - o.x;
	const ay = ux.y - o.y;
	const bx = uy.x - o.x;
	const by = uy.y - o.y;
	const determinant = ax * by - ay * bx;
	return determinant < 0;
};

/**
 * Extract the board's TRUE Edge.Cuts outline as an ordered, closed loop of line
 * segments and arcs (cubic Béziers flattened to short segments). Coordinates are
 * in KiCad board millimetres — apply {@link kicadToGerberTransform} before
 * writing the Gerber.
 *
 * The walk reuses the shared {@link collectEdgeCutPrimitives} traversal (so it
 * sees footprint edge cuts with their transforms too), converts each primitive
 * into one or more directed {@link Edge}s, then chains them end-to-end into a
 * single connected loop. Full circles and degenerate zero-length primitives are
 * excluded (KiCad emits a tiny `gr_circle` as the aux-origin marker, which is not
 * part of the profile).
 */
export const collectEdgeCutsPrimitives = (pcb: KicadPcb): Outline => {
	const primitives = collectEdgeCutPrimitives(pcb);
	const edges = primitives.flatMap(toEdges);

	if (edges.length === 0) {
		throw new EdgeCutsOutlineError(
			"No connectable Edge.Cuts geometry was found to build a board outline.",
		);
	}

	return chainIntoLoop(edges);
};

/**
 * A directed piece of the outline: a single line or arc move from `start` to
 * `end`. A flattened Bézier yields several line edges; an arc yields one arc
 * edge carrying the centre and winding the Gerber writer needs.
 */
type Edge =
	| {
			readonly kind: "line";
			readonly start: Coordinate;
			readonly end: Coordinate;
	  }
	| {
			readonly kind: "arc";
			readonly start: Coordinate;
			readonly end: Coordinate;
			readonly center: Coordinate;
			readonly cw: boolean;
	  };

const samePoint = (a: Coordinate, b: Coordinate): boolean =>
	Math.hypot(a.x - b.x, a.y - b.y) <= JOIN_TOLERANCE_MM;

const isZeroLength = (a: Coordinate, b: Coordinate): boolean =>
	Math.hypot(a.x - b.x, a.y - b.y) <= JOIN_TOLERANCE_MM;

const toEdges = (primitive: EdgeCutPrimitive): Edge[] => {
	switch (primitive.kind) {
		case "segment":
			return isZeroLength(primitive.start, primitive.end)
				? []
				: [{ kind: "line", start: primitive.start, end: primitive.end }];
		case "arc":
			return arcToEdge(primitive);
		case "curve":
			return flattenCurve(primitive.controlPoints);
		case "poly":
			return polyToEdges(primitive.points);
		case "rect":
			// A rect is a closed loop on its own; treat its four sides as edges so
			// a board outlined by a single gr_rect still chains.
			return rectToEdges(primitive.start, primitive.end, primitive.transform);
		case "circle":
			// A full circle is its own closed contour; it never chains with the
			// connected board outline, so it is excluded here (and the tiny KiCad
			// aux-origin marker circle is correctly ignored).
			return [];
	}
};

const arcToEdge = (arc: EdgeCutArc): Edge[] => {
	if (isZeroLength(arc.start, arc.end)) return [];

	const circle = circleFromThreePoints(arc.start, arc.mid, arc.end);
	if (!circle) {
		// Collinear / degenerate: fall back to a straight chord.
		return [{ kind: "line", start: arc.start, end: arc.end }];
	}

	// Winding: KiCad arcs go start -> mid -> end. If sweeping clockwise from
	// start passes through mid before end, the arc is clockwise.
	const startAngle = angleOf(circle.center, arc.start);
	const midAngle = angleOf(circle.center, arc.mid);
	const endAngle = angleOf(circle.center, arc.end);
	const cw = isAngleBetweenClockwise(midAngle, startAngle, endAngle);

	return [
		{
			kind: "arc",
			start: arc.start,
			end: arc.end,
			center: circle.center,
			cw,
		},
	];
};

const polyToEdges = (points: readonly Coordinate[]): Edge[] => {
	const edges: Edge[] = [];
	for (let i = 0; i + 1 < points.length; i++) {
		const a = points[i]!;
		const b = points[i + 1]!;
		if (!isZeroLength(a, b)) edges.push({ kind: "line", start: a, end: b });
	}
	// gr_poly is implicitly closed: connect last back to first.
	const first = points[0];
	const last = points[points.length - 1];
	if (first && last && !isZeroLength(first, last)) {
		edges.push({ kind: "line", start: last, end: first });
	}
	return edges;
};

const rectToEdges = (
	start: Coordinate,
	end: Coordinate,
	transform: (point: Coordinate) => Coordinate,
): Edge[] => {
	const corners = [
		transform(start),
		transform({ x: end.x, y: start.y }),
		transform(end),
		transform({ x: start.x, y: end.y }),
	];
	const edges: Edge[] = [];
	for (let i = 0; i < corners.length; i++) {
		const a = corners[i]!;
		const b = corners[(i + 1) % corners.length]!;
		if (!isZeroLength(a, b)) edges.push({ kind: "line", start: a, end: b });
	}
	return edges;
};

const flattenCurve = (controlPoints: readonly Coordinate[]): Edge[] => {
	if (controlPoints.length !== 4) {
		// Not a cubic: connect the control points as a polyline (rare).
		return polyToEdges(controlPoints);
	}
	const [p0, p1, p2, p3] = controlPoints as [
		Coordinate,
		Coordinate,
		Coordinate,
		Coordinate,
	];

	const flat = flattenCubicAdaptive(p0, p1, p2, p3, BEZIER_TOLERANCE_MM);
	const edges: Edge[] = [];
	for (let i = 0; i + 1 < flat.length; i++) {
		const a = flat[i]!;
		const b = flat[i + 1]!;
		if (!isZeroLength(a, b)) edges.push({ kind: "line", start: a, end: b });
	}
	return edges;
};

const cubicAt = (
	p0: Coordinate,
	p1: Coordinate,
	p2: Coordinate,
	p3: Coordinate,
	t: number,
): Coordinate => {
	const u = 1 - t;
	const w0 = u * u * u;
	const w1 = 3 * u * u * t;
	const w2 = 3 * u * t * t;
	const w3 = t * t * t;
	return {
		x: w0 * p0.x + w1 * p1.x + w2 * p2.x + w3 * p3.x,
		y: w0 * p0.y + w1 * p1.y + w2 * p2.y + w3 * p3.y,
	};
};

/**
 * Flatten a cubic Bézier into a polyline whose chords deviate from the true curve
 * by at most `tolerance` mm. Uniform subdivision sized from the control-point
 * span — simple, deterministic, and more than fine for board outlines.
 */
const flattenCubicAdaptive = (
	p0: Coordinate,
	p1: Coordinate,
	p2: Coordinate,
	p3: Coordinate,
	tolerance: number,
): Coordinate[] => {
	// Upper bound on the second derivative magnitude gives a segment count that
	// guarantees the flatness tolerance (de Casteljau flatness criterion).
	const ax = p0.x - 2 * p1.x + p2.x;
	const ay = p0.y - 2 * p1.y + p2.y;
	const bx = p1.x - 2 * p2.x + p3.x;
	const by = p1.y - 2 * p2.y + p3.y;
	const maxSecond = 6 * Math.max(Math.hypot(ax, ay), Math.hypot(bx, by));

	let segments = 1;
	if (maxSecond > 0) {
		segments = Math.ceil(Math.sqrt(maxSecond / (8 * tolerance)));
	}
	segments = Math.max(1, Math.min(segments, 256));

	const points: Coordinate[] = [];
	for (let i = 0; i <= segments; i++) {
		points.push(cubicAt(p0, p1, p2, p3, i / segments));
	}
	return points;
};

/**
 * Chain directed edges into one connected loop. Starts from the first edge and
 * repeatedly appends an unused edge whose endpoint touches the current frontier,
 * reversing it if necessary. Reports a clear error if the geometry doesn't form a
 * single closed loop (open ends, disjoint pieces).
 */
const chainIntoLoop = (edges: readonly Edge[]): Outline => {
	const remaining = [...edges];
	const ordered: Edge[] = [];

	const first = remaining.shift()!;
	ordered.push(first);
	let frontier = first.end;
	const loopStart = first.start;

	while (remaining.length > 0) {
		const index = remaining.findIndex(
			(edge) =>
				samePoint(edge.start, frontier) || samePoint(edge.end, frontier),
		);
		if (index === -1) {
			throw new EdgeCutsOutlineError(
				`Edge.Cuts outline is not a single closed loop: a gap remains at ` +
					`(${frontier.x.toFixed(3)}, ${frontier.y.toFixed(3)}). ` +
					`Check that the board outline has no breaks or stray Edge.Cuts segments.`,
			);
		}

		const [edge] = remaining.splice(index, 1) as [Edge];
		const oriented = samePoint(edge.start, frontier) ? edge : reverseEdge(edge);
		ordered.push(oriented);
		frontier = oriented.end;
	}

	if (!samePoint(frontier, loopStart)) {
		throw new EdgeCutsOutlineError(
			`Edge.Cuts outline does not close: it ends at ` +
				`(${frontier.x.toFixed(3)}, ${frontier.y.toFixed(3)}) but started at ` +
				`(${loopStart.x.toFixed(3)}, ${loopStart.y.toFixed(3)}).`,
		);
	}

	const cmds: PathCmd[] = ordered.map((edge) =>
		edge.kind === "line"
			? { kind: "line", to: edge.end }
			: { kind: "arc", to: edge.end, center: edge.center, cw: edge.cw },
	);
	// Force the final vertex to coincide exactly with the start so the contour is
	// numerically closed in the emitted Gerber.
	const last = cmds[cmds.length - 1];
	if (last) {
		cmds[cmds.length - 1] =
			last.kind === "line"
				? { kind: "line", to: loopStart }
				: { kind: "arc", to: loopStart, center: last.center, cw: last.cw };
	}

	return { start: loopStart, cmds };
};

const reverseEdge = (edge: Edge): Edge =>
	edge.kind === "line"
		? { kind: "line", start: edge.end, end: edge.start }
		: {
				kind: "arc",
				start: edge.end,
				end: edge.start,
				center: edge.center,
				// Reversing direction flips the winding.
				cw: !edge.cw,
			};
