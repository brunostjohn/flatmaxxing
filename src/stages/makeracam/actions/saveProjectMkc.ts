import { Effect } from "effect";
import { saveViaDialog } from "../helpers";

export const saveProjectMkc = Effect.fn("flatmaxx.makeracam.saveProjectMkc")(
  function* (pid: number, absPath: string) {
    const withExt = absPath.endsWith(".mkc") ? absPath : `${absPath}.mkc`;
    yield* saveViaDialog(pid, "Save As", withExt);
  },
);
