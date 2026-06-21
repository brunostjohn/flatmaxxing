export type XToolStudioProcess = {
	readonly processIds: readonly number[];
};

export type XToolStudioRuntimeOptions = {
	readonly appPath: string;
	readonly cdpHost: string;
	readonly cdpPort: number;
};
