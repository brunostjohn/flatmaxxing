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
import {
  layerSelectorFor,
  layerTitleKey,
  layerTitleMatchesStem,
  tabControlVisibility,
} from "./actionHelpers";
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
      .sort((a, b) => a.x - b.x);
    const threeAxis = boxes[0];
    if (threeAxis === undefined) {
      return yield* Effect.fail(
        new Error("Welcome: no 3-AXIS project-type checkbox found."),
      );
    }
    yield* clickAt({ x: threeAxis.x, y: threeAxis.y });

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

const layerGroupTitles = Effect.fnUntraced(function* (pid: number) {
  const groups = yield* axFind(pid, { role: "AXGroup" });
  return groups.flatMap((g) => g.titles);
});

export const importPcbFile = Effect.fn("flatmaxx.makeracam.importPcbFile")(
  function* (pid: number, absPath: string) {
    const isDxf = absPath.toLowerCase().endsWith(".dxf");
    const importButton = isDxf ? "Import 2D Model" : "Import PCB";
    const fileBase = basename(absPath);
    const stem = fileBase.replace(/\.[^.]+$/, "");

    const MAX_TRIES = 3;
    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
      const before = new Set((yield* layerGroupTitles(pid)).map(layerTitleKey));
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
          (titles) => !before.has(layerTitleKey(titles)),
        );
        if (added.length > 0) {
          const matching = added.find((titles) =>
            layerTitleMatchesStem(titles, stem),
          );
          return layerSelectorFor(matching ?? added[0]!, stem);
        }
        yield* Effect.sleep(Duration.millis(300));
      }
      yield* pressKeyCode(KEY_ESCAPE).pipe(Effect.ignore);
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
const KEY_A = 0;
const KEY_TAB = 48;

const PANEL_X = 1480;
const PANEL_BAND_TOP = 360;
const SCROLL_STEP = 8;

const scrollIntoBand = Effect.fnUntraced(function* (
  locate: () => Effect.Effect<AxElement | undefined>,
  opts: {
    readonly bandTop: number;
    readonly bandBottom: number;
    readonly anchor: { readonly x: number; readonly y: number };
    readonly maxTries: number;
    readonly settle: Duration.Duration;
    readonly notFound: string;
    readonly outOfReach: string;
  },
) {
  for (let i = 0; i < opts.maxTries; i++) {
    const el = yield* locate();
    if (el === undefined) {
      return yield* Effect.fail(new Error(opts.notFound));
    }
    if (tabControlVisibility(el, opts.bandTop, opts.bandBottom) === "visible") {
      return el;
    }
    yield* mouseScroll(
      opts.anchor,
      el.cy > opts.bandBottom ? -SCROLL_STEP : SCROLL_STEP,
    );
    yield* Effect.sleep(opts.settle);
  }
  return yield* Effect.fail(new Error(opts.outOfReach));
});

const replaceFieldValue = Effect.fnUntraced(function* (
  x: number,
  y: number,
  value: string,
  afterFocus: Duration.Duration,
) {
  yield* doubleClickAt({ x, y });
  yield* Effect.sleep(afterFocus);
  yield* pressKeyCode(KEY_A, ["command"]);
  yield* typeText(value);
  yield* pressKeyCode(KEY_TAB);
  yield* Effect.sleep(SETTLE);
});

const contextMenuOpen = Effect.fnUntraced(function* (pid: number) {
  const menus = yield* axFind(pid, { role: "AXMenu" });
  return menus.some((m) => m.w > 0 && m.h > 0);
});

const dismissContextMenus = Effect.fnUntraced(function* (pid: number) {
  for (let i = 0; i < 6; i++) {
    if (!(yield* contextMenuOpen(pid))) return;
    yield* pressKeyCode(KEY_ESCAPE);
    yield* Effect.sleep(Duration.millis(150));
  }
});

