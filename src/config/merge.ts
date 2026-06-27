import { deepmergeCustom } from "deepmerge-ts";

export const merge = deepmergeCustom({ mergeArrays: false });
