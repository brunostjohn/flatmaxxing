import type { Rect } from "@/macos";

/** Which of the two final machining steps a run produces. */
export type MakeracamStep = "plated" | "final";

/** How a single toolpath is created in MakeraCAM. */
export type ToolpathKind = "drill" | "pocket" | "contour";

/**
 * Options for one MakeraCAM step stage (`runPlatedHoles` / `runFinalCut`).
 *
 * Mirrors the skippable-stage option shape used elsewhere (`enabled` gates the
 * whole stage). Directory options are absolute paths resolved by config.
 */
export interface MakeracamStepOptions {
	/** When false the stage renders "skipped" and consumes no step number. */
	readonly enabled: boolean;
	/** Which step this stage runs. */
	readonly step: MakeracamStep;
	/** Absolute path to the MakeraCAM `.app` bundle. */
	readonly appPath: string;
	/**
	 * What to do if MakeraCAM is already running. v1 only supports "prompt",
	 * which (per the lead's stance) fails fast asking the user to close it.
	 */
	readonly existingProcess: "prompt";
	/** Cut/End depth applied to every toolpath dialog (mm). */
	readonly cutDepthMm: number;
	/** Auto-tab count per contour (contour dialog Tab Layout = "Number"). */
	readonly tabsPerContour: number;
	/** Absolute path to the categorized-drills directory (`./drills`). */
	readonly drillsDir: string;
	/** Absolute path to the G-code output directory (`./gcodes`). */
	readonly gcodeDir: string;
	/** Absolute path to the MakeraCAM project (`.mkc`) output directory (`./cnc`). */
	readonly cncDir: string;
	/** Absolute path to the generated edge-cut Gerber directory (`./gerbers`). */
	readonly gerbersDir: string;
	/** Forced main-window geometry for coordinate stability. */
	readonly windowBounds: Rect;
}

/**
 * One fully-resolved toolpath to build, in the order it must be created. Carries
 * everything the orchestrator needs to import the file, pick its tool, and name
 * its layer/path — derived by {@link selectStepDrills} for drills/pockets, plus
 * the edge-cut Gerber appended last as a contour.
 */
export interface PlannedToolpath {
	/** Source filename (basename, relative to its directory). */
	readonly file: string;
	/** Absolute path to the source file to import. */
	readonly absPath: string;
	/** Which toolpath dialog to open. */
	readonly kind: ToolpathKind;
	/** "PTH" | "NPTH" | "alignment" | "edge" — for diagnostics/ordering. */
	readonly category: string;
	/** "drills" | "pockets" | "contour" — the categorized method. */
	readonly method: string;
	/** Tool diameter to match in the Tool Magazine (mm). */
	readonly diameterMm: number;
	/**
	 * The 2D-layer group title MakeraCAM creates on import — used to right-click
	 * the correct layer for "Select Graphics". MakeraCAM titles imported PCB
	 * layers `"<filename>_<dia> mm"`, but the exact pattern is layout-derived;
	 * the orchestrator resolves the freshly-added group by diff instead.
	 */
	readonly layerTitle: string;
}

/** Parsed pieces of a categorized drill filename. */
export interface ParsedDrillFilename {
	/** Board name (may itself contain hyphens). */
	readonly board: string;
	/** "PTH" | "NPTH" | "alignment". */
	readonly category: string;
	/** "drills" | "pockets". */
	readonly method: string;
	/** Tool diameter (mm) parsed from the `<dia>mm` suffix. */
	readonly diameterMm: number;
}
