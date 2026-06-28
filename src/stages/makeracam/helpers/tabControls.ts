import { MakeraCamError } from "@/errors";
import {
  axFind,
  clickAt,
  elementExists,
  ensureFrontmost,
  performAction,
  pressKeyCode,
  setElementValue,
} from "@/macos";
import { Duration, Effect, Match, Schedule } from "effect";
import {
  KEY_DOWN,
  KEY_RETURN,
  PANEL_BAND_TOP,
  PANEL_FOOTER_CLEARANCE,
  PANEL_X,
  SETTLE,
} from "../constants";
import { MAKERACAM_PROCESS } from "../process";
import { scrollIntoBand } from "./scrollIntoBand";
import { setValueByLabel } from "./setValueByLabel";

const TABS_KEEP_SCROLLING = "flatmaxx.makeracam.clickTabsGenerate.keepScrolling";
const TABS_SCROLL_ANCHOR_Y = 600;

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
  const bandTop = PANEL_BAND_TOP;
  const bandBottom = (calcY ?? 990) - PANEL_FOOTER_CLEARANCE;
  const desiredCy = Math.round((bandTop + bandBottom) / 2);

  const locateGenerate = () =>
    axFind(pid, { role: "AXButton", title: "Generate" }).pipe(
      Effect.map((found) => found[0]),
    );

  const probe = Effect.gen(function* () {
    const gen = yield* locateGenerate();
    if (gen === undefined) {
      return yield* Effect.fail(
        new MakeraCamError({
          message: "Contour: Tabs Generate button not found",
        }),
      );
    }
    if (gen.cy >= bandTop && gen.cy <= bandBottom) return;

    const target = (yield* axFind(pid, { role: "AXScrollBar" }))
      .map((bar, index) => ({ bar, nth: index + 1 }))
      .filter(
        ({ bar }) =>
          bar.h > bar.w &&
          bar.y <= TABS_SCROLL_ANCHOR_Y &&
          bar.y + bar.h >= TABS_SCROLL_ANCHOR_Y &&
          bar.x + bar.w >= PANEL_X,
      )
      .sort((a, b) => a.bar.x - b.bar.x)[0];
    const value = Number.parseFloat(target?.bar.titles.value ?? "");
    if (target !== undefined && Number.isFinite(value)) {
      yield* setElementValue(
        pid,
        { role: "AXScrollBar", nth: target.nth },
        String(Math.max(0, Math.round(value + (gen.cy - desiredCy)))),
      );
    }
    return yield* Effect.fail(
      new MakeraCamError({ message: TABS_KEEP_SCROLLING }),
    );
  });

  yield* probe.pipe(
    Effect.retry({
      schedule: Schedule.spaced(Duration.millis(120)).pipe(Schedule.take(24)),
      while: (error) => error.message === TABS_KEEP_SCROLLING,
    }),
    Effect.catchTag("MakeraCamError", (error) =>
      Match.value(error.message === TABS_KEEP_SCROLLING).pipe(
        Match.when(true, () =>
          Effect.fail(
            new MakeraCamError({
              message:
                "Contour: could not scroll the Tabs Generate button into view",
            }),
          ),
        ),
        Match.orElse(() => Effect.fail(error)),
      ),
    ),
  );

  yield* Effect.sleep(Duration.millis(250));
  const gen = yield* locateGenerate();
  if (gen === undefined) {
    return yield* Effect.fail(
      new MakeraCamError({
        message: "Contour: Tabs Generate button vanished before click",
      }),
    );
  }
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
