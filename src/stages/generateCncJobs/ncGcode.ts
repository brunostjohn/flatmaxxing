import { Array } from "effect";
import type { AssembleOptions, ToolSection } from "./types";

export type { AssembleOptions, ToolSection } from "./types";

const SPINDLE_ON = /^M0?3\b/;
const SPINDLE_OFF = /^M0?5\b/;

export const extractToolpathBody = (gcode: string): string[] => {
  const lines = gcode.split(/\r?\n/).map((l) => l.trimEnd());
  const startIdx = lines.findIndex((l) => SPINDLE_ON.test(l.trim()));
  if (startIdx < 0) return [];
  const endIdx = lines.findIndex(
    (l, i) => i > startIdx && SPINDLE_OFF.test(l.trim()),
  );
  const end = endIdx < 0 ? lines.length : endIdx;
  return lines.slice(startIdx + 1, end).filter((l) => l.trim().length > 0);
};

const fmtZ = (z: number): string => z.toFixed(4);

const headerSection = (options: AssembleOptions): string[] => [
  ...Array.map(options.headerComments, (comment) => `(${comment})`),
  "",
  "G21",
  "G90",
  "G94",
  `G00 Z${fmtZ(options.endZ)}`,
];

const toolSection = (
  section: ToolSection,
  options: AssembleOptions,
): string[] => [
  "",
  "M5",
  `G00 Z${fmtZ(options.seamZ)}`,
  `M6 T${section.toolNumber}`,
  `(MSG, Change to ${section.label})`,
  `M3 S${section.spindleSpeed}`,
  `G00 Z${fmtZ(section.travelZ)}`,
  ...section.body,
  `G00 Z${fmtZ(options.seamZ)}`,
];

const footerSection = (options: AssembleOptions): string[] => [
  "",
  "M5",
  `G00 Z${fmtZ(options.endZ)}`,
  "G00 X0.0000 Y0.0000",
  "M30",
  "",
];

export const assembleCarveraGcode = (
  sections: readonly ToolSection[],
  options: AssembleOptions,
): string =>
  Array.flatten([
    headerSection(options),
    Array.flatMap(sections, (section) => toolSection(section, options)),
    footerSection(options),
  ]).join("\n");
