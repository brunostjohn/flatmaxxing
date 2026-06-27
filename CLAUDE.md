---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

- Use ../effect-smol as the Effect v4 CLI reference; do not use Context7 for Effect v4.
- Don't EVER add comments.
- Avoid ternaries that choose between effects. `Effect.if` does NOT exist in this clone — use `Match.value(cond).pipe(Match.when(true, () => effA), Match.orElse(() => effB))` or a guard + `yield*`.
- Don't ever write retries or timeouts or anything covered by the effect standard library. ALWAYS use effect helpers.
- Treat Effect as the standard library. Before replacing any helper, loop, timeout, retry, process call, filesystem call, parser wrapper, worker code, mutable accumulator, validation, or resource lifecycle code, search `../effect-smol/packages/**` for an Effect-native primitive.
- Prefer imports from the Effect barrel, for example `import { Array, Data, Duration, Effect, FileSystem, Match, Option, pipe, Schedule, Schema } from "effect";`.
- Use `Array.map`, `Array.reduce`, `Array.filterMap`, `Array.partition`, `Array.findFirst`, `Array.mapAccum`, `Effect.forEach`, `Effect.findFirst`, and verified Effect loop helpers instead of `for`, `while`, `.push`, or `let` accumulation.
- Use `Match` for non-trivial branching. The local Effect v4 clone currently does not export `Effect.if`; verify `../effect-smol` before using it, and use `Match` returning effects when `Effect.if` is unavailable.
- Use `Duration` and `Effect.timeout`; avoid `*Ms` options except at unavoidable native API boundaries.
- Use `FileSystem.FileSystem`, `Path.Path`, and `effect/unstable/process` before Bun or Node APIs. Exception: there is no Effect Bun-worker wrapper — keep `Effect.acquireUseRelease` + `Effect.callback` for one-shot Bun workers (see facts below).
- Use `Data.TaggedError` for all production errors and consolidate them under `src/errors`.
- Decode external JSON/TOML-shaped data with `Schema`; export schema types as `Schema.Schema.Type<typeof SomethingSchema>`.
- `Effect.try`, `Effect.sync`, `Effect.tryPromise`, and `Effect.promise` should wrap one direct boundary call only. Split long callbacks into named pure helpers or tiny unsafe boundary functions before composing in `Effect.gen` or `Effect.fn`.
- For cancellable promise APIs, use `Effect.tryPromise(({ signal }) => call({ signal }))` and compose `Effect.timeout`.
- In the current local Effect v4 API, `Effect.tryPromise` receives the abort signal as the callback argument directly: `Effect.tryPromise({ try: (signal) => call(signal), catch })`.
- In the current local Effect v4 API, use `Option.fromUndefinedOr(value)` for optional values; `Option.fromNullable` is not exported.
- Yield Effect services at the start of an `Effect.gen` or `Effect.fn` body.
- Prefer `Context.Service` for dependencies instead of passing dependency bags in objects.
- Prefer `interface` for object shapes. Use `type` only for unions, tuples, mapped or conditional types, brands, literal unions, and schema-derived aliases.
- Do not add unnecessary return types.
- Every normal function that can be an arrow function should be an arrow function.
- Do not mix types with logic. Put types in local `types.ts` files and constants in local `constants.ts` files.
- Do not keep old-revision compatibility barrels or shims.
- Remove generic helpers that Effect or a focused dependency can replace.
- Cleanup audit before finishing a change: Effect replacement searched, non-Effect boundary wrapped, no casts for parsed data, no production untagged errors, no unnecessary return annotations, no mutable accumulation, services yielded first, and tests run with Bun.

## Verified Effect v4 facts (this clone, beta `4.0.0-beta.84`)

Two exhaustive, source-cited cheat-sheets live at `~/.claude/plans/effect-v4-ref-iteration.md` (Array/Record/Match/Schedule/Duration/Ref/Option/Result) and `~/.claude/plans/effect-v4-ref-platform.md` (FileSystem/Path/ChildProcess/Stream/Schema/Data/Context/Layer). Read those before reaching for an API; never read the 10k-line `effect-smol` modules wholesale.

