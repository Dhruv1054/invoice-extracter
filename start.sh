#!/usr/bin/env bash
set -e

echo "Starting Invoice Extractor..."

# Backend
cd backend
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠  Created backend/.env — add your ANTHROPIC_API_KEY before using the app."
fi
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Frontend
cd frontend
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
fi
npm install -q
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
