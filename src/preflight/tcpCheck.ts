import { Effect, Option } from "effect";
import { Socket } from "node:net";
import { MAX_TCP_PORT, MIN_TCP_PORT, TCP_PROBE_TIMEOUT } from "./constants";

export const validateHostPort = (host: string, port: number) => {
  if (host.trim().length === 0) {
    return Option.some("xTool CDP host must not be empty.");
  }

  if (!Number.isInteger(port) || port < MIN_TCP_PORT || port > MAX_TCP_PORT) {
    return Option.some(
      "xTool CDP port must be an integer between 1 and 65535.",
    );
  }

  return Option.none<string>();
};

const connect = (host: string, port: number) =>
  Effect.callback<boolean>((resume) => {
    const socket = new Socket();
    socket.once("connect", () => resume(Effect.succeed(true)));
    socket.once("error", () => resume(Effect.succeed(false)));
    socket.connect(port, host);
    return Effect.sync(() => socket.destroy());
  });

export const isTcpPortOpen = (host: string, port: number) =>
  connect(host, port).pipe(
    Effect.timeoutOption(TCP_PROBE_TIMEOUT),
    Effect.map(Option.getOrElse(() => false)),
  );
