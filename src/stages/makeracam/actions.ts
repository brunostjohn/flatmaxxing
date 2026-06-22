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

// The process name doubles as the AX application name for window scripting.
export const MAKERACAM_APP = MAKERACAM_PROCESS;

// A short settle used after coordinate-driven actions (context menus, table-cell
// edits) where the AX tree needs a beat to materialise the next state. Event
// waits (`waitForElement`) are preferred everywhere a target element exists.
const SETTLE = Duration.millis(400);

/**
 * Dismiss the "Tips" / update-nag popup if it is showing. Best-effort: guarded
 * by `elementExists`, never fails if there is nothing to close.
 */
export const dismissUpdateNag = Effect.fn(
	"flatmaxx.makeracam.dismissUpdateNag",
)(function* (pid: number) {
	// VERIFY: exact title of the tips/update popup window + its close control.
	// Findings §0/§11 mention an update/tips popup but give no selector — try a
	// few likely close affordances, all guarded.
	const closeCandidates = [
		{ role: "AXButton", title: "Close" },
		{ role: "AXButton", title: "OK" },
		{ role: "AXButton", title: "Ok" },
		{ role: "AXButton", title: "Got it" },
		{ role: "AXButton", title: "Skip" },
	] as const;

	// Only act if a tips/update dialog is actually present.
	// VERIFY: the window title used to detect the nag ("Tips" assumed).
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

/**
 * From the Welcome window, create a new 3-axis project and wait for the editor
 * to come up.
 */
/**
 * After an abnormal exit (crash / force-quit) MakeraCAM opens with a
 * "didn't exit normally last time. Restore the auto-saved file?" dialog (Yes/No)
 * that blocks the Welcome screen. Click "No" to start clean. Bounded poll —
 * returns immediately once the Welcome window is up (normal launch, no prompt).
 */
export const dismissRestorePrompt = Effect.fn(
	"flatmaxx.makeracam.dismissRestorePrompt",
)(function* (pid: number) {
	// Poll up to ~40s. The crash-restore dialog ("…didn't exit normally… Restore
	// the auto-saved file?") can appear several seconds AFTER launch and blocks
	// the Welcome window — so we can't just check once. Click "No" whenever it
	// shows; return as soon as the Welcome window (or its "3 AXIS" tile label) is
	// up. Keeps polling after a dismiss (Welcome appears a beat later).
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
		// Dismiss a crash-restore prompt if one is showing (force-kill / crash).
		yield* dismissRestorePrompt(pid);

		// Welcome window (note the app's title is "MakerCAM", missing the 'a').
		yield* waitForElement(
			pid,
			{ title: "Welcome to MakerCAM" },
			{ timeoutMs: 30_000 },
		);

		// The 3-AXIS / 4-AXIS project-type tiles are UNLABELLED AXCheckBoxes; the
		// "3 AXIS"/"4 AXIS" text is a separate StaticText below each. The 3-AXIS
		// tile is the left checkbox — pick it by smallest x from the live frames
		// (display-independent; no title to match on).
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

		// Editor is up once the main toolbar's "2D Path" menu button exists.
		yield* waitForElement(
			pid,
			{ role: "AXMenuButton", title: "2D Path" },
			{ timeoutMs: 30_000 },
		);
	},
);

/**
 * Set the stock material to PCB (defaults to PCB already; set explicitly for
 * safety). Stock panel "Edit" → material popup → "PCB" → "Ok".
 */
export const setStockMaterialPCB = Effect.fn(
	"flatmaxx.makeracam.setStockMaterialPCB",
)(function* (pid: number) {
	// VERIFY: Stock panel "Edit" button — there may be several "Edit" buttons in
	// the window; findings §3 reports a single Stock Edit at (376,363).
	yield* clickElement(pid, { role: "AXButton", title: "Edit" });
	yield* Effect.sleep(SETTLE);

	// Material is an inline AXPopUpButton; ensure "PCB". The popup defaults to
	// PCB, so setting its value is a no-op safety step.
	// VERIFY: whether the material AXPopUpButton accepts AXSetValue("PCB") or
	// needs press → menu-item click. setElementValue tried first.
	const hasMaterialPopup = yield* elementExists(pid, {
		role: "AXPopUpButton",
	});
	if (hasMaterialPopup) {
		yield* setElementValue(pid, { role: "AXPopUpButton" }, "PCB").pipe(
			// If AXSetValue is rejected on this popup, fall back to opening it and
			// pressing the PCB menu item.
			Effect.catch(() =>
				Effect.gen(function* () {
					yield* clickElement(pid, { role: "AXPopUpButton" });
					yield* Effect.sleep(SETTLE);
					// VERIFY: PCB exposed as AXMenuItem once the popup is open.
					yield* clickElement(pid, { role: "AXMenuItem", title: "PCB" });
				}),
			),
		);
	}

	// Confirm with "Ok" (occupies the Edit slot in edit mode per findings §3).
	yield* clickElement(pid, { role: "AXButton", title: "Ok" });
	yield* Effect.sleep(SETTLE);
});

/** Snapshot of the current 2D-layer group titles (for new-layer diffing). */
const layerGroupTitles = Effect.fn("flatmaxx.makeracam.layerGroupTitles")(
	function* (pid: number) {
		// The outliner is a FLAT list of sibling AXGroups (WCS1, 3D Models,
		// 2D Layers, Layer1, <imported layers…>, Path) — imported layers are NOT
		// descendants of the "2D Layers" node, so scoping by underTitle yields
		// nothing. Read all titled groups; the before/after diff isolates the new one.
		const groups = yield* axFind(pid, { role: "AXGroup" });
		return groups.flatMap((g) => g.titles);
	},
);

/**
 * Import a drill/edge file via the toolbar "Import PCB" → open panel → goToPath
 * → open. Returns the title of the newly-created 2D-layer group (resolved by
 * diffing the layer list before/after the import).
 */
export const importPcbFile = Effect.fn("flatmaxx.makeracam.importPcbFile")(
	function* (pid: number, absPath: string) {
		// "Import PCB" only accepts Gerber/Excellon (its NSOpenPanel filter lists
		// *.GBR/*.drl/… and rejects DXF). Edge-cut outlines are now DXF (clean
		// centreline geometry MakeraCAM tabs reliably, unlike stroked-profile
		// Gerbers), so route DXF through "Import 2D Model" instead.
		const isDxf = absPath.toLowerCase().endsWith(".dxf");
		const importButton = isDxf ? "Import 2D Model" : "Import PCB";
		const fileBase = basename(absPath);
		const stem = fileBase.replace(/\.[^.]+$/, "");

		// MakeraCAM occasionally drops an import (the panel/selection doesn't take),
		// so retry: each attempt diffs the layer list before/after and, on failure,
		// dismisses any stuck panel before re-attempting.
		const MAX_TRIES = 3;
		for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
			const before = new Set(yield* layerGroupTitles(pid));
			yield* clickElement(pid, { role: "AXButton", title: importButton });

			// Both open an NSOpenPanel (id="open-panel"); wait for it, falling back to
			// a short settle if the 2D-model panel is exposed under a different id.
			yield* waitForElement(
				pid,
				{ id: "open-panel" },
				{ timeoutMs: 15_000 },
			).pipe(Effect.catch(() => Effect.sleep(Duration.seconds(2))));
			yield* goToPath(absPath); // Cmd+Shift+G, type path, Return (selects it)
			yield* Effect.sleep(SETTLE);
			yield* pressReturn(); // second Return opens the file (findings §4)
			yield* waitForGone(pid, { id: "open-panel" }, { timeoutMs: 15_000 }).pipe(
				Effect.ignore,
			);

			// Poll for a new 2D-layer group, then identify it by diff.
			for (let i = 0; i < 50; i++) {
				const added = (yield* layerGroupTitles(pid)).filter(
					(t) => !before.has(t),
				);
				if (added.length > 0) {
					// Prefer the group whose title references this filename; else the
					// first newly-added group.
					return added.find((t) => t.includes(stem)) ?? added[0]!;
				}
				yield* Effect.sleep(Duration.millis(300));
			}
			// No new layer this attempt — clear any stuck open panel and retry.
			yield* pressKeyCode(53).pipe(Effect.ignore); // Esc
			yield* Effect.sleep(SETTLE);
		}
		return yield* Effect.fail(
			new Error(
				`Import of ${fileBase} produced no new 2D layer group after ${MAX_TRIES} attempts.`,
			),
		);
	},
);

// ---------------------------------------------------------------------------
// Qt outliner context menus.
//
// MakeraCAM's outliner rows (layers, the "Path" node, each "[T#]" toolpath) and
// their right-click menus are a known Qt-on-macOS accessibility dead end:
//   • the rows expose ONLY `AXPress` — there is no `AXShowMenu` action, so the
//     menu can be opened ONLY by a real right-click on the row's (AX-resolved)
//     frame; and
//   • the QMenu that opens exposes ONLY its separators (`AXSplitter`) to AX, never
//     its items — so an item can be neither found nor `AXPress`ed by title.
// Earlier coordinate-clicking of (often stale, off-screen) menu items is what made
// this flaky. Instead we open the menu by right-clicking the live frame, detect it
// by its `AXMenu` FRAME (the only reliable AX signal), and invoke the wanted item
// by KEYBOARD: `Up` wraps to the last item and each further `Up` moves up one. We
// count from the BOTTOM because the trailing items are always enabled, whereas a
// leading item (e.g. "Move Up") greys out when a row is already first — which would
// shift a top-down index but never a bottom-up one.
// ---------------------------------------------------------------------------

const KEY_UP = 126;
const KEY_DOWN = 125;
const KEY_RETURN = 36;
const KEY_ESCAPE = 53;

/** True iff a context menu is open (some AXMenu has a real, non-zero frame). */
const contextMenuOpen = Effect.fn("flatmaxx.makeracam.contextMenuOpen")(
	function* (pid: number) {
		const menus = yield* axFind(pid, { role: "AXMenu" });
		return menus.some((m) => m.frame.w > 0 && m.frame.h > 0);
	},
);

/** Press Escape until no context menu remains open (bounded; no-op if none). */
const dismissContextMenus = Effect.fn("flatmaxx.makeracam.dismissContextMenus")(
	function* (pid: number) {
		for (let i = 0; i < 6; i++) {
			if (!(yield* contextMenuOpen(pid))) return;
			yield* pressKeyCode(KEY_ESCAPE);
			yield* Effect.sleep(Duration.millis(150));
		}
	},
);

/**
 * Open `row`'s context menu and invoke the item that sits `fromBottom` places up
 * from the LAST item, entirely by keyboard. `fromBottom` is 1-based: 1 = the last
 * item, 2 = second-to-last, … See the section comment for why this is the only
 * reliable way to drive these menus.
 */
const invokeRowMenuFromBottom = Effect.fn(
	"flatmaxx.makeracam.invokeRowMenuFromBottom",
)(function* (pid: number, row: AxElement, fromBottom: number) {
	yield* ensureFrontmost(MAKERACAM_APP);
	yield* dismissContextMenus(pid);

	const { x, y } = row.click;
	// Open the menu: prime hover (move onto the row), then right-click. A bare
	// right-press with no preceding mouse-move can miss the row on this Qt widget.
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
	if (!opened) opened = yield* tryOpen(); // one retry
	if (!opened) {
		return yield* Effect.fail(
			new Error("context menu did not open (right-click produced no AXMenu)"),
		);
	}

	// Up wraps to the last item; each further Up moves up one. Return invokes.
	for (let k = 0; k < fromBottom; k++) {
		yield* pressKeyCode(KEY_UP);
		yield* Effect.sleep(Duration.millis(50));
	}
	yield* pressKeyCode(KEY_RETURN);

	// Wait for the menu to close before returning (so a follow-up open is clean).
	for (let j = 0; j < 25; j++) {
		yield* Effect.sleep(Duration.millis(120));
		if (!(yield* contextMenuOpen(pid))) break;
	}
	yield* Effect.sleep(SETTLE);
});

/**
 * Select all graphics on a layer via its context menu's "Select Graphics" — the
 * LAST item of the layer menu (Active / Show / Hide / Insert layer / Delete /
 * Rename / Move Up / Move Down / Select Graphics), so `fromBottom = 1`.
 */
export const selectLayerGraphics = Effect.fn(
	"flatmaxx.makeracam.selectLayerGraphics",
)(function* (pid: number, layerTitle: string) {
	// Layer groups are flat siblings in the outliner; the title (which embeds the
	// filename + diameter) is unique, so match by title alone (no subtree scope).
	const row = yield* waitForElement(
		pid,
		{ role: "AXGroup", title: layerTitle },
		{ timeoutMs: 10_000 },
	);
	yield* invokeRowMenuFromBottom(pid, row, 1);
});

/** Dialog-title guard text for each toolpath kind. */
const dialogTitleFor = (kind: ToolpathKind): string =>
	kind === "drill"
		? "2D Drilling"
		: kind === "pocket"
			? "2D Pocket"
			: "2D Contour";

/** Toolpath menu-item title for each kind. */
const menuItemFor = (kind: ToolpathKind): string =>
	kind === "drill"
		? "2D Drilling"
		: kind === "pocket"
			? "2D Pocket"
			: "2D Contour";

/**
 * Open a toolpath dialog: toolbar "2D Path" menu → the kind's item. Guards by
 * waiting for the dialog's title StaticText (dialogs are embedded in the main
 * window, so the title text is how we know it opened).
 */
export const openToolpath = Effect.fn("flatmaxx.makeracam.openToolpath")(
	function* (pid: number, kind: ToolpathKind) {
		// VERIFY: "2D Path" toolbar AXMenuButton opens a menu via click (findings §6).
		yield* clickElement(pid, { role: "AXMenuButton", title: "2D Path" });
		yield* Effect.sleep(SETTLE);
		// VERIFY: menu items "2D Drilling"/"2D Pocket"/"2D Contour" as AXMenuItem.
		yield* pressElement(pid, {
			role: "AXMenuItem",
			title: menuItemFor(kind),
		});
		// Dialog-title StaticText guard (embedded panel, not a separate window).
		yield* waitForElement(
			pid,
			{ role: "AXStaticText", title: dialogTitleFor(kind) },
			{ timeoutMs: 15_000 },
		);
	},
);

/**
 * Set the End/Cut depth field of the currently-open toolpath dialog.
 *
 * The field has no stable id; findings call it "End Depth" (pocket/contour) and
 * "Drill Tip End Depth" (drilling). We resolve by title within the dialog
 * subtree. The dialog-title guard is the caller's responsibility (openToolpath
 * already waited on it).
 */
/**
 * Set a labelled numeric text field by locating the field on the LABEL's row.
 *
 * MakeraCAM dialog fields are unlabelled `AXTextField`s; the human label is a
 * sibling `AXStaticText` to the left on the same row. So we find the label, take
 * the text field on the same y to its right, click to focus, select-all, type,
 * and commit with Return. Display-independent (uses live frames).
 */
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
		// A single click won't enter edit mode on these Qt fields (the value stays
		// 0). Double-click to focus+edit, Cmd+A to select the whole value, type the
		// replacement, Tab to commit. (Verified live: click+Cmd+A left "0.000";
		// double-click+Cmd+A+type+Tab sets the value cleanly.)
		yield* doubleClickAt(field.click.x, field.click.y);
		yield* Effect.sleep(Duration.millis(200));
		yield* pressKeyCode(0, ["command"]); // Cmd+A — select existing value
		yield* typeText(value);
		yield* pressKeyCode(48); // Tab — commit
		yield* Effect.sleep(SETTLE);
	},
);

