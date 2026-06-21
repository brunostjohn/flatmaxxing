import { expect, test } from "bun:test";
import type { TaskDef, TaskPath } from "@/inkHelpers";
import { xToolTaskPaths } from "./xToolTaskPaths";
import { xToolTasks } from "./xToolTasks";

const findTask = (
	tasks: readonly TaskDef[],
	[id, ...rest]: TaskPath,
): TaskDef | undefined => {
	const task = tasks.find((candidate) => candidate.id === id);
	if (!task || rest.length === 0) {
		return task;
	}

	return findTask(task.children ?? [], rest as unknown as TaskPath);
};

const collectPaths = (value: unknown): TaskPath[] => {
	if (
		Array.isArray(value) &&
		value.length > 0 &&
		value.every((item) => typeof item === "string")
	) {
		return [value as unknown as TaskPath];
	}

	if (!value || typeof value !== "object") {
		return [];
	}

	return Object.values(value).flatMap(collectPaths);
};

test("all xTool task path constants point at real task nodes", () => {
	const paths = collectPaths(xToolTaskPaths);

	expect(paths.length).toBeGreaterThan(0);

	for (const path of paths) {
		expect(findTask(xToolTasks, path), path.join(" > ")).toBeDefined();
	}
});

test("xTool lifecycle tasks run before project generation tasks", () => {
	expect(xToolTasks[0]?.id).toBe("xtool-studio-lifecycle");
	expect(xToolTasks[1]?.id).toBe("output-folder");
	expect(xToolTasks[2]?.id).toBe("solder-mask-project");

	expect(
		findTask(xToolTasks, xToolTaskPaths.lifecycle.checkExisting),
	).toBeDefined();
	expect(
		findTask(xToolTasks, xToolTaskPaths.lifecycle.confirmCloseExisting),
	).toBeDefined();
	expect(
		findTask(xToolTasks, xToolTaskPaths.lifecycle.waitExistingExit),
	).toBeDefined();
	expect(findTask(xToolTasks, xToolTaskPaths.lifecycle.launch)).toBeDefined();
	expect(findTask(xToolTasks, xToolTaskPaths.lifecycle.waitShell)).toBeDefined();
	expect(
		findTask(xToolTasks, xToolTaskPaths.lifecycle.waitCreateProjectButton),
	).toBeDefined();
	expect(findTask(xToolTasks, xToolTaskPaths.lifecycle.close)).toBeDefined();
});

test("solder mask project waits for the editor UI before M1 setup", () => {
	expect(findTask(xToolTasks, xToolTaskPaths.cdp.connectEditor)).toBeDefined();
	expect(
		findTask(xToolTasks, xToolTaskPaths.cdp.waitForEditorReady),
	).toBeDefined();
	expect(
		findTask(xToolTasks, xToolTaskPaths.device.selectM1Ultra),
	).toBeDefined();
});

test("paste stencil task branches include the fragile workflow steps", () => {
	for (const side of [
		xToolTaskPaths.pasteStencils.front,
		xToolTaskPaths.pasteStencils.back,
	]) {
		expect(findTask(xToolTasks, side.cdp.connectEditor)).toBeDefined();
		expect(findTask(xToolTasks, side.cdp.waitForEditorReady)).toBeDefined();
		expect(findTask(xToolTasks, side.device.selectF1Ultra)).toBeDefined();
		expect(findTask(xToolTasks, side.importDxf.validateDxf)).toBeDefined();
		expect(findTask(xToolTasks, side.importDxf.openImportMenu)).toBeDefined();
		expect(findTask(xToolTasks, side.importDxf.chooseDxfFile)).toBeDefined();
		expect(findTask(xToolTasks, side.importDxf.setX)).toBeDefined();
		expect(findTask(xToolTasks, side.importDxf.setY)).toBeDefined();
		expect(findTask(xToolTasks, side.settings.selectCut)).toBeDefined();
		expect(findTask(xToolTasks, side.settings.openLaserType)).toBeDefined();
		expect(findTask(xToolTasks, side.settings.selectFiberLaser)).toBeDefined();
		expect(findTask(xToolTasks, side.settings.setPower)).toBeDefined();
		expect(findTask(xToolTasks, side.settings.setSpeed)).toBeDefined();
		expect(findTask(xToolTasks, side.settings.setPasses)).toBeDefined();
		expect(findTask(xToolTasks, side.save.savePath)).toBeDefined();
	}
});
