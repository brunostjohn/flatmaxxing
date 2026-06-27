import { Duration } from "effect";

export const TCP_PROBE_TIMEOUT = Duration.millis(300);

export const MIN_TCP_PORT = 1;

export const MAX_TCP_PORT = 65_535;

export const EXECUTE_BITS = 0o111;

export const DEFAULT_PREFLIGHT_TITLE = "Preflight checks";
