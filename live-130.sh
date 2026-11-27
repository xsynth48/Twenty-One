#!/usr/bin/env bash
# Beta 130 live (17 Nov 2026): the Lux look from the canvas "Twenty-One Lux", only in launch mode (today only the test PC on the
# server's allowlist; everyone else keeps today's look until ROBO_LAUNCH = "on"). App only: the server did not change.
# The notes stay neutral: the new look is secret until launch day.
#   ! bash /c/Users/levon/twocode-assistent-electron/tools/live-130.sh
set -e
NODE="/c/Program Files/nodejs/node.exe"
ROOT="/c/Users/levon/twocode-assistent-electron"
cd "$ROOT"
echo "== update (beta 130)"
"$NODE" tools/publish.cjs "Small fixes and improvements."
echo "== done"
