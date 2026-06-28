import type { BunPlugin } from "bun";

const stubReactDevtools: BunPlugin = {
  name: "stub-react-devtools-core",
  setup(build) {
    build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
      path: "react-devtools-core",
      namespace: "stub",
    }));
    build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: "export default {};",
      loader: "js",
    }));
  },
};

const version = process.env.FLATMAXX_VERSION ?? "0.0.0-dev";

const result = await Bun.build({
  entrypoints: ["src/index.ts"],
  compile: { target: "bun-darwin-arm64", outfile: "dist/flatmaxx" },
  define: { "process.env.FLATMAXX_VERSION": JSON.stringify(version) },
  plugins: [stubReactDevtools],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
console.log(`built ${result.outputs[0]?.path ?? "dist/flatmaxx"}`);
