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

const parseBoardWithContext = (options: { setup?: string } = {}) => {
  const source = makeBoardSource(options);
  const pcb = parseKicadPcb(source);
  return {
    pcb,
    context: makeContext(pcb, source),
  };
};

const makeContext = (
  pcb: KicadPcb,
  source: string,
): BoardValidationContext => ({
  projectFilePath: "/tmp/flatmaxx-test.kicad_pcb",
  pcb,
  source,
});

const makeBoardSource = ({
  includeEdgeCuts = true,
  layers = `
    (0 "F.Cu" signal)
    (31 "B.Cu" signal)
    (44 "Edge.Cuts" user)
  `,
  setup,
}: {
  includeEdgeCuts?: boolean;
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
    (end 10 10)
    (layer "Edge.Cuts")
    (width 0.1)
    (fill none)
    (tstamp 00000000-0000-0000-0000-000000000001)
  )`
      : ""
  }
)
`;