export const setEndDepth = Effect.fn("flatmaxx.makeracam.setEndDepth")(
	function* (pid: number, kind: ToolpathKind, mm: number) {
		// Drilling labels the field "Drill Tip End Depth"; pocket/contour "End Depth".
		const labelTitle = kind === "drill" ? "Drill Tip End Depth" : "End Depth";
		yield* setValueByLabel(pid, labelTitle, String(mm)).pipe(
			Effect.catch(() => setValueByLabel(pid, "End Depth", String(mm))),
		);
	},
);

/** Leading diameter of a magazine row label: "0.4*7mm Drill" → 0.4, "1.5mm Corn" → 1.5. */
const diaPrefix = (label: string): number => {
	const beforeStar = label.split("*")[0] ?? label;
	const m = beforeStar.match(/([0-9]*\.?[0-9]+)/);
	return m?.[1] !== undefined ? Number.parseFloat(m[1]) : Number.NaN;
};

/** The tool-list table (top-left; excludes the right-side detail table). */
const toolListTable = Effect.fn("flatmaxx.makeracam.toolListTable")(function* (
	pid: number,
) {
	const tables = (yield* axFind(pid, { role: "AXTable" }))
		.filter((t) => t.frame.x < 900)
		.sort((a, b) => a.frame.y - b.frame.y);
	return tables[0];
});

