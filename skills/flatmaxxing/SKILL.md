---
name: flatmaxxing
description: >-
  Drive flatmaxx — the macOS CLI that turns a finished KiCad PCB into machine-ready CNC,
  laser, and electroplating jobs — on the user's behalf. Use this whenever the user is in a
  repo with a flatmaxxing.toml or a .kicad_pcb and wants to fabricate a board: exporting
  Gerbers/drills, planning isolation milling or non-copper-clearing G-code (FlatCAM →
  Carvera), snapping drill hits to the bits they actually own, burning solder mask or paste
  stencils on an xTool laser, drilling and edge-cutting in MakeraCAM, or computing an
  electroplating bath recipe. Also use for anything about the flatmaxx commands (init,
  config, doctor, validate, build, clean, update), editing flatmaxxing.toml, or fixing
  isolation-feasibility / drill-machinability failures. Reach for it even when the user
  only says "make the gcode for my board", "run my board", "fab this PCB", or mentions
  Carvera, isolation routing, V-bit, or solder mask — without naming flatmaxx explicitly.
---

# flatmaxxing

flatmaxx takes a finished KiCad board and drives an entire home-fab bench end to end: it
exports Gerbers and drills, plans isolation + non-copper-clearing G-code with FlatCAM, sorts
every hole into a bit the user owns, burns solder mask and paste stencils on an xTool laser,
drills holes and cuts the outline in MakeraCAM, and computes an electroplating bath recipe —
all from one command behind a live terminal UI.

Your job is to operate this tool *for* the user: pick the right command, get the config
matching their hardware, run `doctor` before any machine moves, read the output, and explain
failures in terms of what to change. The user trusts the result to real, expensive machines
and materials — so be conservative, surface every warning, and never gloss over a failed
validation gate.

## Scope check — is this the skill?

You're in scope if the working directory (or a path the user names) has a `flatmaxxing.toml`
or a `*.kicad_pcb`, or the user talks about isolation milling, Gerbers, Excellon drills,
Carvera/MakeraCAM, xTool solder mask/stencils, or copper electroplating for a PCB. If they're
just editing the KiCad schematic/layout itself (routing traces, placing parts), that's KiCad,
not flatmaxx — help with that directly.

## Hard prerequisites (macOS only)

flatmaxx runs **only on macOS** — the laser and CNC stages use native Accessibility
automation and AppleScript. The external tools are needed only for the stages the user
enables:

| Tool | Needed for | Default location |
|------|-----------|------------------|
| KiCad (`kicad-cli`) | always — board parsing & exports | `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli` |
| FlatCAM | isolation DRC + CNC G-code | `flatcam` (on `PATH`) |
| xTool Studio | solder mask + paste stencil | `/Applications/xTool Studio.app` |
| MakeraCAM | drilling + edge cut | `/Applications/MakeraCAM.app` |

xTool and MakeraCAM also need **Accessibility permission** (System Settings → Privacy &
Security → Accessibility) and xTool needs a Chrome DevTools port open (`127.0.0.1:9333` by
default). **Always run `flatmaxx doctor <project>` before the first real build** — it checks
every required executable, app, and permission for the *enabled* stages and reports exactly
what's missing without touching a machine.

## The pipeline

`flatmaxx <project>` runs an ordered pipeline; each stage can be disabled from config. Knowing
the order lets you reason about what a partial run produced and where it stopped.

| # | Stage | Consumes | Produces |
|---|-------|----------|----------|
| 1 | Preflight | config | software & permission check |
| 2 | Validate board | `.kicad_pcb` | manufacturability report |
| 3 | KiCad outputs | `.kicad_pcb` | Gerbers, drills, SVG, PNG + inline preview |
| 4 | Categorize drills | Excellon | per-bit drill files + oversize warnings |
| 5 | Isolation DRC | Gerbers | clearance-violation report |
| 6 | CNC jobs | Gerbers | isolation + NCC G-code (Carvera) |
| 7 | Alignment drills | `.kicad_pcb` | registration holes |
| 8 | Edge-cut DXFs | `.kicad_pcb` | `*-PTH_EdgeCuts.dxf`, `*-Final_EdgeCuts.dxf` |
| 9 | Electroplating report | board bounds + recipe | bath dimensions, current, timing, chemistry |
| 10 | xTool projects | mask SVG + stencil DXF | solder mask + paste stencil jobs |
| 11 | Plated holes | PTH DXF + drills | drilling + plating-outline G-code (MakeraCAM) |
| 12 | Final cut | Final DXF + drills | non-plated drilling + edge contour (MakeraCAM) |

## Commands

| Command | What it does |
|---------|--------------|
| `flatmaxx <project>` / `flatmaxx build <project>` | Run the full pipeline. |
| `flatmaxx init` | Scaffold `flatmaxxing.toml` for the current project (interactive board pick). |
| `flatmaxx config` / `flatmaxx config --user` | Interactive editor for the project or shared `~/flatmaxxing.user.toml`. |
| `flatmaxx skills install [--global]` | Install (or re-install/update) this agent skill into the project, or for the current user with `--global`. Runs regardless of `skills.autoInstall`. |
| `flatmaxx doctor <project>` | Check required software & permissions; generates nothing. |
| `flatmaxx validate <project> --fix` | Run board + config validation only — no FlatCAM/xTool/MakeraCAM launches. |
| `flatmaxx clean <project> [--dry-run]` | Remove (or list) generated output folders. |
| `flatmaxx update [--check]` | Self-update to the latest GitHub release (script/binary installs; use `brew upgrade` for Homebrew). |

