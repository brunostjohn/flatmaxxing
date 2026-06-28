import { Effect, Schema } from "effect";
import {
  defaultDistance,
  defaultElectroplatingAdditionalDistance,
  defaultRange,
  defaultXToolWindow,
} from "./defaults";

export const SideSchema = Schema.Literals(["front", "back"]).annotate({
  title: "Board side",
  description: 'Which copper side of the board: "front" or "back".',
});

export const RangeSchema = Schema.Struct({
  min: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultRange.min)),
  ).annotate({ title: "Minimum", description: "Inclusive lower bound." }),
  max: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultRange.max)),
  ).annotate({ title: "Maximum", description: "Inclusive upper bound." }),
}).annotate({
  title: "Range",
  description: "Inclusive numeric validation range.",
});

export const DistanceSchema = Schema.Struct({
  x: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultDistance.x)),
  ).annotate({ title: "X distance", description: "Horizontal offset (mm)." }),
  y: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultDistance.y)),
  ).annotate({ title: "Y distance", description: "Vertical offset (mm)." }),
}).annotate({
  title: "Distance",
  description: "Horizontal/vertical offset in millimetres.",
});

export const EdgeDistanceSchema = Schema.Struct({
  left: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingAdditionalDistance.left),
    ),
  ).annotate({
    title: "Left edge",
    description: "Offset added to the left edge (mm).",
  }),
  right: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingAdditionalDistance.right),
    ),
  ).annotate({
    title: "Right edge",
    description: "Offset added to the right edge (mm).",
  }),
  top: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingAdditionalDistance.top),
    ),
  ).annotate({
    title: "Top edge",
    description: "Offset added to the top edge (mm).",
  }),
  bottom: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingAdditionalDistance.bottom),
    ),
  ).annotate({
    title: "Bottom edge",
    description: "Offset added to the bottom edge (mm).",
  }),
}).annotate({
  title: "Edge distances",
  description: "Per-edge offsets in millimetres.",
});

export const WindowSchema = Schema.Struct({
  width: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultXToolWindow.width)),
  ).annotate({ title: "Window width", description: "Window width in pixels." }),
  height: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultXToolWindow.height)),
  ).annotate({
    title: "Window height",
    description: "Window height in pixels.",
  }),
}).annotate({
  title: "Window size",
  description: "Automation window dimensions in pixels.",
});
