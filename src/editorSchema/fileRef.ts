import { Effect, Path } from "effect";

export const schemaFileRef = Effect.fn("flatmaxx.editorSchema.fileRef")(
  function* (absolutePath: string) {
    const path = yield* Path.Path;
    const url = yield* path.toFileUrl(absolutePath);
    return url.href;
  },
);
