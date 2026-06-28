import { buildConfigJsonSchemaText } from "@/config/schema";
import { Effect, FileSystem, Path } from "effect";
import { homedir } from "node:os";
import { globalSchemaDirName, schemaFileName } from "./constants";

export const ensureGlobalSchemaFile = Effect.fn(
  "flatmaxx.editorSchema.ensureGlobal",
)(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const home = yield* Effect.sync(() => homedir());
  const directory = path.join(home, globalSchemaDirName);
  const file = path.join(directory, schemaFileName);

  yield* fs.makeDirectory(directory, { recursive: true });
  yield* fs.writeFileString(file, buildConfigJsonSchemaText());

  return file;
});
