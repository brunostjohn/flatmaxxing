import {
  applyBoardFixes,
  validateBoard,
  validateBoardWithValidators,
  type BoardValidationContext,
  type BoardValidator,
} from "@/stages/kicad/validation/boardValidation";
import { expect, test } from "bun:test";
import { Effect } from "effect";
import { parseKicadPcb, type KicadPcb } from "kicadts";

test("validateBoard returns null when validators do not propose fixes", async () => {
  const { context } = parseBoardWithContext({
    setup: "(setup (aux_axis_origin 0 10) (grid_origin 0 10))",
  });

  const fixes = await validateBoard(context).pipe(Effect.runPromise);

  expect(fixes).toBeNull();
});

test("missing origins returns one origin fix", async () => {
  const { context } = parseBoardWithContext();

  const fixes = await validateBoard(context).pipe(Effect.runPromise);

  expect(fixes).toHaveLength(1);
  expect(fixes?.[0]?.id).toBe("kicad-origin");
});

test("wrong origins returns one origin fix", async () => {
  const { context } = parseBoardWithContext({
    setup: "(setup (aux_axis_origin 1 1) (grid_origin 2 2))",
  });

  const fixes = await validateBoard(context).pipe(Effect.runPromise);

  expect(fixes).toHaveLength(1);
  expect(fixes?.[0]?.id).toBe("kicad-origin");
});

test("multiple validators' fixes are collected", async () => {
  const { context } = parseBoardWithContext();
  const firstValidator: BoardValidator = () =>
    Effect.succeed([{ id: "first", message: "First", apply: () => {} }]);
  const secondValidator: BoardValidator = () =>
    Effect.succeed([{ id: "second", message: "Second", apply: () => {} }]);

  const fixes = await validateBoardWithValidators(context, [
    firstValidator,
    secondValidator,
  ]).pipe(Effect.runPromise);

  expect(fixes?.map((fix) => fix.id)).toEqual(["first", "second"]);
});

test("applyBoardFixes mutates the parsed board only after validation collection", async () => {
  const { context, pcb } = parseBoardWithContext();

  const fixes = await validateBoard(context).pipe(Effect.runPromise);

  expect(pcb.setup).toBeUndefined();

  const changed = await applyBoardFixes(pcb, fixes ?? []).pipe(
    Effect.runPromise,
  );

  expect(changed).toBe(true);
  expect(pcb.setup?.auxAxisOrigin).toEqual({ x: 0, y: 10 });
  expect(pcb.setup?.gridOrigin).toEqual({ x: 0, y: 10 });
});

test("missing Edge.Cuts geometry fails validation", async () => {
  const source = makeBoardSource({ includeEdgeCuts: false });
  const pcb = parseKicadPcb(source);
  const context = makeContext(pcb, source);
  let validationError: unknown;

  try {
    await validateBoard(context).pipe(Effect.runPromise);
  } catch (error) {
    validationError = error;
  }

  expect(validationError).toBeInstanceOf(Error);
  expect((validationError as Error).message).toContain("No Edge.Cuts geometry");
});

test("four layer board stackups fail validation", async () => {
  const source = makeBoardSource({
    layers: `
    (0 "F.Cu" signal)
    (1 "In1.Cu" signal)
    (2 "In2.Cu" signal)
    (31 "B.Cu" signal)
    (44 "Edge.Cuts" user)
  `,
  });
  const pcb = parseKicadPcb(source);
  const context = makeContext(pcb, source);
  let validationError: unknown;

  try {
    await validateBoard(context).pipe(Effect.runPromise);
  } catch (error) {
    validationError = error;
  }

  expect(validationError).toBeInstanceOf(Error);
  expect((validationError as Error).message).toContain(
    "can only manufacture 1- or 2-layer boards",
  );
});

test("plating bath validation allows rotation when configured", async () => {
  const { context } = parseBoardWithContext({
    width: 20,
    height: 10,
    setup: "(setup (aux_axis_origin 0 10) (grid_origin 0 10))",
    platingBath: {
      maxBoardWidthMm: 12,
      maxBoardHeightMm: 22,
      allowRotation: true,
      platingOffsets: { left: 0, right: 0, top: 0, bottom: 0 },
      includeAlignmentDrills: false,
      alignmentDistance: { x: 6, y: 6 },
    },
  });

  const fixes = await validateBoard(context).pipe(Effect.runPromise);

  expect(fixes).toBeNull();
});

test("plating bath validation suggests offset changes when possible", async () => {
  const { context } = parseBoardWithContext({
    width: 50,
    height: 50,
    setup: "(setup (aux_axis_origin 0 50) (grid_origin 0 50))",
    platingBath: {
      maxBoardWidthMm: 64,
      maxBoardHeightMm: 58,
      allowRotation: true,
      platingOffsets: { left: 16, right: 4, top: 4, bottom: 4 },
      includeAlignmentDrills: false,
      alignmentDistance: { x: 6, y: 6 },
    },
  });
  let validationError: unknown;

  try {
    await validateBoard(context).pipe(Effect.runPromise);
  } catch (error) {
    validationError = error;
  }

  expect(validationError).toBeInstanceOf(Error);
  expect((validationError as Error).message).toContain("left+right <= 14mm");
  expect((validationError as Error).message).toContain("left=10");
});

test("plating bath validation reports impossible base outlines", async () => {
  const { context } = parseBoardWithContext({
    width: 100,
    height: 50,
    setup: "(setup (aux_axis_origin 0 50) (grid_origin 0 50))",
    platingBath: {
      maxBoardWidthMm: 90,
      maxBoardHeightMm: 40,
      allowRotation: true,
      platingOffsets: { left: 0, right: 0, top: 0, bottom: 0 },
      includeAlignmentDrills: false,
      alignmentDistance: { x: 6, y: 6 },
    },
  });
  let validationError: unknown;

  try {
    await validateBoard(context).pipe(Effect.runPromise);
  } catch (error) {
    validationError = error;
  }

  expect(validationError).toBeInstanceOf(Error);
  expect((validationError as Error).message).toContain(
    "cannot fit this bath even with zero",
  );
});

const parseBoardWithContext = (
  options: {
    setup?: string;
    width?: number;
    height?: number;
    platingBath?: BoardValidationContext["platingBath"];
  } = {},
) => {
  const source = makeBoardSource(options);
  const pcb = parseKicadPcb(source);
  return {
    pcb,
    context: makeContext(pcb, source, options.platingBath),
  };
};

const makeContext = (
  pcb: KicadPcb,
  source: string,
  platingBath?: BoardValidationContext["platingBath"],
): BoardValidationContext => ({
  projectFilePath: "/tmp/flatmaxx-test.kicad_pcb",
  pcb,
  source,
  platingBath,
});

const makeBoardSource = ({
  includeEdgeCuts = true,
  width = 10,
  height = 10,
  layers = `
    (0 "F.Cu" signal)
    (31 "B.Cu" signal)
    (44 "Edge.Cuts" user)
  `,
  setup,
}: {
  includeEdgeCuts?: boolean;
  width?: number;
  height?: number;
  layers?: string;
  setup?: string;
} = {}) => `
(kicad_pcb
  (version 20221018)
  (generator flatmaxx-test)
  (layers
    ${layers}
  )
  ${setup ?? ""}
  ${
    includeEdgeCuts
      ? `(gr_rect
    (start 0 0)
    (end ${width} ${height})
    (layer "Edge.Cuts")
    (width 0.1)
    (fill none)
    (tstamp 00000000-0000-0000-0000-000000000001)
  )`
      : ""
  }
)
`;