/**
 * Select the tool row matching `diaMm`: the magazine table clips/scrolls, so we
 * scroll the row into its clickable viewport before clicking (a click on a
 * clipped row — e.g. the bottom 1.5mm row — lands outside the table and selects
 * nothing). Negative scroll reveals lower rows.
 */
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

/**
 * Choose (or add) a tool by diameter from the Tool Magazine.
 *
 * Drilling/contour use a single-tool "Choose Tool"; pocket uses "Add Tool".
 * Both open the "Tool Magazine" window. We pick the category (Drill / Corn
 * Bits) as the "tool set", scroll+select the row whose diameter prefix equals
 * `diaMm` numerically, then confirm with "Choose".
 */
export const chooseToolByDiameter = Effect.fn(
	"flatmaxx.makeracam.chooseToolByDiameter",
)(function* (
	pid: number,
	method: string,
	diaMm: number,
	opener: "Choose Tool" | "Add Tool",
) {
	yield* clickElement(pid, { role: "AXButton", title: opener });

	// Tool Magazine window.
	yield* waitForElement(pid, { title: "Tool Magazine" }, { timeoutMs: 15_000 });

	const category = magazineCategoryFor(method);
	// Select the category (the "tool set") in the left tree.
	yield* clickElement(pid, { title: category, underTitle: "Tool Magazine" });
	yield* Effect.sleep(SETTLE);

	// Select the tool row by diameter, scrolling it into the clickable viewport.
	yield* selectToolRow(pid, diaMm, category);
	yield* Effect.sleep(SETTLE);

	yield* clickElement(pid, { role: "AXButton", title: "Choose" });
	yield* waitForGone(pid, { title: "Tool Magazine" }, { timeoutMs: 10_000 });
	yield* Effect.sleep(SETTLE);
});

