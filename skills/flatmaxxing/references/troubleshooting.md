# flatmaxx troubleshooting

Failure → why → fix. Prefer fixing the design, tools, or config over flipping a validation
gate to `warn`. When a stage stops the build, the inline tasklist marks where; reason from the
pipeline order (see SKILL.md) about what already produced output and what didn't.

## `doctor` reports a missing dependency

`flatmaxx doctor <project>` checks only the tools the *enabled* stages need.

- **KiCad CLI not found** — install KiCad, or point `dependencies.kicadCli` at the real
  `kicad-cli` (or pass `-k <path>`). It's always required.
- **FlatCAM not found** — put `flatcam` on `PATH` or set `dependencies.flatcam` to an absolute
  path. Needed for isolation DRC + CNC G-code; if you don't mill, you can leave those stages
  unused, but the CNC stage will fail without it.
- **xTool Studio / MakeraCAM app not found** — install the app or fix `xtool.appPath` /
  `makeracam.appPath`. Only needed when solder mask/stencil or drilling/edge-cut are enabled.
  To skip those stages instead, disable them (`solderMask.generate=false`,
  `stencil.generate=false`, `makeracam.platedHoles.generate=false`,
  `makeracam.finalCut.generate=false`).

## "exists but is not executable"

The path resolves to a file without execute permission. `chmod +x` it, or point the config at
the correct binary.

## Accessibility permission missing

xTool and MakeraCAM are driven via macOS Accessibility. Grant it under **System Settings →
Privacy & Security → Accessibility** for the terminal/app running flatmaxx, then re-run
`doctor`. Without it those automation stages can't control the apps.

## CDP port 9333 already in use

xTool Studio is driven over the Chrome DevTools Protocol on `127.0.0.1:9333`. If `doctor`
warns the port is busy, quit the process holding it (often a stale xTool Studio or a previous
run), or change `xtool.cdpPort` to a free port. `xtool.existingProcess = "prompt"` controls
what happens if xTool Studio is already running.

## Isolation-feasibility (DRC) failure

The board has copper closer together than the V-bit can separate. The gate compares the tool's
**effective diameter at cut depth** against the real clearances in the Gerbers. Fixes, best
first:

1. Increase clearance in the KiCad design (re-route / re-pour) and re-export.
2. Use a finer tool or shallower cut: lower `cnc.isolation.tool.diameter`/`angle` or
   `cnc.isolation.zCutDepth` so the effective diameter shrinks.
3. As a last resort, and only with the user's explicit OK, set
   `validation.isolationFeasibility.onFailure = "warn"` (or add the specific rule id to
   `validation.isolationFeasibility.ignore`) — this lets a known-marginal cut through; the
   result may not isolate cleanly.

## Drill-machinability failure / `ROUNDED_UP` report

Categorization snaps each hole to the nearest bit in `cnc.availableDrills` within
`cnc.drilling.matchToleranceMm`. A hole smaller than your smallest bit, or outside tolerance,
either fails the gate or is rounded up (and listed in the drills `ROUNDED_UP` report). Fixes:

- Add the missing bit to `cnc.availableDrills` if you own it.
- Widen `cnc.drilling.matchToleranceMm` slightly if a hole is just outside tolerance.
- Adjust the hole size in the KiCad design.
- A `ROUNDED_UP` entry is a *warning*: the hole will be drilled larger than designed —
  confirm that's acceptable (clearance/fit) before machining.

## Backside doesn't register with the front

`cnc.backside.mirrorAxis` (`"X"`/`"Y"`) sets which axis the back is mirrored about. If the back
side is flipped the wrong way relative to how the user flips the physical board, switch the
axis and regenerate.

## FlatCAM headless quirks

FlatCAM is run headless and is finicky: some script commands (e.g. certain `set_sys` /
`export_excellon` / `-rest` forms) misbehave, and it won't always self-terminate. flatmaxx
already wraps it with a timeout and cleanup. If the CNC stage hangs or fails opaquely, re-run;
confirm the `flatcam` binary works standalone; and check the FlatCAM log. Don't hand-edit the
generated FlatCAM scripts.

## Board validation failures

`flatmaxx validate <project> --fix` (or `board.autoFix = true`) lets KiCad attempt fixes during
validation. Use `validate` for a full no-machine pass — it runs board + config checks without
launching FlatCAM, xTool, or MakeraCAM, so it's the fastest way to confirm a config change is
sane before a real build.

## Config validation error ("Invalid flatmaxxing config")

A value fell outside its `[validation.ranges]` bound (a guard against typos). Fix the value, or
— if the user truly operates outside the defaults — widen the specific range.

## A run wrote nothing / partial output

Reason from the pipeline order. Early stages (Gerbers, drills) come before CNC, DXF, xTool, and
MakeraCAM, so a failure stops everything downstream. Check the tasklist for the failed stage
and the inline error detail, run `doctor` to rule out a missing tool/permission, and use
`flatmaxx clean <project> --dry-run` to see what a previous run left behind before re-running.

## "flatmaxx does not run on Linux/Windows"

Expected — the laser/CNC stages use native macOS Accessibility and AppleScript. flatmaxx is
macOS-only; there's no cross-platform path.
