import {
	axFind,
	clickAt,
	clickElement,
	doubleClickAt,
	elementExists,
	ensureFrontmost,
	goToPath,
	mouseMove,
	mouseScroll,
	performAction,
	pressElement,
	pressKeyCode,
	pressReturn,
	rightClickAt,
	setElementValue,
	typeText,
	waitForElement,
	waitForGone,
} from "@/macos";
import type { AxElementInfo as AxElement } from "@flatmaxxing/accessibility";
import { Duration, Effect } from "effect";
import { basename } from "node:path";
import { MAKERACAM_PROCESS } from "./process";
import { magazineCategoryFor } from "./selectStepDrills";
import type { ToolpathKind } from "./types";

export const MAKERACAM_APP = MAKERACAM_PROCESS;

const SETTLE = Duration.millis(400);

export const dismissUpdateNag = Effect.fn(
	"flatmaxx.makeracam.dismissUpdateNag",
)(function* (pid: number) {
	const closeCandidates = [
		{ role: "AXButton", title: "Close" },
		{ role: "AXButton", title: "OK" },
		{ role: "AXButton", title: "Ok" },
		{ role: "AXButton", title: "Got it" },
		{ role: "AXButton", title: "Skip" },
	] as const;

	const nagPresent =
		(yield* elementExists(pid, { title: "Tips" })) ||
		(yield* elementExists(pid, { title: "Update" }));
	if (!nagPresent) return;

	for (const q of closeCandidates) {
		if (yield* elementExists(pid, q)) {
			yield* clickElement(pid, q);
			yield* Effect.sleep(SETTLE);
			return;
		}
	}
});

export const dismissRestorePrompt = Effect.fn(
	"flatmaxx.makeracam.dismissRestorePrompt",
)(function* (pid: number) {
	for (let i = 0; i < 130; i++) {
		if (
			(yield* elementExists(pid, { title: "Welcome to MakerCAM" })) ||
			(yield* elementExists(pid, { title: "3 AXIS" }))
		) {
			return;
		}
		const hasNo = yield* elementExists(pid, { role: "AXButton", title: "No" });
		const hasYes = yield* elementExists(pid, {
			role: "AXButton",
			title: "Yes",
		});
		if (hasNo && hasYes) {
			yield* clickElement(pid, { role: "AXButton", title: "No" });
		}
		yield* Effect.sleep(Duration.millis(300));
	}
});

export const newProject3Axis = Effect.fn("flatmaxx.makeracam.newProject3Axis")(
	function* (pid: number) {
		yield* dismissRestorePrompt(pid);

		yield* waitForElement(
			pid,
			{ title: "Welcome to MakerCAM" },
			{ timeoutMs: 30_000 },
		);

		const boxes = (yield* axFind(pid, { role: "AXCheckBox" }))
			.slice()
			.sort((a, b) => a.click.x - b.click.x);
		const threeAxis = boxes[0];
		if (threeAxis === undefined) {
			return yield* Effect.fail(
				new Error("Welcome: no 3-AXIS project-type checkbox found."),
			);
		}
		yield* clickAt(threeAxis.click.x, threeAxis.click.y);

		yield* waitForElement(
			pid,
			{ role: "AXMenuButton", title: "2D Path" },
			{ timeoutMs: 30_000 },
		);
	},
);

export const setStockMaterialPCB = Effect.fn(
	"flatmaxx.makeracam.setStockMaterialPCB",
)(function* (pid: number) {
	yield* clickElement(pid, { role: "AXButton", title: "Edit" });
	yield* Effect.sleep(SETTLE);

	const hasMaterialPopup = yield* elementExists(pid, {
		role: "AXPopUpButton",
	});
	if (hasMaterialPopup) {
		yield* setElementValue(pid, { role: "AXPopUpButton" }, "PCB").pipe(
			Effect.catch(() =>
				Effect.gen(function* () {
					yield* clickElement(pid, { role: "AXPopUpButton" });
					yield* Effect.sleep(SETTLE);
					yield* clickElement(pid, { role: "AXMenuItem", title: "PCB" });
				}),
			),
		);
	}

	yield* clickElement(pid, { role: "AXButton", title: "Ok" });
	yield* Effect.sleep(SETTLE);
});

