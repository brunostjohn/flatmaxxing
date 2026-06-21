import type { IDxf } from "dxf-parser";
import { getDxfBounds } from "../geometry";

export function hasPlottableDxfGeometry(dxf: IDxf): boolean {
	try {
		const bounds = getDxfBounds(dxf);
		return bounds.width > 0 || bounds.height > 0;
	} catch (error) {
		if (
			error instanceof Error &&
			error.message === "No supported geometry found in DXF"
		) {
			return false;
		}

		throw error;
	}
}
