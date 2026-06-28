import { tomlAssociationKey, tomlAssociationPattern } from "./constants";

export interface AssociationEdit {
  readonly text: string;
  readonly changed: boolean;
}

const associationBlock = (schemaRef: string) =>
  `  ${JSON.stringify(tomlAssociationKey)}: {\n    ${JSON.stringify(
    tomlAssociationPattern,
  )}: ${JSON.stringify(schemaRef)}\n  }`;

const freshSettings = (schemaRef: string) =>
  `{\n${associationBlock(schemaRef)}\n}\n`;

export const addTomlSchemaAssociation = (
  existing: string | undefined,
  schemaRef: string,
): AssociationEdit => {
  if (existing === undefined || existing.trim() === "") {
    return { text: freshSettings(schemaRef), changed: true };
  }

  if (existing.includes(`"${tomlAssociationKey}"`)) {
    return { text: existing, changed: false };
  }

  const open = existing.indexOf("{");

  if (open === -1) {
    return { text: freshSettings(schemaRef), changed: true };
  }

  const before = existing.slice(0, open + 1);
  const after = existing.slice(open + 1);
  const needsComma = after.replace(/^\s*/, "")[0] !== "}";

  return {
    text: `${before}\n${associationBlock(schemaRef)}${needsComma ? "," : ""}${after}`,
    changed: true,
  };
};
