import type { CncJobPlan } from "@/cnc/cncJobPlan";
import type { Side } from "@/config";

export interface SideGerber {
  readonly side: Side;
  /** Absolute path to the copper gerber (`*-F_Cu.gtl` / `*-B_Cu.gbl`). */
  readonly copperGerber: string;
}

export interface FlatcamScriptInput {
  readonly sides: readonly SideGerber[];
  /** Absolute path to `*-Edge_Cuts.gm1` (outline; used for back mirror axis + bounds). */
  readonly edgeCutsGerber: string;
  readonly mirrorAxis: "X" | "Y";
  readonly plan: CncJobPlan;
  /** Directory the per-(side,tool) `.nc` files are written to. */
  readonly scratchDir: string;
  /** Absolute path for the outline-bounds dump (consumed for alignment drills). */
  readonly boundsFile: string;
  /**
   * Absolute path of a sentinel file written as the very last step. FlatCAM
   * `--headless` does not self-terminate (its systray keeps the Qt loop alive),
   * so the runner waits for this file, then kills the process.
   */
  readonly doneFile: string;
}

const num = (value: number): string =>
  Number.parseFloat(value.toFixed(6)).toString();

/** Deterministic scratch file name for a side's isolation job. */
export const isoNcName = (side: Side): string => `${side}-iso.nc`;
/** Deterministic scratch file name for a side's NCC tool `uid`. */
export const nccNcName = (side: Side, uid: number): string =>
  `${side}-ncc-${uid}.nc`;

const cncjobArgs = (
  plan: CncJobPlan,
  feedRate: number,
  zCutFeedRate: number,
  spindleSpeed: number,
  diameter: number,
  cutDepth: number,
): string =>
  [
    `-dia ${num(diameter)}`,
    `-z_cut ${num(-Math.abs(cutDepth))}`,
    `-z_move ${num(plan.clearance.travelZ)}`,
    `-feedrate ${num(feedRate)}`,
    `-feedrate_z ${num(zCutFeedRate)}`,
    `-feedrate_rapid ${num(plan.clearance.rapidFeedRate)}`,
    `-endz ${num(plan.clearance.endZ)}`,
    `-spindlespeed ${Math.round(spindleSpeed)}`,
    "-pp default",
  ].join(" ");

/**
 * Builds the headless FlatCAM Tcl shellfile. Notes baked in from the spike:
 *  - no `set_sys` (broken in this build; default units are MM);
 *  - back side is mirrored about the outline bbox centre (`-box`), which equals
 *    the alignment-drill pattern centre;
 *  - NCC is non-rest multi-tool (complementary clearing) bounded to the copper
 *    itself (`-all`); `-rest` is broken;
 *  - per-tool Z requires `split_geometry` + one `cncjob` per tool;
 *  - every object op is guarded on the object actually existing (empty copper
 *    layers, e.g. an unused back side, are skipped gracefully);
 *  - the script ends with `quit_app` so the process exits.
 */
export const buildFlatcamScript = (input: FlatcamScriptInput): string => {
  const { plan } = input;
  const tooldiaList = plan.ncc.tools.map((t) => num(t.diameter)).join(",");
  const lines: string[] = [];

  lines.push("new");
  lines.push(`open_gerber {${input.edgeCutsGerber}} -outname outline`);

  // Dump outline bounds for the alignment-drill Excellon (written in TS).
  lines.push(`set _bf [open {${input.boundsFile}} w]`);
  lines.push("fconfigure $_bf -buffering none");
  lines.push("set _ob [lindex [bounds outline] 0]");
  lines.push(
    'puts $_bf "[lindex $_ob 0] [lindex $_ob 1] [lindex $_ob 2] [lindex $_ob 3]"',
  );
  lines.push("close $_bf");

  for (const { side, copperGerber } of input.sides) {
    const cu = `${side}_cu`;
    const iso = `${side}_iso`;
    const ncc = `${side}_ncc`;

    lines.push("");
    lines.push(`# ---- ${side} ----`);
    lines.push(`open_gerber {${copperGerber}} -outname ${cu}`);
    // Guard the whole side on the copper object existing (skip empty layers).
    lines.push(
      `if {[lsearch -exact [split [string trim [get_names]] "\\n"] ${cu}] >= 0} {`,
    );

    if (side === "back") {
      lines.push(`    mirror ${cu} -axis ${input.mirrorAxis} -box outline`);
    }

    // Isolation (V-bit).
    lines.push(
      `    isolate ${cu} -dia ${num(plan.isolation.diameter)} -passes ${Math.round(
        plan.isolation.passes,
      )} -overlap ${num(plan.isolation.overlap)} -iso_type ${Math.round(
        plan.isolation.isoType,
      )} -outname ${iso}`,
    );
    lines.push(
      `    cncjob ${iso} ${cncjobArgs(
        plan,
        plan.isolation.feedRate,
        plan.isolation.zCutFeedRate,
        plan.isolation.spindleSpeed,
        plan.isolation.diameter,
        plan.isolation.cutDepth,
      )} -outname ${iso}_cnc`,
    );
    lines.push(
      `    write_gcode ${iso}_cnc {${input.scratchDir}/${isoNcName(side)}}`,
    );

    // NCC: non-rest multi-tool, complementary clearing, bounded to the copper.
    lines.push(
      `    ncc ${cu} -tooldia ${tooldiaList} -all -rest False -order rev -overlap ${num(
        plan.ncc.overlap,
      )} -margin ${num(plan.ncc.margin)} -method ${plan.ncc.method} -outname ${ncc}`,
    );
    lines.push(`    split_geometry ${ncc}`);

    // One cncjob per tool that actually produced geometry, at its own dia + Z.
    for (const tool of plan.ncc.tools) {
      const obj = `${ncc}_tool_${tool.uid}`;
      lines.push(
        `    if {[lsearch -exact [split [string trim [get_names]] "\\n"] ${obj}] >= 0} {`,
      );
      lines.push(
        `        cncjob ${obj} ${cncjobArgs(
          plan,
          tool.feedRate,
          tool.zCutFeedRate,
          tool.spindleSpeed,
          tool.diameter,
          tool.cutDepth,
        )} -outname ${obj}_cnc`,
      );
      lines.push(
        `        write_gcode ${obj}_cnc {${input.scratchDir}/${nccNcName(side, tool.uid)}}`,
      );
      lines.push("    }");
    }

    lines.push("}");
  }

  // Sentinel: written only after every job has been written to disk. The runner
  // polls for this, since quit_app does not reliably terminate headless FlatCAM.
  lines.push("");
  lines.push(`set _df [open {${input.doneFile}} w]`);
  lines.push('puts $_df "done"');
  lines.push("close $_df");
  lines.push("quit_app");
  lines.push("");
  return lines.join("\n");
};
