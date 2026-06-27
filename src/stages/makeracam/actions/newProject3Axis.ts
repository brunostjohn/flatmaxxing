import { MakeraCamError } from "@/errors";
import { axFind, clickAt, waitForElement } from "@/macos";
import { Duration, Effect } from "effect";
import { dismissRestorePrompt } from "./dismissRestorePrompt";

export const newProject3Axis = Effect.fn("flatmaxx.makeracam.newProject3Axis")(
  function* (pid: number) {
    yield* dismissRestorePrompt(pid);

    yield* waitForElement(
      pid,
      { title: "Welcome to MakerCAM" },
      { timeout: Duration.seconds(30) },
    );

    const boxes = (yield* axFind(pid, { role: "AXCheckBox" }))
      .slice()
      .sort((a, b) => a.x - b.x);
    const threeAxis = boxes[0];
    if (threeAxis === undefined) {
      return yield* Effect.fail(
        new MakeraCamError({
          message: "Welcome: no 3-AXIS project-type checkbox found.",
        }),
      );
    }
    yield* clickAt({ x: threeAxis.x, y: threeAxis.y });

    yield* waitForElement(
      pid,
      { role: "AXMenuButton", title: "2D Path" },
      { timeout: Duration.seconds(30) },
    );
  },
);
