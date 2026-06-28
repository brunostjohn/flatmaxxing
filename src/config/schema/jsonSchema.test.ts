import { expect, test } from "bun:test";
import { buildConfigJsonSchema } from "./buildConfigJsonSchema";
import { defaultConfigFile } from "./defaults";

const schema = buildConfigJsonSchema() as Record<string, any>;

test("emits a draft-07 document with strict objects", () => {
  expect(schema.$schema).toContain("draft-07");
  expect(typeof schema.$id).toBe("string");
  expect(schema.type).toBe("object");
  expect(schema.additionalProperties).toBe(false);
});

test("includes every top-level config section", () => {
  const keys = Object.keys(schema.properties);
  const expected = [
    "extends",
    "projectDir",
    "skipRenderBoard",
    "skills",
    "dependencies",
    "paths",
    "board",
    "alignmentDrills",
    "electroplating",
    "solderMask",
    "stencil",
    "drills",
    "place",
    "cnc",
    "xtool",
    "makeracam",
    "validation",
  ];
  for (const key of expected) {
    expect(keys).toContain(key);
  }
});

test("has no required keys and no non-finite number encodings", () => {
  const json = JSON.stringify(schema);
  expect(json).not.toContain('"required"');
  expect(json).not.toContain("NaN");
  expect(json).not.toContain("Infinity");
});

test("renders numbers as a plain number type", () => {
  const feedRate =
    schema.properties.cnc.properties.isolation.properties.feedRate;
  expect(feedRate.type).toBe("number");
  expect(feedRate.anyOf).toBeUndefined();
});

test("carries titles and descriptions from schema annotations", () => {
  const feedRate =
    schema.properties.cnc.properties.isolation.properties.feedRate;
  expect(feedRate.title).toBe("Feed rate");
  expect(feedRate.description).toContain("mm/min");
  expect(schema.title).toBe("flatmaxx configuration");
});

test("injects defaults sourced from defaultConfigFile", () => {
  expect(schema.properties.projectDir.default).toBe(
    defaultConfigFile.projectDir,
  );
  expect(
    schema.properties.cnc.properties.isolation.properties.feedRate.default,
  ).toBe(defaultConfigFile.cnc.isolation.feedRate);
  expect(schema.properties.skills.properties.autoInstall.default).toBe(
    defaultConfigFile.skills.autoInstall,
  );
});
