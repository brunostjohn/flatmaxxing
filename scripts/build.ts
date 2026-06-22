// Compiles flatmaxx into a standalone aarch64-macOS executable with the native
// AX dylib embedded (via the `with { type: "file" }` import in src/macos). Run by
// `bun run build`, which also (re)builds the dylib first and codesigns after.
//
// ink optionally pulls in `react-devtools-core`, but only inside an
// `if (process.env.DEV === 'true')` branch it never takes in production. We don't
// ship that package, so we stub it here — otherwise the bundler fails trying to
// resolve it. The stub is bundled but dormant (the guarded dynamic import never
// runs in the compiled binary).
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

const result = await Bun.build({
	entrypoints: ["src/index.ts"],
	compile: { target: "bun-darwin-arm64", outfile: "dist/flatmaxx" },
	plugins: [stubReactDevtools],
});

if (!result.success) {
	for (const log of result.logs) console.error(log);
	process.exit(1);
}
console.log(`built ${result.outputs[0]?.path ?? "dist/flatmaxx"}`);
