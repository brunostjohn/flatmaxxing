import { expect, test } from "bun:test";

import {
	axActions,
	axFind,
	axRequestTrusted,
	axSetValue,
	axTrusted,
	mousePos,
	screenCaptureAccess,
	screenCaptureGranted,
} from "../index";

test("exports macOS accessibility primitives", () => {
	expect(typeof axTrusted).toBe("function");
	expect(typeof axRequestTrusted).toBe("function");
	expect(typeof screenCaptureAccess).toBe("function");
	expect(typeof screenCaptureGranted).toBe("function");
	expect(typeof axFind).toBe("function");
	expect(typeof axActions).toBe("function");
	expect(typeof axSetValue).toBe("function");
	expect(typeof mousePos).toBe("function");
});

test("permission probes return booleans", () => {
	expect(typeof axTrusted()).toBe("boolean");
	expect(typeof screenCaptureGranted()).toBe("boolean");
});
