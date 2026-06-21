import { expect, test } from "bun:test";
import {
	defaultAvailableMills,
	defaultCncClearance,
	defaultCncIsolation,
	defaultCncNonCopperClearing,
	type ResolvedConfig,
} from "@/config";
import { buildCncJobPlan } from "./cncJobPlan";

const config = {
	cnc: {
		isolation: defaultCncIsolation,
		nonCopperClearing: defaultCncNonCopperClearing,
		clearance: defaultCncClearance,
		backside: { mirrorAxis: "X" },
		availableDrills: [],
		availableMills: defaultAvailableMills,
	},
} as unknown as ResolvedConfig;

test("isolation uses the effective V-bit width (~0.198)", () => {
	const plan = buildCncJobPlan(config);
	expect(plan.isolation.diameter).toBeCloseTo(0.19773502691896, 6);
	expect(plan.isolation.passes).toBe(3);
	expect(plan.isolation.overlap).toBe(60);
	expect(plan.isolation.isoType).toBe(2);
});

test("NCC tools are mills biggest->smallest with the V-bit appended last", () => {
	const plan = buildCncJobPlan(config);
	const diameters = plan.ncc.tools.map((t) => t.diameter);
	// strictly descending (mills desc, then the much smaller V-bit)
	for (let i = 1; i < diameters.length; i += 1) {
		expect(diameters[i]!).toBeLessThan(diameters[i - 1]!);
	}
	const last = plan.ncc.tools.at(-1)!;
	expect(last.kind).toBe("vbit");
	expect(last.diameter).toBeCloseTo(0.19773502691896, 6);
	expect(plan.ncc.tools.filter((t) => t.kind === "mill")).toHaveLength(
		defaultAvailableMills.length,
	);
});

test("uids are 1-based and contiguous (match FlatCAM tooldia order)", () => {
	const plan = buildCncJobPlan(config);
	plan.ncc.tools.forEach((tool, index) => {
		expect(tool.uid).toBe(index + 1);
	});
});

test("mills cut deeper than the V-bit (TLO margin)", () => {
	const plan = buildCncJobPlan(config);
	const mill = plan.ncc.tools.find((t) => t.kind === "mill")!;
	const vbit = plan.ncc.tools.find((t) => t.kind === "vbit")!;
	expect(mill.cutDepth).toBe(0.075);
	expect(vbit.cutDepth).toBe(0.05);
});

test("throws when no isolation tool is configured", () => {
	const noTool = {
		cnc: {
			...config.cnc,
			isolation: { ...defaultCncIsolation, tool: undefined },
		},
	} as unknown as ResolvedConfig;
	expect(() => buildCncJobPlan(noTool)).toThrow("isolation.tool");
});
