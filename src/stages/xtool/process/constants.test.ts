import { expect, test } from "bun:test";
import {
	xToolStudioAppName,
	xToolStudioAppPath,
	xToolStudioCdpHost,
	xToolStudioCdpPort,
	xToolStudioLaunchArgs,
	xToolStudioOpenArgs,
	xToolStudioProcessName,
	xToolStudioTargetListUrl,
} from "./constants";

test("xTool Studio launch constants use the expected app and CDP flags", () => {
	expect(xToolStudioAppName).toBe("xTool Studio");
	expect(xToolStudioAppPath).toBe("/Applications/xTool Studio.app");
	expect(xToolStudioProcessName).toBe("xTool Studio");
	expect(xToolStudioCdpHost).toBe("127.0.0.1");
	expect(xToolStudioCdpPort).toBe(9333);
	expect(xToolStudioTargetListUrl).toBe("http://127.0.0.1:9333/json/list");
	expect(xToolStudioLaunchArgs).toEqual([
		"--remote-debugging-port=9333",
		"--remote-allow-origins=*",
	]);
	expect(xToolStudioOpenArgs).toEqual([
		"-n",
		"/Applications/xTool Studio.app",
		"--args",
		"--remote-debugging-port=9333",
		"--remote-allow-origins=*",
	]);
});
