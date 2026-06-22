import { TAU } from "./constants";

export function normalizeAngle(angle: number) {
  const normalized = angle % TAU;
  return normalized < 0 ? normalized + TAU : normalized;
}
