export const projectConfigFilename = "flatmaxxing.toml";
export const userConfigFilename = "flatmaxxing.user.toml";
export const userConfigExtendsPath = `~/${userConfigFilename}`;

export const sideArrayDescription = `TOML array, for example ["front"] or ["front", "back"].`;

export const parseOptions = {
  errors: "all",
  onExcessProperty: "error",
} as const;