const invokeRowMenuFromBottom = Effect.fn(
  "flatmaxx.makeracam.invokeRowMenuFromBottom",
)(function* (pid: number, row: AxElement, fromBottom: number) {
  yield* ensureFrontmost(MAKERACAM_APP);
  yield* dismissContextMenus(pid);

  const { cx: x, cy: y } = row;
  const tryOpen = Effect.fnUntraced(function* () {
    yield* mouseMove({ x: x - 40, y });
    yield* Effect.sleep(Duration.millis(50));
    yield* mouseMove({ x, y });
    yield* Effect.sleep(Duration.millis(100));
    yield* rightClickAt({ x, y });
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
)(function* (pid: number, layerSelector: string) {
  const row = yield* waitForElement(
    pid,
    { role: "AXGroup", titleContains: layerSelector },
    { timeoutMs: 10_000 },
  );
  yield* invokeRowMenuFromBottom(pid, row, 1);
});

const toolpathLabel = (kind: ToolpathKind) =>
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
      title: toolpathLabel(kind),
    });
    yield* waitForElement(
      pid,
      { role: "AXStaticText", title: toolpathLabel(kind) },
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
      .filter((f) => Math.abs(f.y - label.y) <= 12 && f.x > label.x)
      .sort((a, b) => a.x - b.x)[0];
    if (field === undefined) {
      return yield* Effect.fail(
        new Error(`no text field on the row of "${labelTitle}"`),
      );
    }
    yield* replaceFieldValue(field.cx, field.cy, value, Duration.millis(200));
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

const diaPrefix = (label: string) => {
  const beforeStar = label.split("*")[0] ?? "";
  const m = beforeStar.match(/([0-9]*\.?[0-9]+)/);
  return m?.[1] !== undefined ? Number.parseFloat(m[1]) : Number.NaN;
};

const toolListTable = Effect.fnUntraced(function* (pid: number) {
  const tables = (yield* axFind(pid, { role: "AXTable" }))
    .filter((t) => t.x < 900)
    .sort((a, b) => a.y - b.y);
  return tables[0];
});

const selectToolRow = Effect.fnUntraced(function* (
  pid: number,
  diaMm: number,
  category: string,
) {
  const table = yield* toolListTable(pid);
  if (table === undefined) {
    return yield* Effect.fail(new Error("Tool Magazine: no tool-list table"));
  }
  const EPS = 1e-6;
  const target = yield* scrollIntoBand(
    () =>
      axFind(pid, { role: "AXStaticText", underTitle: "Tool Magazine" }).pipe(
        Effect.map((cells) =>
          cells.find((c) =>
            Object.values(c.titles).some(
              (t) => Math.abs(diaPrefix(t) - diaMm) < EPS,
            ),
          ),
        ),
      ),
    {
      bandTop: table.y + 8,
      bandBottom: table.y + table.h - 18,
      anchor: {
        x: table.x + Math.round(table.w / 2),
        y: table.y + Math.round(table.h / 2),
      },
      maxTries: 12,
      settle: SETTLE,
      notFound: `Tool Magazine: no ${category} row with diameter ${diaMm}`,
      outOfReach: `Tool Magazine: could not scroll the ${diaMm}mm row into view`,
    },
  );
  yield* clickAt({ x: target.cx, y: target.cy });
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

const setTabLayoutNumber = Effect.fnUntraced(function* (pid: number) {
  yield* ensureFrontmost(MAKERACAM_APP);
  const attempt = Effect.fnUntraced(function* () {
    const label = (yield* axFind(pid, {
      role: "AXStaticText",
      title: "Tab Layout",
    }))[0];
    if (label === undefined) return false;
    const popups = yield* axFind(pid, { role: "AXPopUpButton" });
    const idx = popups.findIndex(
      (p) => Math.abs(p.y - label.y) <= 14 && p.x > label.x,
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
});

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

const clickTabsGenerate = Effect.fnUntraced(function* (pid: number) {
  const calc = (yield* axFind(pid, {
    role: "AXButton",
    title: "Calculate",
  }))[0];
  const gen = yield* scrollIntoBand(
    () =>
      axFind(pid, { role: "AXButton", title: "Generate" }).pipe(
        Effect.map((a) => a[0]),
      ),
    {
      bandTop: PANEL_BAND_TOP,
      bandBottom: (calc?.y ?? 990) - 2,
      anchor: { x: PANEL_X, y: 600 },
      maxTries: 25,
      settle: Duration.millis(120),
      notFound: "Contour: Tabs Generate button not found",
      outOfReach:
        "Contour: could not scroll the Tabs Generate button into view",
    },
  );
  yield* Effect.sleep(Duration.millis(250));
  yield* clickAt({ x: gen.cx, y: gen.cy });
  yield* Effect.sleep(Duration.millis(400));
});

const setTabParam = Effect.fnUntraced(function* (
  pid: number,
  label: string,
  value: string,
) {
  const calc = (yield* axFind(pid, {
    role: "AXButton",
    title: "Calculate",
  }))[0];
  const bandBottom = (calc?.y ?? 980) - 24;
  yield* scrollIntoBand(
    () =>
      axFind(pid, { role: "AXStaticText", title: label }).pipe(
        Effect.map((a) => a[0]),
      ),
    {
      bandTop: PANEL_BAND_TOP,
      bandBottom,
      anchor: { x: PANEL_X, y: Math.round((PANEL_BAND_TOP + bandBottom) / 2) },
      maxTries: 30,
      settle: Duration.millis(120),
      notFound: `Contour: "${label}" field not found`,
      outOfReach: `Contour: could not scroll "${label}" into the visible band`,
    },
  );
  yield* setValueByLabel(pid, label, value);
});

const selectTabsRadio = Effect.fnUntraced(function* (
  pid: number,
  title: string,
) {
  const calc = (yield* axFind(pid, {
    role: "AXButton",
    title: "Calculate",
  }))[0];
  const bandBottom = (calc?.y ?? 980) - 24;
  const radio = yield* scrollIntoBand(
    () =>
      axFind(pid, { role: "AXRadioButton", title }).pipe(
        Effect.map((a) => a[0]),
      ),
    {
      bandTop: PANEL_BAND_TOP,
      bandBottom,
      anchor: { x: PANEL_X, y: Math.round((PANEL_BAND_TOP + bandBottom) / 2) },
      maxTries: 30,
      settle: Duration.millis(120),
      notFound: `Contour: Tabs '${title}' radio not found`,
      outOfReach: `Contour: could not scroll Tabs '${title}' into the band`,
    },
  );
  yield* clickAt({ x: radio.cx, y: radio.cy });
});

const isToolpathNode = (g: AxElement) =>
  Object.values(g.titles).some((t) => /^\[T\d/.test(t));

export const calculatePath = Effect.fn("flatmaxx.makeracam.calculatePath")(
  function* (pid: number) {
    const before = (yield* toolpathNodes(pid)).length;
    yield* clickElement(pid, { role: "AXButton", title: "Calculate" });
    for (let i = 0; i < 120; i++) {
      if ((yield* toolpathNodes(pid)).length > before) break;
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

const toolpathNodes = Effect.fnUntraced(function* (pid: number) {
  return (yield* axFind(pid, { role: "AXGroup" }))
    .filter(isToolpathNode)
    .sort((a, b) => a.y - b.y);
});

export const reorderContourLast = Effect.fn(
  "flatmaxx.makeracam.reorderContourLast",
)(function* (pid: number) {
  for (let i = 0; i < 24; i++) {
    const nodes = yield* toolpathNodes(pid);
    const idx = nodes.findIndex((g) =>
      Object.values(g.titles).some((t) => /Contour/.test(t)),
    );
    const contour = nodes[idx];
    if (contour === undefined || idx >= nodes.length - 1) return;
    yield* invokeRowMenuFromBottom(pid, contour, 5);
  }
  return yield* Effect.fail(
    new Error(
      "Contour: could not move the edge-cut path to last after 24 attempts",
    ),
  );
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

const readToolNumberColumn = Effect.fnUntraced(function* (pid: number) {
  const cells = yield* axFind(pid, {
    role: "AXStaticText",
    underTitle: "Export ToolPaths",
  });

  const numberCells = cells.filter((c) =>
    Object.values(c.titles).some((t) => /^\d+$/.test(t.trim())),
  );
  if (numberCells.length === 0) return [] as readonly ExportRow[];
  const maxX = Math.max(...numberCells.map((c) => c.x));
  const colCells = numberCells.filter((c) => Math.abs(c.x - maxX) < 40);

  return colCells
    .slice()
    .sort((a, b) => a.y - b.y)
    .map((c) => ({
      toolNumberCell: c,
      value: (
        Object.values(c.titles).find((t) => /^\d+$/.test(t.trim())) ?? ""
      ).trim(),
    }));
});

export const setSequentialToolNumbers = Effect.fn(
  "flatmaxx.makeracam.setSequentialToolNumbers",
)(function* (pid: number, desired: readonly number[]) {
  const MAX_PASSES = 5;
  const want = (i: number) => String(desired[i] ?? -1);

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const rows = yield* readToolNumberColumn(pid);

    for (let i = 0; i < rows.length && i < desired.length; i++) {
      const row = rows[i];
      if (row === undefined || row.value === want(i)) continue;
      const { cx: x, cy: y } = row.toolNumberCell;
      yield* replaceFieldValue(x, y, want(i), SETTLE);
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
