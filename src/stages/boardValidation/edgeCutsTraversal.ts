import {
	At,
	PtsArc,
	type Footprint,
	type KicadPcb,
	type Layer,
	type Pts,
} from "kicadts";

export type Coordinate = {
	readonly x: number;
	readonly y: number;
};

export type PointTransform = (point: Coordinate) => Coordinate;

const GEOMETRY_EPSILON = 1e-9;

export type EdgeCutSegment = {
	readonly kind: "segment";
	readonly start: Coordinate;
	readonly end: Coordinate;
};

export type EdgeCutArc = {
	readonly kind: "arc";
	readonly start: Coordinate;
	readonly mid: Coordinate;
	readonly end: Coordinate;
};

export type EdgeCutCircle = {
	readonly kind: "circle";
	readonly center: Coordinate;
	readonly edge: Coordinate;
};

export type EdgeCutRect = {
	readonly kind: "rect";
	readonly start: Coordinate;
	readonly end: Coordinate;
	readonly transform: PointTransform;
};

export type EdgeCutCurve = {
	readonly kind: "curve";
	readonly controlPoints: readonly Coordinate[];
};

export type EdgeCutPoly = {
	readonly kind: "poly";
	readonly points: readonly Coordinate[];
};

export type EdgeCutPrimitive =
	| EdgeCutSegment
	| EdgeCutArc
	| EdgeCutCircle
	| EdgeCutRect
	| EdgeCutCurve
	| EdgeCutPoly;

const identityTransform: PointTransform = (point) => ({
	x: point.x,
	y: point.y,
});

const isEdgeCutsLayer = (layer: Layer | undefined): boolean =>
	layer?.names.includes("Edge.Cuts") ?? false;

const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const getFootprintTransform = (footprint: Footprint): PointTransform => {
	const position = footprint.position;
	if (!position) return identityTransform;

	const offset = { x: position.x, y: position.y };
	const angle = position instanceof At ? (position.angle ?? 0) : 0;

	if (Math.abs(angle) < GEOMETRY_EPSILON) {
		return (point) => ({ x: point.x + offset.x, y: point.y + offset.y });
	}

	const radians = degreesToRadians(angle);
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);

	return (point) => ({
		x: offset.x + point.x * cos - point.y * sin,
		y: offset.y + point.x * sin + point.y * cos,
	});
};

