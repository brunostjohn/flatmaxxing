import { Match } from "effect";
import type { InlineImageProtocol } from "./types";

const isKittyEnv = (env: NodeJS.ProcessEnv) =>
  env.TERM === "xterm-kitty" ||
  env.TERM === "xterm-ghostty" ||
  env.TERM_PROGRAM === "ghostty" ||
  Boolean(env.KITTY_WINDOW_ID) ||
  Boolean(env.GHOSTTY_RESOURCES_DIR) ||
  Boolean(env.GHOSTTY_BIN_DIR);

const isIterm2Env = (env: NodeJS.ProcessEnv) =>
  env.TERM_PROGRAM === "iTerm.app" ||
  env.TERM_PROGRAM === "WezTerm" ||
  env.TERM_PROGRAM === "WarpTerminal" ||
  env.LC_TERMINAL === "iTerm2";

export const detectInlineImageProtocol = (
  env: NodeJS.ProcessEnv = process.env,
): InlineImageProtocol =>
  Match.value(env).pipe(
    Match.when(isKittyEnv, () => "kitty" as const),
    Match.when(isIterm2Env, () => "iterm2" as const),
    Match.orElse(() => "none" as const),
  );
