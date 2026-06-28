import { maxPreviewColumns, maxPreviewRows } from "./constants";
import type { InlineImageSize, PngDimensions } from "./types";

interface ComputePreviewSizeArgs extends PngDimensions {
  readonly terminalColumns: number;
  readonly cellAspect: number;
}

const clampPositive = (value: number) => Math.max(1, Math.round(value));

export const computePreviewSize = ({
  width,
  height,
  terminalColumns,
  cellAspect,
}: ComputePreviewSizeArgs): InlineImageSize => {
  const aspect = height / width;
  const columns = Math.max(1, Math.min(terminalColumns - 2, maxPreviewColumns));
  const rows = clampPositive(columns * cellAspect * aspect);

  return rows <= maxPreviewRows
    ? { columns, rows }
    : {
        columns: clampPositive(maxPreviewRows / (cellAspect * aspect)),
        rows: maxPreviewRows,
      };
};