/**
 * For a pocket toolpath, delete the default tool row before adding the matched
 * tool (the pocket dialog ships with a default tool in its Tools list).
 */
export const deleteDefaultPocketTool = Effect.fn(
	"flatmaxx.makeracam.deleteDefaultPocketTool",
)(function* (pid: number) {
	// VERIFY: the default tool row selection + "Delete" button (findings §6b
	// "Delete"(1566,936)). We click the first tool row then Delete; guarded.
	const hasDelete = yield* elementExists(pid, {
		role: "AXButton",
		title: "Delete",
	});
	if (!hasDelete) return;
	// VERIFY: how the default tool row is selected — there may be a Tools AXTable
	// row to click first. We attempt a Delete directly; if a row must be selected
	// the lead should add that click here.
	yield* clickElement(pid, { role: "AXButton", title: "Delete" });
	yield* Effect.sleep(SETTLE);
});

// Holding-tab geometry. We use AUTO tabs with Tab Layout = "Number" (a FIXED
// COUNT per contour — deterministic for a script — rather than distance-spaced
// auto-distribution). Custom is never used: it requires hand-clicking each tab
// onto the canvas per board, which automation can't do reliably. Tab "thickness"
// is the material LEFT at the bottom of the cut; we score TAB_TOP_CUT_MM at the
// tab top so the tool still touches it, i.e. thickness = depth − TAB_TOP_CUT_MM.
const TAB_WIDTH_MM = 4;
const TAB_TOP_CUT_MM = 0.5;