const layerGroupTitles = Effect.fn("flatmaxx.makeracam.layerGroupTitles")(
	function* (pid: number) {
		const groups = yield* axFind(pid, { role: "AXGroup" });
		return groups.flatMap((g) => g.titles);
	},
);

export const importPcbFile = Effect.fn("flatmaxx.makeracam.importPcbFile")(
	function* (pid: number, absPath: string) {
		const isDxf = absPath.toLowerCase().endsWith(".dxf");
		const importButton = isDxf ? "Import 2D Model" : "Import PCB";
		const fileBase = basename(absPath);
		const stem = fileBase.replace(/\.[^.]+$/, "");

		const MAX_TRIES = 3;
		for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
			const before = new Set(yield* layerGroupTitles(pid));
			yield* clickElement(pid, { role: "AXButton", title: importButton });

			yield* waitForElement(
				pid,
				{ id: "open-panel" },
				{ timeoutMs: 15_000 },
			).pipe(Effect.catch(() => Effect.sleep(Duration.seconds(2))));
			yield* goToPath(absPath);
			yield* Effect.sleep(SETTLE);
			yield* pressReturn();
			yield* waitForGone(pid, { id: "open-panel" }, { timeoutMs: 15_000 }).pipe(
				Effect.ignore,
			);

			for (let i = 0; i < 50; i++) {
				const added = (yield* layerGroupTitles(pid)).filter(
					(t) => !before.has(t),
				);
				if (added.length > 0) {
					return added.find((t) => t.includes(stem)) ?? added[0]!;
				}
				yield* Effect.sleep(Duration.millis(300));
			}
			yield* pressKeyCode(53).pipe(Effect.ignore);
			yield* Effect.sleep(SETTLE);
		}
		return yield* Effect.fail(
			new Error(
				`Import of ${fileBase} produced no new 2D layer group after ${MAX_TRIES} attempts.`,
			),
		);
	},
);

const KEY_UP = 126;
const KEY_DOWN = 125;
const KEY_RETURN = 36;
const KEY_ESCAPE = 53;

const contextMenuOpen = Effect.fn("flatmaxx.makeracam.contextMenuOpen")(
	function* (pid: number) {
		const menus = yield* axFind(pid, { role: "AXMenu" });
		return menus.some((m) => m.frame.w > 0 && m.frame.h > 0);
	},
);

const dismissContextMenus = Effect.fn("flatmaxx.makeracam.dismissContextMenus")(
	function* (pid: number) {
		for (let i = 0; i < 6; i++) {
			if (!(yield* contextMenuOpen(pid))) return;
			yield* pressKeyCode(KEY_ESCAPE);
			yield* Effect.sleep(Duration.millis(150));
		}
	},
);

const invokeRowMenuFromBottom = Effect.fn(
	"flatmaxx.makeracam.invokeRowMenuFromBottom",
)(function* (pid: number, row: AxElement, fromBottom: number) {
	yield* ensureFrontmost(MAKERACAM_APP);
	yield* dismissContextMenus(pid);

	const { x, y } = row.click;
	const tryOpen = Effect.fn("tryOpen")(function* () {
		yield* mouseMove(x - 40, y);
		yield* Effect.sleep(Duration.millis(50));
		yield* mouseMove(x, y);
		yield* Effect.sleep(Duration.millis(100));
		yield* rightClickAt(x, y);
		for (let j = 0; j < 25; j++) {
			yield* Effect.sleep(Duration.millis(100));
			if (yield* contextMenuOpen(pid)) return true;
		}
		return false;
	});
	let opened = yield* tryOpen();
	if (!opened) opened = yield* tryOpen();
	if (!opened) {
		return yield* Effect.fail(
			new Error("context menu did not open (right-click produced no AXMenu)"),
		);
	}

	for (let k = 0; k < fromBottom; k++) {
		yield* pressKeyCode(KEY_UP);
		yield* Effect.sleep(Duration.millis(50));
	}
	yield* pressKeyCode(KEY_RETURN);

	for (let j = 0; j < 25; j++) {
		yield* Effect.sleep(Duration.millis(120));
		if (!(yield* contextMenuOpen(pid))) break;
	}
	yield* Effect.sleep(SETTLE);
});

