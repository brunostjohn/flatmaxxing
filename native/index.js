const { existsSync } = require("node:fs");
const { join } = require("node:path");

const triples = {
  "darwin:arm64": "darwin-arm64",
  "darwin:x64": "darwin-x64",
};

const triple = triples[`${process.platform}:${process.arch}`];

if (!triple) {
  throw new Error(
    `Unsupported platform for @flatmaxxing/accessibility: ${process.platform}/${process.arch}`,
  );
}

const bindingPath = join(__dirname, `accessibility.${triple}.node`);

if (!existsSync(bindingPath)) {
  throw new Error(
    `Cannot find @flatmaxxing/accessibility native binding. Run \`bun run --cwd native build\` first.`,
  );
}

module.exports = require(bindingPath);
