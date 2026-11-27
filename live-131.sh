#!/usr/bin/env bash
# Beta 131 live (17 Nov 2026): the glass orb (orb-ui.js), the mascot from the canvas "C · Glas", only in launch mode (today
# only the test PC on the server's allowlist; everyone else keeps today's Robo until ROBO_LAUNCH = "on"). On a switch he fills
# with the new colour, then drips out of the island, shows the moment and goes back in; Robo Buddy is the orb too.
# App only: the server did not change. The notes stay neutral: the new look is secret until launch day.
#   ! bash /c/Users/levon/twocode-assistent-electron/tools/live-131.sh
set -e
NODE="/c/Program Files/nodejs/node.exe"
ROOT="/c/Users/levon/twocode-assistent-electron"
cd "$ROOT"
echo "== update (beta 131)"
"$NODE" tools/publish.cjs "Small fixes and improvements."
echo "== done"