export const selectLayerGraphics = Effect.fn(
	"flatmaxx.makeracam.selectLayerGraphics",
)(function* (pid: number, layerTitle: string) {
	const row = yield* waitForElement(
		pid,
		{ role: "AXGroup", title: layerTitle },
		{ timeoutMs: 10_000 },
	);
	yield* invokeRowMenuFromBottom(pid, row, 1);
});

const dialogTitleFor = (kind: ToolpathKind): string =>
	kind === "drill"
		? "2D Drilling"
		: kind === "pocket"
			? "2D Pocket"
			: "2D Contour";

const menuItemFor = (kind: ToolpathKind): string =>
	kind === "drill"
		? "2D Drilling"
		: kind === "pocket"
			? "2D Pocket"
			: "2D Contour";

export const openToolpath = Effect.fn("flatmaxx.makeracam.openToolpath")(
	function* (pid: number, kind: ToolpathKind) {
		yield* clickElement(pid, { role: "AXMenuButton", title: "2D Path" });
		yield* Effect.sleep(SETTLE);
		yield* pressElement(pid, {
			role: "AXMenuItem",
			title: menuItemFor(kind),
		});
		yield* waitForElement(
			pid,
			{ role: "AXStaticText", title: dialogTitleFor(kind) },
			{ timeoutMs: 15_000 },
		);
	},
);

export const setValueByLabel = Effect.fn("flatmaxx.makeracam.setValueByLabel")(
	function* (pid: number, labelTitle: string, value: string) {
		const labels = yield* axFind(pid, {
			role: "AXStaticText",
			title: labelTitle,
		});
		const label = labels[0];
		if (label === undefined) {
			return yield* Effect.fail(new Error(`no label "${labelTitle}" found`));
		}
		const field = (yield* axFind(pid, { role: "AXTextField" }))
			.filter(
				(f) =>
					Math.abs(f.frame.y - label.frame.y) <= 12 &&
					f.frame.x > label.frame.x,
			)
			.sort((a, b) => a.frame.x - b.frame.x)[0];
		if (field === undefined) {
			return yield* Effect.fail(
				new Error(`no text field on the row of "${labelTitle}"`),
			);
		}
		yield* doubleClickAt(field.click.x, field.click.y);
		yield* Effect.sleep(Duration.millis(200));
		yield* pressKeyCode(0, ["command"]);
		yield* typeText(value);
		yield* pressKeyCode(48);
		yield* Effect.sleep(SETTLE);
	},
);

export const setEndDepth = Effect.fn("flatmaxx.makeracam.setEndDepth")(
	function* (pid: number, kind: ToolpathKind, mm: number) {
		const labelTitle = kind === "drill" ? "Drill Tip End Depth" : "End Depth";
		yield* setValueByLabel(pid, labelTitle, String(mm)).pipe(
			Effect.catch(() => setValueByLabel(pid, "End Depth", String(mm))),
		);
	},
);

const diaPrefix = (label: string): number => {
	const beforeStar = label.split("*")[0] ?? label;
	const m = beforeStar.match(/([0-9]*\.?[0-9]+)/);
	return m?.[1] !== undefined ? Number.parseFloat(m[1]) : Number.NaN;
};

const toolListTable = Effect.fn("flatmaxx.makeracam.toolListTable")(function* (
	pid: number,
) {
	const tables = (yield* axFind(pid, { role: "AXTable" }))
		.filter((t) => t.frame.x < 900)
		.sort((a, b) => a.frame.y - b.frame.y);
	return tables[0];
});

