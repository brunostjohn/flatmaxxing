import type { AxElementInfo } from "@flatmaxxing/accessibility";
import type { Duration, Effect } from "effect";

export interface ScrollIntoBandOptions {
  readonly bandTop: number;
  readonly bandBottom: number;
  readonly anchor: { readonly x: number; readonly y: number };
  readonly maxTries: number;
  readonly settle: Duration.Duration;
  readonly notFound: string;
  readonly outOfReach: string;
}

export type LocateElement = () => Effect.Effect<AxElementInfo | undefined>;

export interface ExportRow {
  readonly toolNumberCell: AxElementInfo;
  readonly value: string;
}
