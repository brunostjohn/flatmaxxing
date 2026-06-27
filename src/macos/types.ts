import type { Duration } from "effect";

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface WaitOptions {
  readonly timeout: Duration.Input;
}
