#!/usr/bin/env bash
set -euo pipefail
MSG=$(cat /home/runner/work/aeon/aeon/movers_msg.txt)
exec /home/runner/work/aeon/aeon/notify "$MSG"
