import { buildConfigJsonSchemaText } from "@/config/schema";
import { Effect, FileSystem, Path } from "effect";
import { applySchemaAssociationToFile } from "./applySchemaAssociation";
import { schemaFileName } from "./constants";

export const writeProjectSchemaAssociation = Effect.fn(
  "flatmaxx.editorSchema.project",
)(function* (projectDir: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const schemaPath = path.join(projectDir, schemaFileName);

  yield* fs.writeFileString(schemaPath, buildConfigJsonSchemaText());

  const settingsPath = path.join(projectDir, ".vscode", "settings.json");
  const changed = yield* applySchemaAssociationToFile(
    settingsPath,
    `./${schemaFileName}`,
  );

  return { schemaPath, settingsPath, changed };
});
