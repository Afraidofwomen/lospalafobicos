#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m venv --without-pip services/math/.venv
curl -fsSL https://bootstrap.pypa.io/get-pip.py | services/math/.venv/bin/python
services/math/.venv/bin/pip install -r services/math/requirements.txt
