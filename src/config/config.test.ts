import { expect, test } from "bun:test";
import { Effect } from "effect";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
	buildKicadOutputOptions,
	buildXToolProjectOptions,
	deepMerge,
	defaultAvailableDrills,
	defaultAvailableMills,
	defaultCncSetting,
	loadFlatmaxxConfig,
} from ".";

const tempProject = () => mkdtempSync(join(tmpdir(), "flatmaxx-config-"));

const writeConfig = (root: string, filename: string, content: string) => {
	const path = join(root, filename);
	mkdirSync(join(path, ".."), { recursive: true });
	writeFileSync(path, content);
	return path;
};

const loadConfig = (projectRoot: string, configPath?: string) =>
	loadFlatmaxxConfig({ projectRoot, configPath }).pipe(Effect.runPromise);

test("loads defaults when no auto config exists", async () => {
	const root = tempProject();
	const config = await loadConfig(root);

	expect(config.dependencies.kicadCli).toBe(
		"/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli",
	);
	expect(config.paths.gerbers).toBe(join(root, "gerbers"));
	expect(config.paths.xtool).toBe(join(root, "xtool"));
	expect(config.alignmentDrills.generate).toBe(true);
	expect(config.electroplating.generateEdgeCutsWithAlignmentDrills).toBe(true);
	expect(config.drills.generate).toBe(true);
	expect(config.drills.withEdgeCuts).toBe(false);
	expect(config.place.generate).toBe(true);
	expect(config.solderMask.generate).toBe(true);
	expect(config.solderMask.double).toBe(true);
	expect(config.solderMask.distance).toEqual({ x: 6, y: 6 });
	expect(config.stencil.generate).toBe(true);
	expect(config.stencil.xtool).toMatchObject({
		device: "F1 Ultra",
		power: 100,
		speed: 6000,
		passes: 3,
	});
	expect(config.cnc.isolation).toEqual(defaultCncSetting);
	expect(config.cnc.nonCopperClearing).toEqual(defaultCncSetting);
	expect(config.cnc.availableDrills).toEqual(defaultAvailableDrills);
	expect(config.cnc.availableMills).toEqual(defaultAvailableMills);

	const xtool = buildXToolProjectOptions(config);
	expect(xtool.enabled).toBe(true);
	expect(xtool.solderMask.enabled).toBe(true);
	expect(xtool.stencil.enabled).toBe(true);
});

test("strict decoding rejects typoed config keys", async () => {
	const root = tempProject();
	writeConfig(
		root,
		"flatmaxxing.toml",
		`
[cnc]
availbleDrills = []
`,
	);

	await expect(loadConfig(root)).rejects.toThrow("availbleDrills");
});

test("extends are loaded in order and arrays replace", async () => {
	const root = tempProject();
	writeConfig(
		root,
		"a.toml",
		`
[solderMask]
generate = true
excludeSides = ["front"]

[paths]
png = "./from-a"
`,
	);
	writeConfig(
		root,
		"b.toml",
		`
[paths]
png = "./from-b"
`,
	);
	writeConfig(
		root,
		"flatmaxxing.toml",
		`
extends = ["a.toml", "b.toml"]

[solderMask]
excludeSides = ["back"]
`,
	);

	const config = await loadConfig(root);
	const xToolOptions = buildXToolProjectOptions(config);

	expect(config.paths.png).toBe(join(root, "from-b"));
	expect(xToolOptions.solderMask.enabled).toBe(true);
	expect(xToolOptions.solderMask.sides).toEqual(["front"]);
	expect(xToolOptions.solderMask.sideSkipStatus.back).toContain(
		"solderMask.excludeSides",
	);
});

test("missing extends and cycles fail clearly", async () => {
	const missingRoot = tempProject();
	writeConfig(missingRoot, "flatmaxxing.toml", `extends = ["missing.toml"]`);

	await expect(loadConfig(missingRoot)).rejects.toThrow("does not exist");

	const cycleRoot = tempProject();
	writeConfig(cycleRoot, "a.toml", `extends = ["b.toml"]`);
	writeConfig(cycleRoot, "b.toml", `extends = ["a.toml"]`);

	await expect(loadConfig(cycleRoot, "a.toml")).rejects.toThrow(
		"extends cycle",
	);
});

test("expands home directories and validates configured ranges", async () => {
	const root = tempProject();
	writeConfig(
		root,
		"flatmaxxing.toml",
		`
[paths]
png = "~/flatmaxx-config-test-png"

[validation.ranges.xtoolPercent]
min = 0
max = 80

[solderMask.xtool]
intensity = 90
`,
	);

	await expect(loadConfig(root)).rejects.toThrow("solderMask.xtool.intensity");

	writeConfig(
		root,
		"flatmaxxing.toml",
		`
[paths]
png = "~/flatmaxx-config-test-png"
`,
	);
	const config = await loadConfig(root);

	expect(config.paths.png).toBe(join(homedir(), "flatmaxx-config-test-png"));
});

test("deep merge keeps nested keys and replaces arrays", () => {
	expect(
		deepMerge(
			{
				solderMask: {
					generate: true,
					excludeSides: ["front"],
					distance: { x: 1, y: 2 },
				},
			},
			{
				solderMask: {
					excludeSides: ["back"],
					distance: { x: 6 },
				},
			},
		),
	).toEqual({
		solderMask: {
			generate: true,
			excludeSides: ["back"],
			distance: { x: 6, y: 2 },
		},
	});
});

test("option builders gate ignored and excluded sides", async () => {
	const root = tempProject();
	writeConfig(
		root,
		"flatmaxxing.toml",
		`
[board]
ignoreSide = "back"

[solderMask]
generate = true
double = false
excludeSides = ["front"]

[stencil]
generate = true
excludeSides = ["front"]
`,
	);

	const config = await loadConfig(root);
	const kicad = buildKicadOutputOptions(config);
	const xtool = buildXToolProjectOptions(config);

	expect(kicad.solderMask.sides).toEqual([]);
	expect(kicad.solderMask.skipReason).toContain("excludes all");
	expect(kicad.stencil.sides).toEqual([]);
	expect(xtool.enabled).toBe(false);
	expect(xtool.solderMask.double).toBe(false);
});

test("option builders enable xTool when either workflow has output", async () => {
	const root = tempProject();
	writeConfig(
		root,
		"flatmaxxing.toml",
		`
[solderMask]
generate = false

[stencil]
generate = true
excludeSides = ["back"]
`,
	);

	const config = await loadConfig(root);
	const xtool = buildXToolProjectOptions(config);

	expect(xtool.enabled).toBe(true);
	expect(xtool.solderMask.enabled).toBe(false);
	expect(xtool.stencil.enabled).toBe(true);
	expect(xtool.stencil.sides).toEqual(["front"]);
});
