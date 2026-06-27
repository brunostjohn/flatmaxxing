import type { CncJobPlan } from "@/cnc/cncJobPlan";
import type { Side } from "@/config";
import { Array } from "effect";
import { FLATCAM_POSTPROCESSOR, NCC_ORDER, NCC_REST } from "./constants";
import type { FlatcamScriptInput, SideGerber } from "./types";

export type { FlatcamScriptInput, SideGerber } from "./types";

const num = (value: number): string =>
  Number.parseFloat(value.toFixed(6)).toString();

export const isoNcName = (side: Side): string => `${side}-iso.nc`;

export const nccNcName = (side: Side, uid: number): string =>
  `${side}-ncc-${uid}.nc`;

const objectExistsGuard = (name: string) =>
  `if {[lsearch -exact [split [string trim [get_names]] "\\n"] ${name}] >= 0} {`;

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
    `-pp ${FLATCAM_POSTPROCESSOR}`,
  ].join(" ");

const preambleSection = (input: FlatcamScriptInput): string[] => [
  "new",
  `open_gerber {${input.edgeCutsGerber}} -outname outline`,
  `set _bf [open {${input.boundsFile}} w]`,
  "fconfigure $_bf -buffering none",
  "set _ob [lindex [bounds outline] 0]",
  'puts $_bf "[lindex $_ob 0] [lindex $_ob 1] [lindex $_ob 2] [lindex $_ob 3]"',
  "close $_bf",
];

const isolationLines = (
  input: FlatcamScriptInput,
  side: Side,
  cu: string,
  iso: string,
): string[] => {
  const { plan } = input;
  return [
    `    isolate ${cu} -dia ${num(plan.isolation.diameter)} -passes ${Math.round(
      plan.isolation.passes,
    )} -overlap ${num(plan.isolation.overlap)} -iso_type ${Math.round(
      plan.isolation.isoType,
    )} -outname ${iso}`,
    `    cncjob ${iso} ${cncjobArgs(
      plan,
      plan.isolation.feedRate,
      plan.isolation.zCutFeedRate,
      plan.isolation.spindleSpeed,
      plan.isolation.diameter,
      plan.isolation.cutDepth,
    )} -outname ${iso}_cnc`,
    `    write_gcode ${iso}_cnc {${input.scratchDir}/${isoNcName(side)}}`,
  ];
};

const nccToolLines = (
  input: FlatcamScriptInput,
  side: Side,
  ncc: string,
): string[] =>
  Array.flatMap(input.plan.ncc.tools, (tool) => {
    const obj = `${ncc}_tool_${tool.uid}`;
    return [
      `    ${objectExistsGuard(obj)}`,
      `        cncjob ${obj} ${cncjobArgs(
        input.plan,
        tool.feedRate,
        tool.zCutFeedRate,
        tool.spindleSpeed,
        tool.diameter,
        tool.cutDepth,
      )} -outname ${obj}_cnc`,
      `        write_gcode ${obj}_cnc {${input.scratchDir}/${nccNcName(side, tool.uid)}}`,
      "    }",
    ];
  });

const sideSection = (
  input: FlatcamScriptInput,
  { side, copperGerber }: SideGerber,
): string[] => {
  const { plan } = input;
  const cu = `${side}_cu`;
  const iso = `${side}_iso`;
  const ncc = `${side}_ncc`;
  const tooldiaList = plan.ncc.tools.map((t) => num(t.diameter)).join(",");

  return [
    "",
    `# ---- ${side} ----`,
    `open_gerber {${copperGerber}} -outname ${cu}`,
    objectExistsGuard(cu),
    ...(side === "back"
      ? [`    mirror ${cu} -axis ${input.mirrorAxis} -box outline`]
      : []),
    ...isolationLines(input, side, cu, iso),
    `    ncc ${cu} -tooldia ${tooldiaList} -all -rest ${NCC_REST} -order ${NCC_ORDER} -overlap ${num(
      plan.ncc.overlap,
    )} -margin ${num(plan.ncc.margin)} -method ${plan.ncc.method} -outname ${ncc}`,
    `    split_geometry ${ncc}`,
    ...nccToolLines(input, side, ncc),
    "}",
  ];
};

const footerSection = (input: FlatcamScriptInput): string[] => [
  "",
  `set _df [open {${input.doneFile}} w]`,
  'puts $_df "done"',
  "close $_df",
  "quit_app",
  "",
];

export const buildFlatcamScript = (input: FlatcamScriptInput): string =>
  Array.flatten([
    preambleSection(input),
    Array.flatMap(input.sides, (side) => sideSection(input, side)),
    footerSection(input),
  ]).join("\n");
