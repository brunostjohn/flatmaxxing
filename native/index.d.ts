export declare function axActions(pid: number, query: AxQuery): Array<string>;

export interface AxElementInfo {
	role?: string;
	titles: Titles;
	id?: string;
	acts: Array<string>;
	x: number;
	y: number;
	w: number;
	h: number;
	cx: number;
	cy: number;
}

export declare function axFind(
	pid: number,
	query: AxQuery,
): Array<AxElementInfo> | null;

export declare function axPerformAction(
	pid: number,
	query: AxQuery,
	action: string,
): void;

export declare function axPress(pid: number, query: AxQuery): void;

export interface AxQuery {
	role?: string;
	title?: string;
	id?: string;
	underTitle?: string;
	titleContains?: string;
	nth?: number;
}

export declare function axRequestTrusted(): boolean;

export declare function axSetValue(
	pid: number,
	query: AxQuery,
	value: string,
): void;

export declare function axTrusted(): boolean;

export interface AxTrustedOptions {
	prompt?: boolean;
}

export declare function mouseClick(pos: MousePos): Promise<void>;

export declare function mouseDoubleClick(pos: MousePos): Promise<void>;

export declare function mouseMove(pos: MousePos): void;

export declare function mousePos(): MousePos;

export interface MousePos {
	x: number;
	y: number;
}

export declare function mouseRightClick(pos: MousePos): Promise<void>;

export declare function mouseScroll(
	pos: MousePos,
	lines: number,
): Promise<void>;

export declare function screenCaptureAccess(): boolean;

export declare function screenCaptureGranted(): boolean;

export interface Titles {
	title?: string;
	description?: string;
	value?: string;
}
