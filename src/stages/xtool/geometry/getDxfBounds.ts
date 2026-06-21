import type {
	IArcEntity,
	ICircleEntity,
	IDxf,
	IEllipseEntity,
	ILwpolylineEntity,
	IPointEntity,
	IPolylineEntity,
	ISplineEntity,
} from "dxf-parser";
import { addArc } from "./addArc";
import { addCircle } from "./addCircle";
import { addEllipse } from "./addEllipse";
import { addPoint } from "./addPoint";
import { addPolyline } from "./addPolyline";
import { addSpline } from "./addSpline";
import { addVertices } from "./addVertices";
import { emptyBox } from "./emptyBox";
import { hasBounds } from "./hasBounds";
import type { LineEntity } from "./types";

export function getDxfBounds(dxf: IDxf): { width: number; height: number } {
	const box = emptyBox();

	for (const e of dxf.entities ?? []) {
		switch (e.type) {
			case "LINE": {
				const line = e as LineEntity;

				addVertices(box, line.vertices);
				addPoint(box, line.start);
				addPoint(box, line.end);

				break;
			}

			case "LWPOLYLINE":
			case "POLYLINE": {
				const polyline = e as ILwpolylineEntity | IPolylineEntity;

				addPolyline(box, polyline.vertices, polyline.shape === true);
				break;
			}

			case "CIRCLE": {
				const circle = e as ICircleEntity;

				addCircle(box, circle.center, circle.radius);
				break;
			}

			case "ARC": {
				addArc(box, e as IArcEntity);
				break;
			}

			case "ELLIPSE": {
				addEllipse(box, e as IEllipseEntity);
				break;
			}

			case "SPLINE": {
				addSpline(box, e as ISplineEntity);
				break;
			}

			case "POINT": {
				const point = e as IPointEntity;

				addPoint(box, point.position);
				break;
			}

			default:
				// TEXT, HATCH, INSERT, etc ignored here.
				break;
		}
	}

	if (!hasBounds(box)) {
		throw new Error("No supported geometry found in DXF");
	}

	return {
		width: box.maxX - box.minX,
		height: box.maxY - box.minY,
	};
}