export const collectEdgeCutPrimitives = (pcb: KicadPcb): EdgeCutPrimitive[] => {
	const primitives: EdgeCutPrimitive[] = [];

	for (const line of pcb.graphicLines) {
		if (!isEdgeCutsLayer(line.layer)) continue;
		if (!line.startPoint || !line.endPoint) continue;
		primitives.push({
			kind: "segment",
			start: { x: line.startPoint.x, y: line.startPoint.y },
			end: { x: line.endPoint.x, y: line.endPoint.y },
		});
	}

	for (const rect of pcb.graphicRects) {
		if (!isEdgeCutsLayer(rect.layer)) continue;
		if (!rect.startPoint || !rect.endPoint) continue;
		primitives.push({
			kind: "rect",
			start: { x: rect.startPoint.x, y: rect.startPoint.y },
			end: { x: rect.endPoint.x, y: rect.endPoint.y },
			transform: identityTransform,
		});
	}

	for (const circle of pcb.graphicCircles) {
		if (!isEdgeCutsLayer(circle.layer)) continue;
		if (!circle.centerPoint || !circle.endPoint) continue;
		primitives.push({
			kind: "circle",
			center: { x: circle.centerPoint.x, y: circle.centerPoint.y },
			edge: { x: circle.endPoint.x, y: circle.endPoint.y },
		});
	}

	for (const arc of pcb.graphicArcs) {
		if (!isEdgeCutsLayer(arc.layer)) continue;
		if (!arc.startPoint || !arc.midPoint || !arc.endPoint) continue;
		primitives.push({
			kind: "arc",
			start: { x: arc.startPoint.x, y: arc.startPoint.y },
			mid: { x: arc.midPoint.x, y: arc.midPoint.y },
			end: { x: arc.endPoint.x, y: arc.endPoint.y },
		});
	}

	for (const poly of pcb.graphicPolys) {
		if (!isEdgeCutsLayer(poly.layer)) continue;
		collectPolyPoints(primitives, poly.points, identityTransform);
	}

	for (const curve of pcb.graphicCurves) {
		if (!isEdgeCutsLayer(curve.layer)) continue;
		collectCurve(primitives, curve.points, identityTransform);
	}

	for (const footprint of pcb.footprints) {
		const transform = getFootprintTransform(footprint);

		for (const line of footprint.fpLines) {
			if (!isEdgeCutsLayer(line.layer)) continue;
			if (!line.start || !line.end) continue;
			primitives.push({
				kind: "segment",
				start: transform({ x: line.start.x, y: line.start.y }),
				end: transform({ x: line.end.x, y: line.end.y }),
			});
		}

		for (const rect of footprint.fpRects) {
			if (!isEdgeCutsLayer(rect.layer)) continue;
			if (!rect.start || !rect.end) continue;
			primitives.push({
				kind: "rect",
				start: { x: rect.start.x, y: rect.start.y },
				end: { x: rect.end.x, y: rect.end.y },
				transform,
			});
		}

		for (const circle of footprint.fpCircles) {
			if (!isEdgeCutsLayer(circle.layer)) continue;
			if (!circle.center || !circle.end) continue;
			primitives.push({
				kind: "circle",
				center: transform({ x: circle.center.x, y: circle.center.y }),
				edge: transform({ x: circle.end.x, y: circle.end.y }),
			});
		}

		for (const arc of footprint.fpArcs) {
			if (!isEdgeCutsLayer(arc.layer)) continue;
			if (!arc.start || !arc.mid || !arc.end) continue;
			primitives.push({
				kind: "arc",
				start: transform({ x: arc.start.x, y: arc.start.y }),
				mid: transform({ x: arc.mid.x, y: arc.mid.y }),
				end: transform({ x: arc.end.x, y: arc.end.y }),
			});
		}

		for (const poly of footprint.fpPolys) {
			if (!isEdgeCutsLayer(poly.layer)) continue;
			collectPolyPoints(primitives, poly.points, transform);
		}

		for (const curve of footprint.fpCurves) {
			if (!isEdgeCutsLayer(curve.layer)) continue;
			collectCurve(primitives, curve.points, transform);
		}
	}

	return primitives;
};

const collectPolyPoints = (
	primitives: EdgeCutPrimitive[],
	pts: Pts | undefined,
	transform: PointTransform,
): void => {
	if (!pts) return;

	const straight: Coordinate[] = [];
	for (const point of pts.points) {
		if (point instanceof PtsArc) {
			if (point.start && point.mid && point.end) {
				primitives.push({
					kind: "arc",
					start: transform({ x: point.start.x, y: point.start.y }),
					mid: transform({ x: point.mid.x, y: point.mid.y }),
					end: transform({ x: point.end.x, y: point.end.y }),
				});
			}
			continue;
		}
		straight.push(transform({ x: point.x, y: point.y }));
	}

	if (straight.length > 0) {
		primitives.push({ kind: "poly", points: straight });
	}
};

const collectCurve = (
	primitives: EdgeCutPrimitive[],
	pts: Pts | undefined,
	transform: PointTransform,
): void => {
	if (!pts) return;

	const controlPoints: Coordinate[] = [];
	for (const point of pts.points) {
		if (point instanceof PtsArc) {
			if (point.start && point.mid && point.end) {
				primitives.push({
					kind: "arc",
					start: transform({ x: point.start.x, y: point.start.y }),
					mid: transform({ x: point.mid.x, y: point.mid.y }),
					end: transform({ x: point.end.x, y: point.end.y }),
				});
			}
			continue;
		}
		controlPoints.push(transform({ x: point.x, y: point.y }));
	}

	if (controlPoints.length > 0) {
		primitives.push({ kind: "curve", controlPoints });
	}
};
