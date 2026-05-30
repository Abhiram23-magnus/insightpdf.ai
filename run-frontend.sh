#!/usr/bin/env bash
# Convenience script to start the frontend.
set -e
cd "$(dirname "$0")/frontend"
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi
echo "Starting Next.js on http://localhost:3000"
npm run dev
