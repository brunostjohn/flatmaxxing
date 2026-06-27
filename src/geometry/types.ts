export interface Coordinate {
  readonly x: number;
  readonly y: number;
}

export type PathCmd =
  | { readonly kind: "line"; readonly to: Coordinate }
  | {
      readonly kind: "arc";
      readonly to: Coordinate;
      readonly center: Coordinate;
      readonly cw: boolean;
    };