const selectToolRow = Effect.fn("flatmaxx.makeracam.selectToolRow")(function* (
	pid: number,
	diaMm: number,
	category: string,
) {
	const table = yield* toolListTable(pid);
	if (table === undefined) {
		return yield* Effect.fail(new Error("Tool Magazine: no tool-list table"));
	}
	const bandTop = table.frame.y + 8;
	const bandBottom = table.frame.y + table.frame.h - 18;
	const cx = table.frame.x + Math.round(table.frame.w / 2);
	const cy = table.frame.y + Math.round(table.frame.h / 2);
	const EPS = 1e-6;

	for (let i = 0; i < 12; i++) {
		const cells = yield* axFind(pid, {
			role: "AXStaticText",
			underTitle: "Tool Magazine",
		});
		const target = cells.find((c) =>
			c.titles.some((t) => Math.abs(diaPrefix(t) - diaMm) < EPS),
		);
		if (target === undefined) {
			return yield* Effect.fail(
				new Error(`Tool Magazine: no ${category} row with diameter ${diaMm}`),
			);
		}
		if (target.click.y >= bandTop && target.click.y <= bandBottom) {
			yield* clickAt(target.click.x, target.click.y);
			return;
		}
		yield* mouseScroll(cx, cy, target.click.y > bandBottom ? -8 : 8);
		yield* Effect.sleep(SETTLE);
	}
	return yield* Effect.fail(
		new Error(`Tool Magazine: could not scroll the ${diaMm}mm row into view`),
	);
});

export const chooseToolByDiameter = Effect.fn(
	"flatmaxx.makeracam.chooseToolByDiameter",
)(function* (
	pid: number,
	method: string,
	diaMm: number,
	opener: "Choose Tool" | "Add Tool",
) {
	yield* clickElement(pid, { role: "AXButton", title: opener });

	yield* waitForElement(pid, { title: "Tool Magazine" }, { timeoutMs: 15_000 });

	const category = magazineCategoryFor(method);
	yield* clickElement(pid, { title: category, underTitle: "Tool Magazine" });
	yield* Effect.sleep(SETTLE);

	yield* selectToolRow(pid, diaMm, category);
	yield* Effect.sleep(SETTLE);

	yield* clickElement(pid, { role: "AXButton", title: "Choose" });
	yield* waitForGone(pid, { title: "Tool Magazine" }, { timeoutMs: 10_000 });
	yield* Effect.sleep(SETTLE);
});

export const deleteDefaultPocketTool = Effect.fn(
	"flatmaxx.makeracam.deleteDefaultPocketTool",
)(function* (pid: number) {
	const hasDelete = yield* elementExists(pid, {
		role: "AXButton",
		title: "Delete",
	});
	if (!hasDelete) return;
	yield* clickElement(pid, { role: "AXButton", title: "Delete" });
	yield* Effect.sleep(SETTLE);
});

const TAB_WIDTH_MM = 4;
const TAB_TOP_CUT_MM = 0.5;

const setTabLayoutNumber = Effect.fn("flatmaxx.makeracam.setTabLayoutNumber")(
	function* (pid: number) {
		yield* ensureFrontmost(MAKERACAM_APP);
		const attempt = Effect.fn("attempt")(function* () {
			const label = (yield* axFind(pid, {
				role: "AXStaticText",
				title: "Tab Layout",
			}))[0];
			if (label === undefined) return false;
			const popups = yield* axFind(pid, { role: "AXPopUpButton" });
			const idx = popups.findIndex(
				(p) =>
					Math.abs(p.frame.y - label.frame.y) <= 14 &&
					p.frame.x > label.frame.x,
			);
			if (idx < 0) return false;
			yield* performAction(
				pid,
				{ role: "AXPopUpButton", nth: idx + 1 },
				"AXShowMenu",
			);
			yield* Effect.sleep(Duration.millis(450));
			yield* pressKeyCode(KEY_DOWN);
			yield* Effect.sleep(Duration.millis(200));
			yield* pressKeyCode(KEY_RETURN);
			yield* Effect.sleep(SETTLE);
			return yield* elementExists(pid, {
				role: "AXStaticText",
				title: "Tabs per Contour",
			});
		});
		let ok = yield* attempt();
		if (!ok) ok = yield* attempt();
		if (!ok) {
			return yield* Effect.fail(
				new Error("Contour: could not switch Tab Layout to 'Number'"),
			);
		}
	},
);

