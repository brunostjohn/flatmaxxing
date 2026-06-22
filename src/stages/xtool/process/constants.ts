export const xToolStudioAppName = "xTool Studio";

export const xToolStudioAppPath = "/Applications/xTool Studio.app";

export const xToolStudioProcessName = xToolStudioAppName;

export const xToolStudioCdpPort = 9333;

export const xToolStudioCdpHost = "127.0.0.1";

export const xToolStudioTargetListUrl = `http://${xToolStudioCdpHost}:${xToolStudioCdpPort}/json/list`;

export const xToolStudioLaunchArgs = [
  `--remote-debugging-port=${xToolStudioCdpPort}`,
  "--remote-allow-origins=*",
] as const;

export const xToolStudioOpenArgs = [
  "-n",
  xToolStudioAppPath,
  "--args",
  ...xToolStudioLaunchArgs,
] as const;

export const getXToolStudioTargetListUrl = ({
  cdpHost = xToolStudioCdpHost,
  cdpPort = xToolStudioCdpPort,
}: {
  readonly cdpHost?: string | undefined;
  readonly cdpPort?: number | undefined;
} = {}) => `http://${cdpHost}:${cdpPort}/json/list`;

export const getXToolStudioLaunchArgs = ({
  cdpPort = xToolStudioCdpPort,
}: {
  readonly cdpPort?: number | undefined;
} = {}) => [`--remote-debugging-port=${cdpPort}`, "--remote-allow-origins=*"];

export const getXToolStudioOpenArgs = ({
  appPath = xToolStudioAppPath,
  cdpPort = xToolStudioCdpPort,
}: {
  readonly appPath?: string | undefined;
  readonly cdpPort?: number | undefined;
} = {}) => ["-n", appPath, "--args", ...getXToolStudioLaunchArgs({ cdpPort })];
