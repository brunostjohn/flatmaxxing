import { MakeraCamError } from "@/errors";
import {
  axFind,
  clickAt,
  elementExists,
  ensureFrontmost,
  performAction,
  pressKeyCode,
} from "@/macos";
import { Duration, Effect } from "effect";
import {
  KEY_DOWN,
  KEY_RETURN,
  PANEL_BAND_TOP,
  PANEL_X,
  SETTLE,
} from "../constants";
import { MAKERACAM_PROCESS } from "../process";
import { scrollIntoBand } from "./scrollIntoBand";
import { setValueByLabel } from "./setValueByLabel";

const calculateButtonY = Effect.fnUntraced(function* (pid: number) {
  const calc = (yield* axFind(pid, {
    role: "AXButton",
    title: "Calculate",
  }))[0];
  return calc?.y;
});

const setTabLayoutNumber = Effect.fnUntraced(function* (pid: number) {
  yield* ensureFrontmost(MAKERACAM_PROCESS);

  const attempt = Effect.gen(function* () {
    const label = (yield* axFind(pid, {
      role: "AXStaticText",
      title: "Tab Layout",
    }))[0];
    if (label === undefined) return false;

    const popups = yield* axFind(pid, { role: "AXPopUpButton" });
    const index = popups.findIndex(
      (popup) => Math.abs(popup.y - label.y) <= 14 && popup.x > label.x,
    );
    if (index < 0) return false;

    yield* performAction(
      pid,
      { role: "AXPopUpButton", nth: index + 1 },
      "AXShowMenu",
    );
    yield* Effect.sleep(Duration.millis(450));
    yield* pressKeyCode(KEY_DOWN);
    yield* Effect.sleep(Duration.millis(200));
    yield* pressKeyCode(KEY_RETURN);
    yield* Effect.sleep(SETTLE);
    return yield* elementExists(pid, {
      role: "AXStaticText",
      title: "Tabs per Contour",
    });
  });

  const ok = (yield* attempt) || (yield* attempt);
  if (!ok) {
    return yield* Effect.fail(
      new MakeraCamError({
        message: "Contour: could not switch Tab Layout to 'Number'",
      }),
    );
  }
});

const clickTabsGenerate = Effect.fnUntraced(function* (pid: number) {
  const calcY = yield* calculateButtonY(pid);
  const gen = yield* scrollIntoBand(
    () =>
      axFind(pid, { role: "AXButton", title: "Generate" }).pipe(
        Effect.map((found) => found[0]),
      ),
    {
      bandTop: PANEL_BAND_TOP,
      bandBottom: (calcY ?? 990) - 2,
      anchor: { x: PANEL_X, y: 600 },
      maxTries: 25,
      settle: Duration.millis(120),
      notFound: "Contour: Tabs Generate button not found",
      outOfReach:
        "Contour: could not scroll the Tabs Generate button into view",
    },
  );
  yield* Effect.sleep(Duration.millis(250));
  yield* clickAt({ x: gen.cx, y: gen.cy });
  yield* Effect.sleep(Duration.millis(400));
});

const setTabParam = Effect.fnUntraced(function* (
  pid: number,
  label: string,
  value: string,
) {
  const calcY = yield* calculateButtonY(pid);
  const bandBottom = (calcY ?? 980) - 24;
  yield* scrollIntoBand(
    () =>
      axFind(pid, { role: "AXStaticText", title: label }).pipe(
        Effect.map((found) => found[0]),
      ),
    {
      bandTop: PANEL_BAND_TOP,
      bandBottom,
      anchor: { x: PANEL_X, y: Math.round((PANEL_BAND_TOP + bandBottom) / 2) },
      maxTries: 30,
      settle: Duration.millis(120),
      notFound: `Contour: "${label}" field not found`,
      outOfReach: `Contour: could not scroll "${label}" into the visible band`,
    },
  );
  yield* setValueByLabel(pid, label, value);
});

const selectTabsRadio = Effect.fnUntraced(function* (
  pid: number,
  title: string,
) {
  const calcY = yield* calculateButtonY(pid);
  const bandBottom = (calcY ?? 980) - 24;
  const radio = yield* scrollIntoBand(
    () =>
      axFind(pid, { role: "AXRadioButton", title }).pipe(
        Effect.map((found) => found[0]),
      ),
    {
      bandTop: PANEL_BAND_TOP,
      bandBottom,
      anchor: { x: PANEL_X, y: Math.round((PANEL_BAND_TOP + bandBottom) / 2) },
      maxTries: 30,
      settle: Duration.millis(120),
      notFound: `Contour: Tabs '${title}' radio not found`,
      outOfReach: `Contour: could not scroll Tabs '${title}' into the band`,
    },
  );
  yield* clickAt({ x: radio.cx, y: radio.cy });
});

export { clickTabsGenerate, selectTabsRadio, setTabLayoutNumber, setTabParam };