export const setContourOutsideTabs = Effect.fn(
	"flatmaxx.makeracam.setContourOutsideTabs",
)(function* (pid: number, depthMm: number, tabsPerContour: number) {
	yield* pressElement(pid, { role: "AXRadioButton", title: "Outside" });
	yield* Effect.sleep(SETTLE);
	yield* selectTabsRadio(pid, "Auto");
	yield* Effect.sleep(SETTLE);
	yield* setTabLayoutNumber(pid);
	const tabThickness = Math.max(0.3, depthMm - TAB_TOP_CUT_MM);
	yield* setTabParam(pid, "Tabs Width", String(TAB_WIDTH_MM));
	yield* setTabParam(pid, "Tab Thickness", String(tabThickness));
	yield* setTabParam(pid, "Tabs per Contour", String(tabsPerContour));
	yield* Effect.sleep(SETTLE);
	yield* clickTabsGenerate(pid);
	yield* Effect.sleep(SETTLE);
});

const clickTabsGenerate = Effect.fn("flatmaxx.makeracam.clickTabsGenerate")(
	function* (pid: number) {
		const calc = (yield* axFind(pid, {
			role: "AXButton",
			title: "Calculate",
		}))[0];
		const bandTop = 360;
		const bandBottom = (calc?.frame.y ?? 990) - 2;
		for (let i = 0; i < 25; i++) {
			const gen = (yield* axFind(pid, {
				role: "AXButton",
				title: "Generate",
			}))[0];
			if (gen === undefined) return;
			if (gen.click.y >= bandTop && gen.click.y <= bandBottom) {
				yield* Effect.sleep(Duration.millis(250));
				yield* clickAt(gen.click.x, gen.click.y);
				yield* Effect.sleep(Duration.millis(400));
				return;
			}
			yield* mouseScroll(1480, 600, gen.click.y > bandBottom ? -8 : 8);
			yield* Effect.sleep(Duration.millis(120));
		}
	},
);

const setTabParam = Effect.fn("flatmaxx.makeracam.setTabParam")(function* (
	pid: number,
	label: string,
	value: string,
) {
	const calc = (yield* axFind(pid, {
		role: "AXButton",
		title: "Calculate",
	}))[0];
	const bandTop = 360;
	const bandBottom = (calc?.frame.y ?? 980) - 24;
	const panelMidY = Math.round((bandTop + bandBottom) / 2);
	for (let i = 0; i < 30; i++) {
		const lbl = (yield* axFind(pid, { role: "AXStaticText", title: label }))[0];
		if (lbl === undefined) return;
		if (lbl.click.y >= bandTop && lbl.click.y <= bandBottom) break;
		yield* mouseScroll(1480, panelMidY, lbl.click.y > bandBottom ? -8 : 8);
		yield* Effect.sleep(Duration.millis(120));
	}
	yield* setValueByLabel(pid, label, value).pipe(Effect.ignore);
});

