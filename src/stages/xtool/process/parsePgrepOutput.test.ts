import { expect, test } from "bun:test";
import { parsePgrepOutput } from "./parsePgrepOutput";

test("parsePgrepOutput returns numeric process ids", () => {
	expect(parsePgrepOutput("123\n456\n")).toEqual([123, 456]);
});

test("parsePgrepOutput ignores blanks and non-positive values", () => {
	expect(parsePgrepOutput("\n0\nabc\n789\n")).toEqual([789]);
});