- **Absent (do not use):** `Effect.if`/`Effect.unless`/`Effect.loop`/`Effect.iterate`/`Effect.reduce`/`Effect.whenEffect`; `Option.fromNullable`; `Match.either`; `Schedule.intersect`/`union`/`recurUpTo`/`recurWhile`; `Array.isNonEmptyReadonlyArray`. Present alternatives: `Effect.when` (condition is an `Effect<boolean>`) + `Effect.whileLoop`; `Option.fromUndefinedOr`; `Match.option`/`Match.result`; `Schedule.both`/`either`/`during`/`take` + `Effect.retry({ schedule, times })`; `Array.isArrayNonEmpty`.
- **Branching:** `Match.value/type` + `Match.when/whenOr/tag/tagsExhaustive/orElse/exhaustive`. Branches may return effects.
- **Iteration:** `Array.{reduce,map,filterMap,partition,mapAccum,groupBy,range,zipWith,findFirst}` and `Record.{map,filter,filterMap,reduce,toEntries,fromEntries,set,modify}` for immutable object folds. `Array.partition`/`filterMap` consume `Result` (`Result.succeed`/`Result.fail`) — there is no `Either`. Pure state machines use `Array.mapAccum`; `Ref` only for state shared across effects/fibers.
- **Time:** `Duration.Input` strings (`"300 millis"`, `"5 seconds"`) work anywhere a duration is taken (`Effect.sleep/timeout/delay`, `Schedule.*`). Poll = `op.pipe(Effect.retry(Schedule.spaced("300 millis").pipe(Schedule.take(n))))`; one-shot = `Effect.timeout`. `Duration.toMillis(d)` only at native boundaries.
- **Platform services:** `Path.Path` and `FileSystem.FileSystem` are barrel-imported (`import { Path, FileSystem } from "effect"`), provided app-wide by `BunServices.layer` (`src/index.ts`). `Path` methods are SYNC after `yield* Path.Path` (only `to/fromFileUrl` are effectful). Tests provide the static `Path.layer` (or `BunServices.layer` when `FileSystem` is needed).
- **Process output:** `ChildProcessSpawner` (yield `ChildProcessSpawner.ChildProcessSpawner`) has `spawner.string(cmd)` / `spawner.lines(cmd)` / `streamString` / `exitCode` — never hand-roll a `Ref` + dual-`Stream.runForEach` drain. For stdout+stderr+exitCode together use `runCollectingBoth` from `@/process`.
- **Workers — NO-GO:** `effect/unstable/workers` is a long-lived RPC actor protocol with no one-shot or pool primitive; wrong fit for per-task DXF workers. Keep `Effect.acquireUseRelease` + `Effect.callback`, and Schema-validate the worker response (`src/compute`).
- **Schema:** `Schema.decodeUnknownSync` (throws) / `decodeUnknownEffect` (`Effect<…, SchemaError>`); `Schema.Tuple([Number×4])` for numeric bounds; export aliases as `Schema.Schema.Type<typeof S>`. Decode all parsed TOML/JSON/CDP/DRC/DXF data — no `as` on parsed data.
- **Errors:** every production error is a `Data.TaggedError("Name")<{ message: string; cause?: unknown }>` in `src/errors/<category>.ts` (barrel `src/errors/index.ts`). The ONLY exempt `new Error`: strings inside `src/stages/xtool/scripts/browser/*` (executed in-page via CDP, caught/wrapped by `runScriptInXToolStudio`).
- **Justified Node boundaries (Effect has no equivalent), wrap in `Effect.sync`/`Effect.try`:** `node:os.homedir`; `node:readline/promises`; `node:net` `Socket` (compose `Effect.timeout`); synchronous TOML reads in the ink config editor (`node:fs` `readFileSync`/`existsSync` via `Effect.runSync` — `FileSystem` is async-backed and cannot be `runSync`'d).
- **Config:** deep-merge is `merge` from `@/config` (`deepmerge-ts` with `mergeArrays: false`, so override replaces arrays). `src/config/schema` is canonical (no top-level `src/schema`).

## Project conventions

- One function per file, grouped by use (the `src/stages/xtool/**` layout is the gold standard). Tiny shared utils go in a per-folder `utils.ts`; types in `types.ts`; literals in `constants.ts`.
- Stages report progress with `createTasklist` (a `tasks.ts` hierarchical `TaskDef` tree + a typed `taskPaths` module, driven by `runTask`/`patchTask`) — see `src/stages/xtool/tasks/`.
- Build scripts (FlatCAM/g-code/Excellon/browser/AppleScript) as composed pure functions taking typed args, not arrays of template strings joined with `\n`.

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `FileSystem.FileSystem` over both `Bun.file` and `node:fs` in app code (see the Effect facts above); `Bun.file` only outside the Effect runtime.
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.
