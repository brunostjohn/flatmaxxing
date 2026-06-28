import { BunServices } from "@effect/platform-bun";
import { expect, test } from "bun:test";
import { Effect } from "effect";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  schemaFileName,
  tomlAssociationKey,
  tomlAssociationPattern,
} from "./constants";
import { writeProjectSchemaAssociation } from "./writeProjectSchemaAssociation";

const run = <A, E>(effect: Effect.Effect<A, E, BunServices.BunServices>) =>
  effect.pipe(Effect.provide(BunServices.layer), Effect.runPromise);

test("writes a project schema and a .vscode association", async () => {
  const dir = mkdtempSync(join(tmpdir(), "flatmaxx-editorschema-"));
  const result = await run(writeProjectSchemaAssociation(dir));

  expect(result.changed).toBe(true);

  const schema = JSON.parse(await Bun.file(join(dir, schemaFileName)).text());
  expect(schema.$schema).toContain("draft-07");
  expect(schema.type).toBe("object");

  const settings = JSON.parse(
    await Bun.file(join(dir, ".vscode", "settings.json")).text(),
  );
  expect(settings[tomlAssociationKey][tomlAssociationPattern]).toBe(
    `./${schemaFileName}`,
  );
});
