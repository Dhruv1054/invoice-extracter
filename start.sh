#!/usr/bin/env bash
set -e

echo "Starting Invoice Extractor..."

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Ensure venv exists
if [ ! -d "$ROOT_DIR/venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv "$ROOT_DIR/venv"
fi

VENV_PYTHON="$ROOT_DIR/venv/bin/python"

# Backend
cd "$ROOT_DIR/backend"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠  Created backend/.env — add your OPENROUTER_API_KEY before using the app."
fi
"$VENV_PYTHON" -m pip install -r requirements.txt -q
"$VENV_PYTHON" -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend
cd "$ROOT_DIR/frontend"
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
fi
npm install -q
npm run dev &
FRONTEND_PID=$!

echo ""
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
