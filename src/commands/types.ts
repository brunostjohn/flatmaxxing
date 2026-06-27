import type { ConfigFile } from "@/config";

export type ConfigEditorMode = "project" | "user";

export type ConfigEditorFieldKind =
  | "boolean"
  | "float"
  | "integer"
  | "optionalFloat"
  | "optionalString"
  | "select"
  | "numberSelect"
  | "string"
  | "toml";

export interface ConfigEditorSelectOption {
  readonly label: string;
  readonly value: string;
}

export interface ConfigEditorField {
  readonly kind: ConfigEditorFieldKind;
  readonly path: readonly string[];
  readonly label: string;
  readonly description?: string | undefined;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  readonly step?: number | undefined;
  readonly options?: readonly ConfigEditorSelectOption[] | undefined;
  readonly placeholder?: string | undefined;
}

export interface ConfigEditorSection {
  readonly id: string;
  readonly title: string;
  readonly fields: readonly ConfigEditorField[];
}

export interface ConfigEditorTarget {
  readonly mode: ConfigEditorMode;
  readonly targetPath: string;
  readonly configRoot: string;
  readonly userConfigPath?: string | undefined;
  readonly baselineRaw: Record<string, unknown>;
  readonly currentRaw: Record<string, unknown>;
  readonly baselineConfig: ConfigFile;
  readonly currentConfig: ConfigFile;
}

export interface PrepareConfigEditorTargetOptions {
  readonly cwd?: string | undefined;
  readonly kicadProject?: string | undefined;
  readonly configPath?: string | undefined;
  readonly user?: boolean | undefined;
  readonly userConfigPath?: string | undefined;
}

export interface BuildConfigEditorSaveResult {
  readonly targetPath: string;
  readonly toml: string;
  readonly sparse: Record<string, unknown>;
}
