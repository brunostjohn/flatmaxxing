import { expect, test } from "bun:test";
import { getSolderPasteStencilOutputFilename } from "./getSolderPasteStencilOutputFilename";
import { solderPasteStencilSideConfig } from "./solderPasteStencilSideConfig";

test("maps paste stencil sides to KiCad paste DXF suffixes", () => {
	expect(solderPasteStencilSideConfig.front.fileSuffix).toBe("F_Paste");
	expect(solderPasteStencilSideConfig.back.fileSuffix).toBe("B_Paste");
});

test("uses layer suffixes for paste stencil output files", () => {
	expect(getSolderPasteStencilOutputFilename("valid_board", "front")).toBe(
		"valid_board-F_Paste.xs",
	);
	expect(getSolderPasteStencilOutputFilename("valid_board", "back")).toBe(
		"valid_board-B_Paste.xs",
	);
});
