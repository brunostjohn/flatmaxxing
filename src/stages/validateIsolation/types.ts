import type { DrcViolation } from "./schema";

export interface IsolationDrcResult {
  readonly clearanceViolations: readonly DrcViolation[];
  readonly totalViolations: number;
}

export interface PartitionedViolations {
  readonly blocking: readonly DrcViolation[];
  readonly ignored: readonly DrcViolation[];
}
