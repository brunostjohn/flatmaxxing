import type { IDxf } from "dxf-parser";
import type { Schema } from "effect";
import type { DxfWorkerResponseSchema } from "./schema";

export interface DxfWorkerRequest {
  readonly op: "bounds" | "plottable";
  readonly dxf: IDxf;
}

export type DxfWorkerResponse = Schema.Schema.Type<
  typeof DxfWorkerResponseSchema
>;
