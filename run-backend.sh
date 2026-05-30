#!/usr/bin/env bash
# Convenience script to start the backend.
set -e
cd "$(dirname "$0")/backend"
if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt
echo "Starting FastAPI on http://localhost:8000 (docs at /docs)"
uvicorn app.main:app --reload --port 8000