const selectTabsRadio = Effect.fn("flatmaxx.makeracam.selectTabsRadio")(
	function* (pid: number, title: string) {
		const calc = (yield* axFind(pid, {
			role: "AXButton",
			title: "Calculate",
		}))[0];
		const bandTop = 360;
		const bandBottom = (calc?.frame.y ?? 980) - 24;
		const panelX = 1480;
		const panelMidY = Math.round((bandTop + bandBottom) / 2);

		for (let i = 0; i < 30; i++) {
			const radio = (yield* axFind(pid, { role: "AXRadioButton", title }))[0];
			if (radio === undefined) {
				return yield* Effect.fail(
					new Error(`Contour: Tabs '${title}' radio not found`),
				);
			}
			if (radio.click.y >= bandTop && radio.click.y <= bandBottom) {
				yield* clickAt(radio.click.x, radio.click.y);
				return;
			}
			yield* mouseScroll(
				panelX,
				panelMidY,
				radio.click.y > bandBottom ? -8 : 8,
			);
			yield* Effect.sleep(Duration.millis(120));
		}
		return yield* Effect.fail(
			new Error(`Contour: could not scroll Tabs '${title}' into the band`),
		);
	},
);

const countPathNodes = Effect.fn("flatmaxx.makeracam.countPathNodes")(
	function* (pid: number) {
		const groups = yield* axFind(pid, { role: "AXGroup" });
		return groups.filter((g) => g.titles.some((t) => /^\[T\d/.test(t))).length;
	},
);

export const calculatePath = Effect.fn("flatmaxx.makeracam.calculatePath")(
	function* (pid: number) {
		const before = yield* countPathNodes(pid);
		yield* clickElement(pid, { role: "AXButton", title: "Calculate" });
		for (let i = 0; i < 120; i++) {
			if ((yield* countPathNodes(pid)) > before) break;
			yield* Effect.sleep(Duration.millis(300));
		}
		yield* Effect.sleep(SETTLE);
	},
);

export const closeToolpathDialog = Effect.fn(
	"flatmaxx.makeracam.closeToolpathDialog",
)(function* (pid: number) {
	yield* waitForElement(
		pid,
		{ role: "AXButton", title: "Close" },
		{
			timeoutMs: 90_000,
		},
	);
	yield* clickElement(pid, { role: "AXButton", title: "Close" });
	yield* waitForGone(
		pid,
		{ role: "AXButton", title: "Calculate" },
		{
			timeoutMs: 10_000,
		},
	).pipe(Effect.ignore);
	yield* Effect.sleep(SETTLE);
});

const toolpathNodes = Effect.fn("flatmaxx.makeracam.toolpathNodes")(function* (
	pid: number,
) {
	return (yield* axFind(pid, { role: "AXGroup" }))
		.filter((g) => g.titles.some((t) => /^\[T\d/.test(t)))
		.sort((a, b) => a.frame.y - b.frame.y);
});

export const reorderContourLast = Effect.fn(
	"flatmaxx.makeracam.reorderContourLast",
)(function* (pid: number) {
	for (let i = 0; i < 24; i++) {
		const nodes = yield* toolpathNodes(pid);
		const idx = nodes.findIndex((g) => g.titles.some((t) => /Contour/.test(t)));
		const contour = nodes[idx];
		if (contour === undefined || idx >= nodes.length - 1) return;
		yield* invokeRowMenuFromBottom(pid, contour, 5);
	}
});

export const saveAllPaths = Effect.fn("flatmaxx.makeracam.saveAllPaths")(
	function* (pid: number) {
		const row = yield* waitForElement(
			pid,
			{ role: "AXGroup", title: "Path" },
			{ timeoutMs: 10_000 },
		);
		yield* invokeRowMenuFromBottom(pid, row, 2);
		yield* waitForElement(
			pid,
			{ title: "Export ToolPaths" },
			{ timeoutMs: 15_000 },
		);
		yield* Effect.sleep(SETTLE);
	},
);

interface ExportRow {
	readonly toolNumberCell: AxElement;
	readonly value: string;
}

const readToolNumberColumn = Effect.fn(
	"flatmaxx.makeracam.readToolNumberColumn",
)(function* (pid: number) {
	const cells = yield* axFind(pid, {
		role: "AXStaticText",
		underTitle: "Export ToolPaths",
	});

	const numberCells = cells.filter((c) =>
		c.titles.some((t) => /^\d+$/.test(t.trim())),
	);
	if (numberCells.length === 0) return [] as readonly ExportRow[];
	const maxX = Math.max(...numberCells.map((c) => c.frame.x));
	const colCells = numberCells.filter((c) => Math.abs(c.frame.x - maxX) < 40);

	return colCells
		.slice()
		.sort((a, b) => a.frame.y - b.frame.y)
		.map(
			(c): ExportRow => ({
				toolNumberCell: c,
				value: (c.titles.find((t) => /^\d+$/.test(t.trim())) ?? "").trim(),
			}),
		);
});

export const setSequentialToolNumbers = Effect.fn(
	"flatmaxx.makeracam.setSequentialToolNumbers",
)(function* (pid: number, desired: readonly number[]) {
	const MAX_PASSES = 5;
	const want = (i: number): string => String(desired[i] ?? -1);

	for (let pass = 0; pass < MAX_PASSES; pass++) {
		const rows = yield* readToolNumberColumn(pid);

		for (let i = 0; i < rows.length && i < desired.length; i++) {
			const row = rows[i];
			if (row === undefined || row.value === want(i)) continue;
			const { x, y } = row.toolNumberCell.click;
			yield* doubleClickAt(x, y);
			yield* Effect.sleep(SETTLE);
			yield* pressKeyCode(0, ["command"]);
			yield* typeText(want(i));
			yield* pressKeyCode(48);
			yield* Effect.sleep(SETTLE);
		}

		const after = yield* readToolNumberColumn(pid);
		if (
			after.length === desired.length &&
			after.every((r, i) => r.value === want(i))
		) {
			return;
		}
	}

	return yield* Effect.fail(
		new Error(
			`Export ToolPaths tool numbers did not settle to [${desired.join(",")}] after ${MAX_PASSES} passes.`,
		),
	);
});

export const assertExportRowCount = Effect.fn(
	"flatmaxx.makeracam.assertExportRowCount",
)(function* (pid: number, expected: number) {
	const rows = yield* readToolNumberColumn(pid);
	if (rows.length !== expected) {
		return yield* Effect.fail(
			new Error(
				`Export ToolPaths has ${rows.length} path row(s); expected ${expected}. ` +
					"A toolpath likely failed to Calculate.",
			),
		);
	}
});

export const exportGcode = Effect.fn("flatmaxx.makeracam.exportGcode")(
	function* (pid: number, absPath: string) {
		const withExt = absPath.endsWith(".gcode") ? absPath : `${absPath}.gcode`;
		yield* clickElement(pid, { role: "AXButton", title: "Export" });
		yield* waitForElement(pid, { id: "save-panel" }, { timeoutMs: 15_000 });
		yield* goToPath(withExt);
		yield* Effect.sleep(SETTLE);
		yield* clickElement(pid, { id: "OKButton" }).pipe(
			Effect.catch(() =>
				clickElement(pid, { role: "AXButton", title: "Save" }),
			),
		);
		yield* waitForGone(pid, { id: "save-panel" }, { timeoutMs: 30_000 });
		yield* Effect.sleep(SETTLE);
	},
);

export const saveProjectMkc = Effect.fn("flatmaxx.makeracam.saveProjectMkc")(
	function* (pid: number, absPath: string) {
		const withExt = absPath.endsWith(".mkc") ? absPath : `${absPath}.mkc`;
		yield* clickElement(pid, { role: "AXButton", title: "Save As" });
		yield* waitForElement(pid, { id: "save-panel" }, { timeoutMs: 15_000 });
		yield* goToPath(withExt);
		yield* Effect.sleep(SETTLE);
		yield* clickElement(pid, { id: "OKButton" }).pipe(
			Effect.catch(() =>
				clickElement(pid, { role: "AXButton", title: "Save" }),
			),
		);
		yield* waitForGone(pid, { id: "save-panel" }, { timeoutMs: 30_000 });
		yield* Effect.sleep(SETTLE);
	},
);
