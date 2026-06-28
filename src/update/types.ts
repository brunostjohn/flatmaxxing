export interface ReleaseInfo {
  readonly version: string;
  readonly tag: string;
  readonly downloadUrl: string;
  readonly checksumUrl: string;
}

export interface RunUpdateOptions {
  readonly check: boolean;
  readonly force: boolean;
}
