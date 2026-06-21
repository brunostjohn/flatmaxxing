import { expect, test } from "bun:test";
import { Schema } from "effect";
import {
	ConfigFileSchema,
	defaultCncIsolation,
	defaultCncNonCopperClearing,
	defaultValidationRanges,
} from ".";

const decodeConfigFile = Schema.decodeUnknownSync(ConfigFileSchema, {
	errors: "all",
	onExcessProperty: "error",
});

test("schema decodes defaults without compatibility casts", () => {
	const config = decodeConfigFile({});

	expect(config.solderMask.generate).toBe(true);
	expect(config.stencil.generate).toBe(true);
	expect(config.drills.generate).toBe(true);
	expect(config.place.generate).toBe(true);
	expect(config.cnc.isolation).toEqual(defaultCncIsolation);
	expect(config.cnc.nonCopperClearing).toEqual(defaultCncNonCopperClearing);
});

test("workflow side exclusions default to empty arrays", () => {
	const config = decodeConfigFile({});

	expect(config.solderMask.excludeSides).toEqual([]);
	expect(config.stencil.excludeSides).toEqual([]);
});

test("schema includes validation ranges for every numeric default", () => {
	const config = decodeConfigFile({});

	expect(config.validation.ranges).toEqual(defaultValidationRanges);
	expect(config.validation.ranges.distanceMm).toEqual({ min: 0, max: 250 });
	expect(config.validation.ranges.xtoolPercent).toEqual({ min: 0, max: 100 });
	expect(config.validation.ranges.xtoolSpeed).toEqual({ min: 1, max: 20000 });
});
