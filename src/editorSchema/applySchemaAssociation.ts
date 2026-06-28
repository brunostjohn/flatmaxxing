import { Effect, FileSystem, Path } from "effect";
import { addTomlSchemaAssociation } from "./schemaAssociation";

export const applySchemaAssociationToFile = Effect.fn(
  "flatmaxx.editorSchema.applyAssociation",
)(function* (settingsPath: string, schemaRef: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const exists = yield* fs.exists(settingsPath);
  const existing = exists ? yield* fs.readFileString(settingsPath) : undefined;
  const edit = addTomlSchemaAssociation(existing, schemaRef);

  if (edit.changed) {
    yield* fs.makeDirectory(path.dirname(settingsPath), { recursive: true });
    yield* fs.writeFileString(settingsPath, edit.text);
  }

  return edit.changed;
});