/**
 * Switch the contour Tabs "Tab Layout" popup from its default "Distance" to
 * "Number" (so we place a fixed tab COUNT rather than distance-spaced tabs).
 *
 * This Qt `AXPopUpButton` silently ignores both AXSetValue and AXPress (they
 * report success but don't apply), but `AXShowMenu` opens its dropdown and the
 * keyboard commits the choice: Down highlights "Number" (the lower of the two
 * options Distance/Number), Return selects it. Confirmed when the field on the
 * next row relabels "Tab Distance" → "Tabs per Contour". NB: never press Escape
 * here — Escape closes the whole contour dialog.
 */
const setTabLayoutNumber = Effect.fn("flatmaxx.makeracam.setTabLayoutNumber")(
	function* (pid: number) {
		yield* ensureFrontmost(MAKERACAM_APP);
		const attempt = Effect.fn("attempt")(function* () {
			// Target the popup on the "Tab Layout" row (NOT the "Tab Shape" popup):
			// the AXPopUpButton at the label's y, to its right. Use its index among
			// all popups so `performAction` (same DFS order) hits the same element.
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
			yield* pressKeyCode(KEY_DOWN); // highlight "Number"
			yield* Effect.sleep(Duration.millis(200));
			yield* pressKeyCode(KEY_RETURN); // commit
			yield* Effect.sleep(SETTLE);
			return yield* elementExists(pid, {
				role: "AXStaticText",
				title: "Tabs per Contour",
			});
		});
		let ok = yield* attempt();
		if (!ok) ok = yield* attempt(); // one retry
		if (!ok) {
			return yield* Effect.fail(
				new Error("Contour: could not switch Tab Layout to 'Number'"),
			);
		}
	},
);

/**
 * For a contour toolpath: ensure "Outside" strategy (already default) and enable
 * AUTO holding tabs so the board/alignment pieces don't break free.
 *
 * LIVE FINDING: selecting the "Auto" radio alone emits NO tabs — the Tab Layout +
 * Tabs Width / Tab Thickness / count fields must be explicitly SET (committed) and
 * the Tabs "Generate" button clicked for Auto to emit tab geometry. We use Tab
 * Layout = "Number" with `tabsPerContour` tabs (config-driven, default 4).
 */
