import { expect, test } from "bun:test";
import type { CncJobPlan } from "@/cnc/cncJobPlan";
import { buildFlatcamScript, isoNcName, nccNcName } from "./buildFlatcamScript";

const plan: CncJobPlan = {
  isolation: {
    diameter: 0.2,
    cutDepth: 0.05,
    passes: 3,
    overlap: 60,
    isoType: 2,
    feedRate: 120,
    zCutFeedRate: 60,
    spindleSpeed: 15000,
    label: "0.2mm V-bit",
  },
  ncc: {
    tools: [
      {
        uid: 1,
        kind: "mill",
        diameter: 0.8,
        cutDepth: 0.075,
        feedRate: 200,
        zCutFeedRate: 80,
        spindleSpeed: 12000,
        label: "0.8mm mill",
      },
      {
        uid: 2,
        kind: "vbit",
        diameter: 0.2,
        cutDepth: 0.05,
        feedRate: 200,
        zCutFeedRate: 80,
        spindleSpeed: 12000,
        label: "0.2mm V-bit",
      },
    ],
    overlap: 50,
    margin: 1,
    method: "standard",
    feedRate: 200,
    zCutFeedRate: 80,
    spindleSpeed: 12000,
  },
  clearance: {
    travelZ: 2,
    rapidFeedRate: 3000,
    endZ: 15,
    seamZ: 15,
  },
} as unknown as CncJobPlan;

const input = {
  sides: [
    { side: "front", copperGerber: "/g/board-F_Cu.gtl" },
    { side: "back", copperGerber: "/g/board-B_Cu.gbl" },
  ],
  edgeCutsGerber: "/g/board-Edge_Cuts.gm1",
  mirrorAxis: "X",
  plan,
  scratchDir: "/scratch",
  boundsFile: "/scratch/bounds.txt",
  doneFile: "/scratch/done.flag",
} as const;

test("the script opens the outline, dumps bounds, and quits at the end", () => {
  const script = buildFlatcamScript(input);
  const lines = script.split("\n");

  expect(lines[0]).toBe("new");
  expect(script).toContain(
    "open_gerber {/g/board-Edge_Cuts.gm1} -outname outline",
  );
  expect(script).toContain("bounds outline");
  expect(script.trimEnd().endsWith("quit_app")).toBe(true);
});

test("only the back side is mirrored about the outline box", () => {
  const script = buildFlatcamScript(input);
  const mirrors = script.match(/^\s*mirror /gm) ?? [];
  expect(mirrors).toHaveLength(1);
  expect(script).toContain("mirror back_cu -axis X -box outline");
  expect(script).not.toContain("mirror front_cu");
});

test("each side emits one cncjob per NCC tool guarded on the split object", () => {
  const script = buildFlatcamScript(input);
  for (const side of ["front", "back"] as const) {
    expect(script).toContain(`split_geometry ${side}_ncc`);
    expect(script).toContain(`${side}_ncc_tool_1`);
    expect(script).toContain(`${side}_ncc_tool_2`);
    expect(script).toContain(
      `write_gcode ${side}_ncc_tool_1_cnc {/scratch/${nccNcName(side, 1)}}`,
    );
    expect(script).toContain(
      `write_gcode ${side}_iso_cnc {/scratch/${isoNcName(side)}}`,
    );
  }
});

test("the cncjob args carry a negative z_cut and the default postprocessor", () => {
  const script = buildFlatcamScript(input);
  expect(script).toContain("-z_cut -0.05");
  expect(script).toContain("-pp default");
  expect(script).toContain("-rest False");
  expect(script).toContain("-order rev");
});
