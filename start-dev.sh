#!/bin/bash

# Script to install dependencies and start the dev server
cd "$(dirname "$0")"

# Try to find pnpm or use alternatives
PNPM_CMD=""

# Check if pnpm is in PATH
if command -v pnpm &> /dev/null; then
    PNPM_CMD="pnpm"
# Try npx pnpm
elif command -v npx &> /dev/null; then
    PNPM_CMD="npx pnpm"
# Try npm as fallback
elif command -v npm &> /dev/null; then
    echo "pnpm not found, using npm instead..."
    PNPM_CMD="npm"
# Check common installation locations
elif [ -f "$HOME/.local/share/pnpm/pnpm" ]; then
    PNPM_CMD="$HOME/.local/share/pnpm/pnpm"
elif [ -f "/opt/homebrew/bin/pnpm" ]; then
    PNPM_CMD="/opt/homebrew/bin/pnpm"
elif [ -f "/usr/local/bin/pnpm" ]; then
    PNPM_CMD="/usr/local/bin/pnpm"
else
    echo "Error: Could not find pnpm, npm, or npx."
    echo "Please install pnpm: npm install -g pnpm"
    echo "Or install Node.js and npm first: https://nodejs.org/"
    exit 1
fi

echo "Using: $PNPM_CMD"
echo ""
echo "Installing dependencies..."
$PNPM_CMD install

if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies"
    exit 1
fi

echo ""
echo "Starting development server..."
$PNPM_CMD dev