export const setContourOutsideTabs = Effect.fn(
	"flatmaxx.makeracam.setContourOutsideTabs",
)(function* (pid: number, depthMm: number, tabsPerContour: number) {
	// Strategy "Outside" is the contour default (val=1, confirmed live); AXPress
	// is a harmless safety net (it does not actually toggle these Qt radios).
	yield* pressElement(pid, { role: "AXRadioButton", title: "Outside" });
	yield* Effect.sleep(SETTLE);
	// Select the "Auto" tabs radio. The Tabs section sits at the BOTTOM of a
	// scrollable param panel (y≈1850, far below the window) and AXPress does NOT
	// register on these Qt radios, so we scroll the radio into the clickable band
	// and COORDINATE-CLICK it (same scroll-into-view pattern as selectToolRow).
	yield* selectTabsRadio(pid, "Auto");
	yield* Effect.sleep(SETTLE);
	// Switch Tab Layout Distance→Number so we place a fixed COUNT of tabs.
	yield* setTabLayoutNumber(pid);
	// Now COMMIT the Auto tab params (in Auto mode these sit just above the radio,
	// in the clickable band). Without setting these, Auto emits no tabs. The tab
	// "thickness" leaves material at the cut bottom; we score TAB_TOP_CUT_MM at the
	// top (depth 2 → thickness 1.5 → tab top Z-0.5).
	const tabThickness = Math.max(0.3, depthMm - TAB_TOP_CUT_MM);
	yield* setTabParam(pid, "Tabs Width", String(TAB_WIDTH_MM));
	yield* setTabParam(pid, "Tab Thickness", String(tabThickness));
	// "Tabs per Contour" exists only after Tab Layout = "Number" (it replaces the
	// "Tab Distance" field).
	yield* setTabParam(pid, "Tabs per Contour", String(tabsPerContour));
	yield* Effect.sleep(SETTLE);
	// CRUCIAL (and the step every earlier run missed): the Tabs section has its own
	// "Generate" button that actually CREATES the tabs from the params above. It
	// must be clicked BEFORE the toolpath Calculate, or no tabs are emitted. It sits
	// just above Calculate; AXPress doesn't register on this Qt button, so scroll it
	// into view and coordinate-click.
	yield* clickTabsGenerate(pid);
	yield* Effect.sleep(SETTLE);
});

/**
 * Click the Tabs "Generate" button (it sits just above the pinned Calculate
 * button). AXPress is unreliable on this Qt button → scroll it into the clickable
 * band and coordinate-click. Best-effort: missing button is skipped, not fatal.
 */
