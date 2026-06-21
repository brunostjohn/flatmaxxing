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
