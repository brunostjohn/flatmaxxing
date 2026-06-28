<div align="center">

# flatmaxx

**Turn a KiCad PCB into a complete CNC, laser, and electroplating job set - one command, end to end.**

[![Runtime: Bun](https://img.shields.io/badge/runtime-Bun-000000?logo=bun&logoColor=white)](https://bun.sh)
[![Effect v4](https://img.shields.io/badge/Effect-v4-5b3a9e)](https://effect.website)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Platform: macOS](https://img.shields.io/badge/platform-macOS-000000?logo=apple&logoColor=white)](#prerequisites)
[![Build: single binary](https://img.shields.io/badge/build-single%20binary-f97316)](#installation)

</div>

`flatmaxx` takes a finished KiCad board and drives your entire home-fab bench for you: it generates Gerbers and drill files, plans isolation milling and non-copper-clearing G-code with FlatCAM, sorts every hole into the bit you actually own, burns solder-mask and solder-paste stencils on an xTool laser, drills plated/non-plated holes and cuts the board outline on a Makera CNC, and even works out the electroplating bath recipe — all from a single command, behind a live terminal UI.

> [!NOTE]
> This tool is built around one specific bench: a **Makera Carvera (Air)** CNC, **xTool M1 Ultra / F1 Ultra** lasers, and a **DIY copper electroplating** setup. It's shared as-is. Nothing stops you using it, but you'll want to retune the config to your own hardware, tools, and chemistry before trusting the output to a machine.

## ⚠️ No support — use entirely at your own risk

> [!CAUTION]
> **This project is provided strictly AS IS, with NO SUPPORT of any kind.**
>
> - **No tech support.** Issues opened to ask for help, setup assistance, or troubleshooting **will not be answered** and may be closed without comment.
> - **No bug guarantees.** Even legitimate bug reports **may never get a response or a fix.** Don't assume one is coming.
> - **No warranty.** Nothing here is promised to work, to keep working, or to be safe for your hardware, your materials, or you. You run it at your own risk.
>
> This is a **hobby project** I share for free in my spare time. I have a full-time job and a life, and I'm not interested in spending my free time doing unpaid tech support — I don't want my hobby to become my job. If that's a problem for you, **don't use this.**
>
> Pull requests with fixes are welcome, but I make **no commitment** to review, respond to, or merge them.

## Features

- **One command, full pipeline** — `flatmaxx <project>` runs every stage from board validation to machine-ready files.
- **Isolation + non-copper clearing** — FlatCAM-driven V-bit isolation routing and pocket clearing, exported as Carvera G-code per side.
- **Drill categorization** — parses Excellon output and snaps every hole to the nearest bit in *your* declared drill set, warning on holes too small to machine.
- **Solder mask & paste stencil** — automates xTool Studio over the Chrome DevTools Protocol to import geometry and set laser power/speed/passes per device.
- **Drilling & edge cut** — automates MakeraCAM via macOS Accessibility to drill plated/non-plated holes and cut the board outline with retaining tabs.
- **Electroplating report** — computes bath dimensions, current density, timing, and chemistry from your board bounds and recipe.
- **Design rule checks** — isolation feasibility (DRC) and drill machinability gates that can warn or hard-fail before any machine moves.
- **Inline board preview** — renders the board image right in your terminal (kitty / iTerm2 / sixel).
- **Composable TOML config** — project + user config with `extends` inheritance, deep merge, and per-run CLI overrides.

## How it works

`flatmaxx` runs an ordered pipeline. Each stage feeds the next; you can disable the ones you don't need from config.

| # | Stage | Consumes | Produces | Driven via |
|---|-------|----------|----------|------------|
| 1 | Preflight | config | software & permission check | `doctor` checks |
| 2 | Validate board | `.kicad_pcb` | manufacturability report | `kicadts` |
| 3 | KiCad outputs | `.kicad_pcb` | Gerbers, drills, SVG, PNG + inline preview | `kicad-cli` |
| 4 | Categorize drills | Excellon | per-bit drill files | Excellon parser |
| 5 | Isolation DRC | Gerbers | clearance violations | FlatCAM (headless) |
| 6 | CNC jobs | Gerbers | isolation + NCC G-code (Carvera) | FlatCAM (headless) |
| 7 | Alignment drills | `.kicad_pcb` | registration holes | Excellon |
| 8 | Edge-cut DXFs | `.kicad_pcb` | `*-PTH_EdgeCuts.dxf`, `*-Final_EdgeCuts.dxf` | DXF generator |
| 9 | Electroplating report | board bounds + recipe | bath dimensions & timing | — |
| 10 | xTool projects | mask SVG + stencil DXF | solder mask + paste stencil jobs | xTool Studio (CDP) |
| 11 | Plated holes | PTH DXF + drills | drilling + plating outline G-code | MakeraCAM (AX) |
| 12 | Final cut | Final DXF + drills | non-plated drilling + edge contour | MakeraCAM (AX) |

## Prerequisites

> [!IMPORTANT]
> **macOS only.** The laser and CNC stages rely on native macOS Accessibility automation and AppleScript, so `flatmaxx` does not run on Linux or Windows.

External software (only the stages you enable need their tools):

| Tool | Needed for | Default location |
|------|-----------|------------------|
| [KiCad](https://www.kicad.org) (with `kicad-cli`) | always — board parsing & exports | `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli` |
| [FlatCAM](https://bitbucket.org/jpcgt/flatcam) | isolation DRC + CNC G-code | `flatcam` (on `PATH`) |
| [xTool Studio](https://www.xtool.com/pages/software) | solder mask + paste stencil | `/Applications/xTool Studio.app` |
| [MakeraCAM](https://www.makera.com) | drilling + edge cut | `/Applications/MakeraCAM.app` |

The xTool and MakeraCAM stages also require **macOS Accessibility permission** (System Settings → Privacy & Security → Accessibility) and a Chrome DevTools port open for xTool Studio (`127.0.0.1:9333` by default).

> [!TIP]
> Run `flatmaxx doctor <project>` before your first real build — it checks every required executable, app, and permission for your enabled stages and tells you exactly what's missing, without touching a machine.

## Installation

`flatmaxx` ships as a single, codesigned **macOS arm64 (Apple Silicon)** binary. Pick whichever install path you prefer.

### Homebrew

```sh
brew tap brunostjohn/flatmaxxing https://github.com/brunostjohn/flatmaxxing
brew install flatmaxx
```

Upgrade later with `brew upgrade flatmaxx`.

### Install script

Downloads the latest release into `~/.local/bin`, checksum-verified, using only standard macOS tools:

```sh
curl -fsSL https://raw.githubusercontent.com/brunostjohn/flatmaxxing/main/scripts/install.sh | sh
```

If `~/.local/bin` isn't on your `PATH`, the script prints the exact line to add. Pin a version with `FLATMAXX_VERSION=1.2.3`, or change the target with `FLATMAXX_INSTALL_DIR=...`. Installed this way, `flatmaxx update` upgrades in place (see [Updating](#updating)).

### From source

`flatmaxx` builds with [Bun](https://bun.sh) — the only thing you need.

```sh
git clone https://github.com/brunostjohn/flatmaxxing flatmaxx
cd flatmaxx
bun install
bun run build:native   # compile the native macOS accessibility module
```

Run it straight from source:

```sh
bun src/index.ts <kicad-project>
```

Or build the standalone, codesigned binary at `dist/flatmaxx`:

```sh
bun run build
./dist/flatmaxx <kicad-project>
```

### Updating

If you installed via the script (or any binary in a writable location), upgrade in place:

```sh
flatmaxx update           # check for and install the latest release, with a progress bar
flatmaxx update --check   # only report whether a newer release exists
```

Homebrew installs are managed by brew — run `brew upgrade flatmaxx` instead.

## Usage

Initialize a config in your KiCad project, then build:

```sh
flatmaxx init                 # create flatmaxxing.toml for the current project
flatmaxx ~/projects/myboard   # run the full pipeline
```

### Commands

| Command | What it does |
|---------|--------------|
| `flatmaxx <project>` | Creates CNC files from a KiCad project (same as `build`). |
| `flatmaxx build <project>` | Explicit form of the root command. |
| `flatmaxx init` | Creates a `flatmaxxing.toml` config for the current project. |
| `flatmaxx config` | Opens an interactive editor for project config overrides. |
| `flatmaxx config --user` | Edits the shared `~/flatmaxxing.user.toml`. |
| `flatmaxx doctor <project>` | Checks required software and permissions; generates nothing. |
| `flatmaxx validate <project> --fix` | Runs validation only — no FlatCAM, xTool, or MakeraCAM launches. |
| `flatmaxx clean <project> [--dry-run]` | Removes (or lists) generated output folders. |
| `flatmaxx update [--check]` | Updates flatmaxx in place to the latest GitHub release (script / binary installs; use `brew upgrade` for Homebrew). |

### Examples

```sh
# Use an explicit config file
flatmaxx build . --config flatmaxxing.toml

# Override any config value for a single run
flatmaxx build . --set cnc.isolation.feedRate=150

# Point at a custom kicad-cli executable
flatmaxx ~/projects/myboard -k /opt/kicad/kicad-cli

# Check the board and config without launching any apps
flatmaxx validate . --fix

# See what clean would delete, without deleting it
flatmaxx clean . --dry-run
```

## Configuration

`flatmaxx` reads a `flatmaxxing.toml` in the project, layered over a shared `~/flatmaxxing.user.toml`. Configs can pull in others via `extends`, are deep-merged (later wins), and any value can be overridden per run with `--set path=value` / `--unset path`.

Rather than hand-writing the whole file, run `flatmaxx init` to scaffold one, then `flatmaxx config` for an interactive editor. Every option, with its default value and allowed values, is documented in [`flatmaxxing.example.toml`](flatmaxxing.example.toml). A representative slice — your real tooling and isolation parameters:

```toml
extends = ["~/flatmaxxing.user.toml"]

[board]
file = "myboard.kicad_pcb"   # auto-detected if omitted

[cnc]
availableDrills = [
  { diameter = 0.4 }, { diameter = 0.5 }, { diameter = 0.7 },
  { diameter = 0.8 }, { diameter = 1.0 }, { diameter = 1.2 },
]
availableMills = [
  { diameter = 0.7 }, { diameter = 1.0 }, { diameter = 1.5 },
]

[cnc.isolation]
feedRate = 120
spindleSpeed = 15000
zCutDepth = 0.05
tool = { type = "vbit", diameter = 0.14, angle = 60 }
passes = 3
overlap = 60
```

<details>
<summary>Top-level config sections</summary>

`dependencies` (tool paths) · `paths` (output folders) · `board` · `alignmentDrills` · `electroplating` (container + recipe) · `solderMask` · `stencil` · `drills` · `place` · `cnc` (`isolation`, `nonCopperClearing`, `clearance`, `backside`, `drilling`, `availableDrills`, `availableMills`) · `xtool` · `makeracam` · `validation` (ranges + feasibility gates).

</details>

## Output layout

A full run writes machine-ready files into your project (folders are configurable under `[paths]`):

```
myboard/
├── gerbers/    # KiCad Gerber + edge-cut DXF exports
├── drills/     # categorized Excellon drill files (one per bit)
├── gcodes/     # isolation + non-copper-clearing G-code (Carvera)
├── dxf/        # board outline DXFs
├── png/        # rendered board & mask images
├── svg/        # vector solder-mask art
├── xtool/      # xTool Studio projects (solder mask + stencil)
└── cnc/        # MakeraCAM projects + exported drilling/contour G-code
```

The electroplating bath report (dimensions, current density, timing, chemistry) is generated alongside.

## Terminal experience

`flatmaxx` runs on an [Ink](https://github.com/vadimdemedes/ink) UI: a live, hierarchical task list shows every stage and substep with spinners, progress bars, and inline error detail. When your terminal supports it (kitty, iTerm2, or sixel), the rendered board image is drawn directly in the scrollback so you can eyeball the layout before any machine moves.

## Development

```sh
bun run dev         # build native + run against the bundled testdir/ project
bun test            # run the test suite
bun run typecheck   # type-check with tsgo
bun run format      # format with Biome
```

The codebase is built on Effect v4 and follows the conventions in [`CLAUDE.md`](CLAUDE.md); the native macOS accessibility bindings live in the Rust workspace under [`native/`](native).
