import { expect, test } from "bun:test";
import { tomlAssociationKey, tomlAssociationPattern } from "./constants";
import { addTomlSchemaAssociation } from "./schemaAssociation";

const ref = "file:///Users/x/.flatmaxx/flatmaxxing.schema.json";

test("creates fresh settings when none exist", () => {
  const { text, changed } = addTomlSchemaAssociation(undefined, ref);
  expect(changed).toBe(true);
  const parsed = JSON.parse(text);
  expect(parsed[tomlAssociationKey][tomlAssociationPattern]).toBe(ref);
});

test("treats whitespace-only content as empty", () => {
  const { text, changed } = addTomlSchemaAssociation("  \n", ref);
  expect(changed).toBe(true);
  expect(JSON.parse(text)[tomlAssociationKey][tomlAssociationPattern]).toBe(
    ref,
  );
});

test("inserts into existing settings and preserves other keys", () => {
  const existing = '{\n  "editor.fontSize": 14\n}\n';
  const { text, changed } = addTomlSchemaAssociation(existing, ref);
  expect(changed).toBe(true);
  const parsed = JSON.parse(text);
  expect(parsed["editor.fontSize"]).toBe(14);
  expect(parsed[tomlAssociationKey][tomlAssociationPattern]).toBe(ref);
});

test("preserves comments in existing settings", () => {
  const existing = '{\n  // keep me\n  "editor.fontSize": 14\n}\n';
  const { text } = addTomlSchemaAssociation(existing, ref);
  expect(text).toContain("// keep me");
});

test("is a no-op when the association already exists", () => {
  const existing = `{\n  "${tomlAssociationKey}": {}\n}`;
  const { text, changed } = addTomlSchemaAssociation(existing, ref);
  expect(changed).toBe(false);
  expect(text).toBe(existing);
});

test("escapes the regex pattern as valid JSON", () => {
  const { text } = addTomlSchemaAssociation("{}", ref);
  expect(text).toContain("flatmaxxing.*\\\\.toml$");
  expect(() => JSON.parse(text)).not.toThrow();
});
