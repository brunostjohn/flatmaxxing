import { buildConfigJsonSchemaText } from "../src/config/schema/buildConfigJsonSchema";

const outPath = `${import.meta.dir}/../flatmaxxing.schema.json`;
await Bun.write(outPath, buildConfigJsonSchemaText());
console.log(`generated ${outPath}`);