`<project>` defaults to the current directory. Override any single config value for one run
with `--set path.to.key=value` (and `--unset path.to.key`); point at an explicit config with
`--config <file>`; override the KiCad CLI with `-k <path>`. See `flatmaxx <cmd> --help` for
the full flag list.

## The playbook

Take the user from a finished KiCad board to machine files like this. Don't run stages blind —
explain what each command will do before running anything that launches an app or moves a head.

1. **Set up config.** If there's no `flatmaxxing.toml`, run `flatmaxx init` in the project. It
   auto-detects the `.kicad_pcb`, writes the file, and inherits `~/flatmaxxing.user.toml` if
   present. Shared machine settings (tool paths, the bits they own, isolation parameters)
   belong in the user config; per-board overrides in the project config.
2. **Make the config match the bench.** The defaults describe one specific setup (Makera
   Carvera, xTool M1/F1 Ultra, a DIY plating bath). Before trusting any output, confirm the
   real hardware and tools — especially `cnc.availableDrills` / `availableMills` (the bits
   physically in the rack) and the isolation tool/feeds. Edit with `flatmaxx config` or by
   hand; see [references/config.md](references/config.md) for every option.
3. **Run `flatmaxx doctor <project>`.** Fix anything it flags (missing app, missing
   Accessibility permission, port 9333 in use) before a real build.
4. **Build.** `flatmaxx <project>`. Watch the live tasklist; the inline board preview (kitty /
   iTerm2 / sixel terminals) lets the user eyeball the layout before machines move. For a
   dry, no-machine pass first, use `flatmaxx validate <project> --fix`.
5. **Read the result and hand off.** Map the output folders (below) to each machine. If a
   validation gate failed or a hole was rounded up, walk the user through the fix in
   [references/troubleshooting.md](references/troubleshooting.md) rather than forcing past it.

When the user wants a quick experiment, prefer `--set` over editing the file — e.g.
`flatmaxx build . --set cnc.isolation.feedRate=150` — so their saved config stays clean.

## Config knobs you'll actually touch

Full reference: [references/config.md](references/config.md). The high-leverage ones, and why:

- **`cnc.availableDrills` / `cnc.availableMills`** — the bits the user physically owns. Drill
  hits snap to the nearest of these; isolation/clearing pick a suitable mill. Wrong list →
  holes rounded to the wrong size or a machinability failure.
- **`cnc.isolation.tool` + `feedRate` / `passes` / `overlap` / `zCutDepth`** — the V-bit and
  how aggressively it cuts. The tool's *effective* diameter at cut depth sets the finest
  clearance the board can have; this is what the isolation-feasibility gate checks.
- **`cnc.backside.mirrorAxis`** (`X`/`Y`) — which axis the back side mirrors about. Wrong axis
  → a mirrored back that won't register with the front.
- **`cnc.drilling.matchToleranceMm`** — how close a hole must be to a bit to match it before
  it's rounded up (and warned about).
- **`solderMask.xtool` / `stencil.xtool`** — laser device (M1 Ultra for mask, F1 Ultra for
  stencil) and power/speed/passes. These are material- and machine-specific; tune on scrap.
- **`validation.isolationFeasibility` / `validation.drillFeasibility`** — the gates. Each is
  `enabled` + `onFailure` (`"error"` hard-fails, `"warn"` continues). Prefer fixing the design
  or tools over flipping a gate to `warn`; only downgrade with the user's explicit OK.

Config layers: project `flatmaxxing.toml` over shared `~/flatmaxxing.user.toml`, composable
via `extends`, deep-merged (later wins, arrays replace), then per-run `--set`/`--unset`.

## Output map

A full run writes into the project (folders configurable under `[paths]`):

```
gerbers/   KiCad Gerber + drill exports (+ edge-cut DXFs)
drills/    categorized Excellon, one file per bit  (+ ROUNDED_UP report on oversize hits)
gcodes/    isolation + non-copper-clearing G-code (Carvera dialect), per side
dxf/       board-outline DXFs: *-PTH_EdgeCuts.dxf (with registration holes), *-Final_EdgeCuts.dxf
svg/       vector solder-mask art (xTool input)
png/       rendered board & mask images
xtool/     xTool Studio projects (solder mask + paste stencil)
cnc/       MakeraCAM projects + exported drilling/contour G-code
place/     pick-and-place output
```

The electroplating bath report (dimensions, current density, timing, chemistry) is written
alongside. Naming follows `<board>-<what>` — e.g. front-side isolation G-code is the isolation
file for the front; the PTH edge-cut DXF carries the alignment holes.

## House rules

- **macOS only.** Don't suggest running flatmaxx on Linux/Windows.
- **It's provided as-is, no support.** When something breaks, debug with the user from the
  output and config — there is no support channel to point them to.
- **Machines and chemistry are dangerous.** Don't push past a failed feasibility gate, don't
  invent feeds/speeds/laser settings the user hasn't validated, and flag anything that looks
  like it could crash a tool or mishandle plating chemicals. When in doubt, recommend a
  `validate`/`doctor` pass or a scrap test before committing material.
