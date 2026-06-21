import { expect, test } from "bun:test";
import { summarizeFlatcamLog } from "./runFlatcam";

test("summarizes the latest meaningful FlatCAM activity, prefix stripped", () => {
	const log = [
		"[DEBUG][MainThread] TCL command 'TclCommandIsolate' executed.",
		"[DEBUG][MainThread] build_ui--> FlatCAMObj.build_ui()",
		"[DEBUG][Dummy-7] camlib.CNCJob.geometry_tool_gcode_gen() -> Generating GCode for tool: 8",
		"[DEBUG][MainThread] set_ui --> FlatCAMObj.to_form()",
	].join("\n");
	expect(summarizeFlatcamLog(log)).toBe("Generating GCode for tool: 8");
});

test("prefers progress lines over trailing noise", () => {
	const log = [
		"[WARNING][MainThread] Total number of polygons to be cleared. 47",
		"[DEBUG][MainThread] build_ui--> FlatCAMObj.build_ui()",
		"[DEBUG][MainThread] on_object_created()",
	].join("\n");
	expect(summarizeFlatcamLog(log)).toBe(
		"Total number of polygons to be cleared. 47",
	);
});

test("collapses a bare TCL-command line to the command name", () => {
	expect(
		summarizeFlatcamLog(
			"[DEBUG][MainThread] TCL command 'TclCommandCopperClear' executed.",
		),
	).toBe("TclCommandCopperClear");
});

test("returns undefined for an empty log", () => {
	expect(summarizeFlatcamLog("")).toBeUndefined();
});
