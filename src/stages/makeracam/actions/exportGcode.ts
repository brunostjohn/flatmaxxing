import { Effect } from "effect";
import { saveViaDialog } from "../helpers";

export const exportGcode = Effect.fn("flatmaxx.makeracam.exportGcode")(
  function* (pid: number, absPath: string) {
    const withExt = absPath.endsWith(".gcode") ? absPath : `${absPath}.gcode`;
    yield* saveViaDialog(pid, "Export", withExt);
  },
);
