import { homedir } from "node:os";
import { dirname, isAbsolute, resolve } from "node:path";

export const expandHome = (path: string): string => {
	if (path === "~") {
		return homedir();
	}

	if (path.startsWith("~/")) {
		return resolve(homedir(), path.slice(2));
	}

	return path;
};

export const resolveFrom = (baseDirectory: string, path: string): string => {
	const expanded = expandHome(path);
	return isAbsolute(expanded) ? expanded : resolve(baseDirectory, expanded);
};

export const resolveSibling = (fromFile: string, path: string): string =>
	resolveFrom(dirname(fromFile), path);
