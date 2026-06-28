export const TOOL_DEF = /^T(\d+)C([0-9.]+)/;
export const TOOL_SELECT = /^T(\d+)\s*$/;
export const LEADING_CODE = /^([GM])(\d+)/;
export const X_COORD = /X(-?[0-9.]+)/;
export const Y_COORD = /Y(-?[0-9.]+)/;
export const APER_FUNCTION = /TA\.AperFunction/;
export const TOOL_DELETE = /\bTD\b/;
export const NON_PLATED = /NonPlated|NPTH/;
export const PLATED = /Plated|PTH/;
export const LINE_SPLIT = /\r?\n/;

export const PLUNGE_START_CODE = 15;
export const PLUNGE_END_CODE = 16;
export const DRILL_CODE = 5;
export const RAPID_MOVE_CODE = 0;
export const MOVE_CODES: readonly number[] = [0, 1, 2, 3];

export const MIN_ROUTE_POINTS = 2;
export const IN_TO_MM = 25.4;
export const COORD_DECIMALS = 4;

export const NO_TOOL = 0;
export const EPS = 1e-6;

export const MAX_SHOWN = 12;

export const ROUNDED_UP_FILE = "ROUNDED_UP.txt";
