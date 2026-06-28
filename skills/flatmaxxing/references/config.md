# flatmaxxing.toml reference

Every flatmaxx config key, its default, and what it controls. Every key is optional and falls
back to the default shown, so a real config only contains what the user overrides. Distances,
diameters, depths, and feeds are millimetres / mm-per-min unless noted; sides are `"front"` or
`"back"`.

Two ways to edit: `flatmaxx config` (interactive editor for the project file) or
`flatmaxx config --user` (for `~/flatmaxxing.user.toml`). The canonical, fully-commented copy
of this lives at `flatmaxxing.example.toml` in the flatmaxx repo.

## Contents
- [Layering & overrides](#layering--overrides)
- [Top level](#top-level)
- [`[skills]`](#skills)
- [`[dependencies]`](#dependencies)
- [`[paths]`](#paths)
- [`[board]`](#board)
- [`[alignmentDrills]`](#alignmentdrills)
- [`[electroplating]`](#electroplating)
- [`[solderMask]` / `[stencil]`](#soldermask--stencil)
- [`[drills]` / `[place]`](#drills--place)
- [`[cnc]`](#cnc)
- [`[xtool]`](#xtool)
- [`[makeracam]`](#makeracam)
- [`[validation]`](#validation)

## Layering & overrides

A project `flatmaxxing.toml` is layered over a shared `~/flatmaxxing.user.toml`. Configs pull
in others via `extends` (a list of files, merged left-to-right, this file applied last),
deep-merged so later wins — **arrays replace, they don't concatenate**. Any single value can be
overridden for one run with `--set path.to.key=value` and cleared with `--unset path.to.key`.

Put bench-wide settings (tool paths, owned bits, isolation params, laser settings) in the user
config; per-board things (board file, side exclusions) in the project config.

## Top level

| Key | Default | Notes |
|-----|---------|-------|
| `extends` | `[]` | Parent config files to inherit (later wins). Commonly `["~/flatmaxxing.user.toml"]`. |
| `projectDir` | `"."` | Project root the relative `[paths]` resolve against. |
| `skipRenderBoard` | `false` | Skip the inline terminal board preview. |

## `[skills]`

Controls the flatmaxx **agent skill** (this skill) install behavior.

| Key | Default | Notes |
|-----|---------|-------|
| `autoInstall` | `true` | When true, `flatmaxx init` installs the flatmaxxing skill into the project (`.claude/skills` + `.agents/skills`) via `npx skills`, and `flatmaxx doctor` offers to install it globally. Set `false` to opt out of both. Put it in `~/flatmaxxing.user.toml` to opt out before `init` ever writes a project config. The install is best-effort and only runs when `npx` is on `PATH`; if the skill is already installed globally, `init` won't add it at project scope. `flatmaxx init --skip-skill` opts out for a single run. This setting does **not** gate the explicit `flatmaxx skills install [--global]` command, which always installs on request (and is the way to re-install / update the skill). |

## `[dependencies]`

| Key | Default | Notes |
|-----|---------|-------|
| `kicadCli` | `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli` | Path to `kicad-cli`. Override per-run with `-k`. |
| `flatcam` | `"flatcam"` | Name on `PATH`, or an absolute path. |

## `[paths]`

All relative to `projectDir`. Defaults:

| Key | Default | Holds |
|-----|---------|-------|
| `additionalProjects` | `./manufacture` | combined / extra manufacture outputs |
| `gcode` | `./gcodes` | isolation + non-copper-clearing G-code |
| `svg` | `./svg` | vector solder-mask art |
| `dxf` | `./dxf` | board-outline DXFs |
| `png` | `./png` | rendered board & mask images |
| `gerbers` | `./gerbers` | Gerber + drill exports |
| `drills` | `./drills` | categorized Excellon drill files |
| `xtool` | `./xtool` | xTool Studio projects |
| `place` | `./place` | pick-and-place files |
| `cnc` | `./cnc` | MakeraCAM projects + exported G-code |

## `[board]`

| Key | Default | Notes |
|-----|---------|-------|
| `autoFix` | `false` | Let KiCad auto-fix board issues during validation. |
| `file` | *(auto-detected)* | The `.kicad_pcb`; auto-detected from `projectDir` if omitted. |
| `ignoreSide` | *(unset)* | `"front"` \| `"back"` to process only one side; omit for both. |

## `[alignmentDrills]`

Registration holes for double-sided alignment.

| Key | Default | Notes |
|-----|---------|-------|
| `generate` | `true` | |
| `diameter` | `2` | mm |
| `distance` | `{ x = 6, y = 6 }` | offset of the registration holes from the board |

## `[electroplating]`

| Key | Default | Notes |
|-----|---------|-------|
| `generateEdgeCutsWithAlignmentDrills` | `true` | |
| `cornerRadius` | `2` | mm, rounding on the plating outline |
| `additionalDistance` | `{ left = 16, right = 4, top = 4, bottom = 4 }` | extra outline margin per edge (left is wider for the contact) |

`[electroplating.container]`: `waterMl = 300`, `allowRotation = true`. Optional bath limits
`maxBoardWidthMm` / `maxBoardHeightMm` (omit for unbounded) **must be set together**.

`[electroplating.recipe]`: `currentDensityMaPerCm2 = 21.5`, `durationMinutes = 40`,
`stirRpm = 400`, `targetCopperMicrons = 20`, `voltageLimitV = 5`,
`copperSulfatePentahydrate = { gramsPerLiter = 250 }`, `citricAcid = { gramsPerLiter = 190 }`,
`polysorbate20 = { millilitersPerLiter = 10 }`, and
`[electroplating.recipe.hcl]` = `{ solutionConcentrationPercent = 7.5,
referenceConcentrationPercent = 7.5, referenceMillilitersPerLiter = 1 }`.

## `[solderMask]` / `[stencil]`

`[solderMask]`: `generate = true`, `double = true` (two-pass exposure), `excludeSides = []`
(e.g. `["back"]`), `distance = { x = 6, y = 6 }`.
`[solderMask.xtool]`: `device = "M1 Ultra"` (**only supported device**), `intensity = 100` (%),
`passes = 3`.

`[stencil]`: `generate = true`, `excludeSides = []`.
`[stencil.xtool]`: `device = "F1 Ultra"` (**only supported device**), `power = 100` (%),
`speed = 6000` (mm/min), `passes = 3`.

## `[drills]` / `[place]`

`[drills]`: `generate = true`, `withEdgeCuts = false` (include edge cuts in drill output).
`[place]`: `generate = true`.

## `[cnc]`

The bits the user physically owns. Drill hits snap to the nearest `availableDrills`; isolation
and clearing pick a suitable `availableMills`. `type` defaults to `"drill"` / `"mill"`.

Defaults:
```toml
[cnc]
availableDrills = [
  { diameter = 0.3 }, { diameter = 0.5 }, { diameter = 0.7 },
  { diameter = 0.8 }, { diameter = 1.0 }, { diameter = 1.1 }, { diameter = 1.2 },
]
availableMills = [
  { diameter = 0.7 }, { diameter = 0.8 }, { diameter = 1.0 }, { diameter = 1.1 },
  { diameter = 1.2 }, { diameter = 1.3 }, { diameter = 1.4 }, { diameter = 1.5 },
]
```

`[cnc.isolation]`: `feedRate = 120`, `spindleSpeed = 15000`, `zCutDepth = 0.05`,
`zCutFeedRate = 60`, `passes = 3`, `overlap = 60` (% between passes), `isoType = 2`
(FlatCAM isolation type 0/1/2), `tool = { type = "vbit", diameter = 0.14, angle = 60 }`.
A tool may be `vbit { diameter, angle }`, `mill { diameter, ... }`, or `drill { diameter }`.

`[cnc.nonCopperClearing]`: `feedRate = 120`, `spindleSpeed = 15000`, `zCutDepth = 0.05`,
`zCutFeedRate = 60`, `overlap = 40`, `margin = 0`, `method = "seed"`
(`"standard"` | `"seed"` | `"lines"`), `millZCutDepth = 0.075`,
`tool = { type = "vbit", diameter = 0.14, angle = 60 }`.

`[cnc.clearance]`: `travelZ = 2` (hop height), `endZ = 15` (safe height at end),
`rapidFeedRate = 1500`, `seamZ = 15` (retract at path seams).

`[cnc.backside]`: `mirrorAxis = "X"` (`"X"` | `"Y"` — axis the back side mirrors about).

`[cnc.drilling]`: `matchToleranceMm = 0.05` (how close a hole must be to a bit to match it).

## `[xtool]`

| Key | Default |
|-----|---------|
| `appPath` | `/Applications/xTool Studio.app` |
| `cdpHost` | `127.0.0.1` |
| `cdpPort` | `9333` |
| `existingProcess` | `"prompt"` (what to do if xTool Studio is already running) |
| `window` | `{ width = 1280, height = 720 }` |

## `[makeracam]`

| Key | Default |
|-----|---------|
| `appPath` | `/Applications/MakeraCAM.app` |
| `cutDepthMm` | `2` |
| `tabsPerContour` | `4` (retaining tabs left on the outline cut) |
| `existingProcess` | `"prompt"` |
| `window` | `{ width = 1728, height = 1037 }` |
| `platedHoles` | `{ generate = true }` |
| `finalCut` | `{ generate = true }` |

## `[validation]`

Two gates plus sanity-check ranges.

`[validation.isolationFeasibility]`: `enabled = true`, `onFailure = "error"` (`"error"`
hard-fails, `"warn"` continues), `ignore = []` (DRC rule ids to skip).

`[validation.drillFeasibility]`: `enabled = true`, `onFailure = "error"`.

`[validation.ranges]`: per-key `{ min, max }` bounds applied to config values (e.g.
`feedRate = { min = 1, max = 10000 }`, `toolDiameterMm = { min = 0.01, max = 10 }`,
`cutDepthMm = { min = 0.001, max = 5 }`, plus xtool and electroplating ranges). These guard
against typos; widen them only if the user genuinely operates outside the defaults.