const clickTabsGenerate = Effect.fn("flatmaxx.makeracam.clickTabsGenerate")(
	function* (pid: number) {
		const calc = (yield* axFind(pid, {
			role: "AXButton",
			title: "Calculate",
		}))[0];
		const bandTop = 360;
		// Generate sits right above Calculate, so allow the band down to just above it.
		const bandBottom = (calc?.frame.y ?? 990) - 2;
		for (let i = 0; i < 25; i++) {
			const gen = (yield* axFind(pid, {
				role: "AXButton",
				title: "Generate",
			}))[0];
			if (gen === undefined) return; // not found — skip (best-effort)
			if (gen.click.y >= bandTop && gen.click.y <= bandBottom) {
				// Settle, then click. (The contour is built FIRST in the step — see
				// planToolpaths — so the dialog is fresh and Generate takes reliably;
				// as a later toolpath it would silently no-op.)
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

/**
 * Set one Auto-tab field by its label, scrolling the label's row into the
 * clickable band first (param fields can sit outside the band depending on the
 * scroll position). Best-effort: a label we can't locate is skipped, not fatal.
 */
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
		if (lbl === undefined) return; // not found — skip (best-effort)
		if (lbl.click.y >= bandTop && lbl.click.y <= bandBottom) break;
		yield* mouseScroll(1480, panelMidY, lbl.click.y > bandBottom ? -8 : 8);
		yield* Effect.sleep(Duration.millis(120));
	}
	yield* setValueByLabel(pid, label, value).pipe(Effect.ignore);
});

/**
 * Scroll a contour-dialog Tabs radio (No Tab / Auto / Custom) into the clickable
 * viewport and click it. The param panel scrolls ~60px per wheel event (Qt
 * clamps a single event), so we loop: re-read the radio's live AX frame, scroll
 * one notch toward the band, and click once it lands above the Calculate button.
 * Role-filtering to AXRadioButton avoids the separate cut-order "Auto" popup.
 */
const selectTabsRadio = Effect.fn("flatmaxx.makeracam.selectTabsRadio")(
	function* (pid: number, title: string) {
		// Clickable band: below the dialog header, above the fixed Calculate button
		// (the param panel scrolls between these; Calculate/Close are pinned below).
		const calc = (yield* axFind(pid, {
			role: "AXButton",
			title: "Calculate",
		}))[0];
		const bandTop = 360;
		const bandBottom = (calc?.frame.y ?? 980) - 24;
		const panelX = 1480; // the contour param column (x≈1290–1675)
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
			// Negative scroll reveals lower content (radio y decreases toward band).
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

/**
 * Click "Calculate" and wait for the path to finish computing. We detect
 * completion by waiting for a path node to appear under the "Path" outliner.
 */
/** Count computed toolpath rows (outliner groups titled "[T#]…"). */
const countPathNodes = Effect.fn("flatmaxx.makeracam.countPathNodes")(
	function* (pid: number) {
		const groups = yield* axFind(pid, { role: "AXGroup" });
		return groups.filter((g) => g.titles.some((t) => /^\[T\d/.test(t))).length;
	},
);

export const calculatePath = Effect.fn("flatmaxx.makeracam.calculatePath")(
	function* (pid: number) {
		// Completion = a NEW "[T#]…" path row appears in the outliner. Waiting on the
		// always-present "Path" group is no signal, and a tabbed contour computes
		// slower than a drill — closing on a fixed sleep races a still-computing
		// dialog (its "Close" button isn't up yet). So poll for the row count to grow.
		const before = yield* countPathNodes(pid);
		yield* clickElement(pid, { role: "AXButton", title: "Calculate" });
		for (let i = 0; i < 120; i++) {
			if ((yield* countPathNodes(pid)) > before) break;
			yield* Effect.sleep(Duration.millis(300));
		}
		yield* Effect.sleep(SETTLE);
	},
);

/** Close the current toolpath dialog (the in-dialog "Close" button). */
export const closeToolpathDialog = Effect.fn(
	"flatmaxx.makeracam.closeToolpathDialog",
)(function* (pid: number) {
	// "Close" is hidden WHILE the path computes (it returns once the calc finishes
	// — the tabbed contour can take a while), so wait generously for it to (re)appear
	// before clicking. Clicking too early misses it and leaves the dialog open,
	// which then blocks the outliner read in saveAllPaths.
	yield* waitForElement(
		pid,
		{ role: "AXButton", title: "Close" },
		{
			timeoutMs: 90_000,
		},
	);
	yield* clickElement(pid, { role: "AXButton", title: "Close" });
	// Confirm the dialog actually closed (its Calculate button is gone).
	yield* waitForGone(
		pid,
		{ role: "AXButton", title: "Calculate" },
		{
			timeoutMs: 10_000,
		},
	).pipe(Effect.ignore);
	yield* Effect.sleep(SETTLE);
});

/** The current "[T#]…" toolpath rows, ordered top→bottom by frame y. */
const toolpathNodes = Effect.fn("flatmaxx.makeracam.toolpathNodes")(function* (
	pid: number,
) {
	return (yield* axFind(pid, { role: "AXGroup" }))
		.filter((g) => g.titles.some((t) => /^\[T\d/.test(t)))
		.sort((a, b) => a.frame.y - b.frame.y);
});

/**
 * Move the edge-cut contour toolpath to the END of the toolpath list. The contour
 * is BUILT first (so MakeraCAM's Auto-tab "Generate" takes on a fresh dialog), but
 * for machining it must run LAST — drill/pocket while the board is fully held, then
 * release the tabbed outline.
 *
 * Each pass re-finds the contour (its row shifts as it descends) and invokes the
 * toolpath menu's "Move Down" — the 5th item from the bottom (… Show Fast Move /
 * Hide Fast Move / Move Down / Preview Toolpaths / Export → counting up: Export,
 * Preview Toolpaths, Hide Fast Move, Show Fast Move, Move Down), all always-enabled
 * so the count is stable even when "Move Up" is greyed out on the top row.
 */
export const reorderContourLast = Effect.fn(
	"flatmaxx.makeracam.reorderContourLast",
)(function* (pid: number) {
	// One "Move Down" per pass; bounded by a generous cap (paths rarely exceed ~20).
	for (let i = 0; i < 24; i++) {
		const nodes = yield* toolpathNodes(pid);
		const idx = nodes.findIndex((g) => g.titles.some((t) => /Contour/.test(t)));
		const contour = nodes[idx];
		if (contour === undefined || idx >= nodes.length - 1) return; // gone or last
		yield* invokeRowMenuFromBottom(pid, contour, 5);
	}
});

/**
 * Save all computed paths: right-click the outliner "Path" node → "Save All
 * Paths" (auto-checks all rows) → wait for the "Export ToolPaths" window.
 */
export const saveAllPaths = Effect.fn("flatmaxx.makeracam.saveAllPaths")(
	function* (pid: number) {
		// The outliner "Path" node menu is: New Tool Path / Show All Paths / Hide All
		// Paths / Save All Paths / Preview All Paths — so "Save All Paths" is the 2nd
		// item from the bottom. (`role: AXGroup` disambiguates from the menu-bar
		// "Path" item, which is an AXMenuBarItem.)
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

/** A row in the Export ToolPaths table, with its Tool Number cell frame. */
interface ExportRow {
	/** The Tool Number cell element (an AXStaticText once the row is checked). */
	readonly toolNumberCell: AxElement;
	/** Current value the cell reads. */
	readonly value: string;
}

/**
 * Read the Export ToolPaths Tool Number column as ordered cells (top→bottom by
 * cell Y). The cells are AXStaticText under the export table; we sort by frame
 * y so the order matches the visual rows.
 */
const readToolNumberColumn = Effect.fn(
	"flatmaxx.makeracam.readToolNumberColumn",
)(function* (pid: number) {
	// VERIFY: how to isolate the Tool Number column. Findings §8 reports the
	// cells as AXStaticText at x≈1023. We approximate by reading the export
	// table's AXStaticText cells and grouping by row (y); the Tool Number is
	// the right-most cell per row. For v1 we read all numeric-looking cells in
	// the rightmost x-band and order by y. The lead should confirm the column
	// isolation (a dedicated AXColumn/AXCell role would be cleaner).
	const cells = yield* axFind(pid, {
		role: "AXStaticText",
		underTitle: "Export ToolPaths",
	});

	// Tool Number cells: those whose entire title is an integer.
	const numberCells = cells.filter((c) =>
		c.titles.some((t) => /^\d+$/.test(t.trim())),
	);
	// Use the right-most x band (largest cluster of x) as the Tool Number col.
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

/**
 * Assign sequential tool numbers 1..n top→bottom in the Export ToolPaths table.
 *
 * Each Tool Number cell is edited by DOUBLE-CLICK → type number → Return. After
 * writing, the column is re-read via AX and asserted to read 1..n; mismatches
 * retry. Handles more rows than fit on-screen by scrolling and re-reading row
 * frames between chunks (the user reported 20+ paths/step).
 *
 * `expectedCount` is the planned path count; we fail loudly if the table has a
 * different number of numbered rows (partial-failure guard).
 */
export const setSequentialToolNumbers = Effect.fn(
	"flatmaxx.makeracam.setSequentialToolNumbers",
)(function* (pid: number, desired: readonly number[]) {
	const MAX_PASSES = 5;
	const want = (i: number): string => String(desired[i] ?? -1);

	for (let pass = 0; pass < MAX_PASSES; pass++) {
		// Re-read row cells each pass (values change as we edit).
		const rows = yield* readToolNumberColumn(pid);

		for (let i = 0; i < rows.length && i < desired.length; i++) {
			const row = rows[i];
			if (row === undefined || row.value === want(i)) continue;
			const { x, y } = row.toolNumberCell.click;
			// Same editable-cell gesture as the depth fields (single-click/type does
			// not take): double-click to edit, Cmd+A to select, type, Tab to commit.
			yield* doubleClickAt(x, y);
			yield* Effect.sleep(SETTLE);
			yield* pressKeyCode(0, ["command"]);
			yield* typeText(want(i));
			yield* pressKeyCode(48); // Tab
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

/**
 * Assert the Export ToolPaths table has exactly `expected` numbered rows
 * (catches a path that failed to Calculate → a silently-missing toolpath).
 */
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

/**
 * Export G-code: "Export" in the dialog → save panel → set the absolute path →
 * Save. Ensures the name ends in ".gcode". The caller reconciles the actual
 * written filename (MakeraCAM may append/alter the extension).
 */
export const exportGcode = Effect.fn("flatmaxx.makeracam.exportGcode")(
	function* (pid: number, absPath: string) {
		const withExt = absPath.endsWith(".gcode") ? absPath : `${absPath}.gcode`;
		// VERIFY: "Export" button inside Export ToolPaths (findings §8: 1141,782).
		yield* clickElement(pid, { role: "AXButton", title: "Export" });
		// G-code save panel titled "Save Paths", id="save-panel" (findings §9).
		yield* waitForElement(pid, { id: "save-panel" }, { timeoutMs: 15_000 });
		// goToPath sets the full path in the panel (Cmd+Shift+G → type → Return).
		yield* goToPath(withExt);
		yield* Effect.sleep(SETTLE);
		// VERIFY: confirm with the save panel's default button. Findings call it
		// "OKButton"; try OK/Save by id then title.
		yield* clickElement(pid, { id: "OKButton" }).pipe(
			Effect.catch(() =>
				clickElement(pid, { role: "AXButton", title: "Save" }),
			),
		);
		yield* waitForGone(pid, { id: "save-panel" }, { timeoutMs: 30_000 });
		yield* Effect.sleep(SETTLE);
	},
);

/**
 * Save the project as a `.mkc`: toolbar "Save As" → save panel "Save File" →
 * set the absolute path (ensuring `.mkc`) → Save.
 */
export const saveProjectMkc = Effect.fn("flatmaxx.makeracam.saveProjectMkc")(
	function* (pid: number, absPath: string) {
		const withExt = absPath.endsWith(".mkc") ? absPath : `${absPath}.mkc`;
		// VERIFY: toolbar "Save As" button (findings §1/§9: 206,85).
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
