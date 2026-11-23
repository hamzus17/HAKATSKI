#!/usr/bin/env bash
cd /c/dev/alert-to-patch || exit 1
if [ -f .venv/Scripts/activate ]; then source .venv/Scripts/activate; fi
python hakatsuki_server.py
