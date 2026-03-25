#!/bin/bash

# Deploy NFT Auction to Docker
# Builds the project and copies to Docker directory for deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$HOME/docker/nft-auction"

echo "🔨 Building NFT Auction..."
cd "$PROJECT_DIR"
npx vite build

echo ""
echo "📦 Copying to Docker directory..."
rm -rf "$DOCKER_DIR/dist"
cp -r "$PROJECT_DIR/dist" "$DOCKER_DIR/"

echo ""
echo "🐳 Restarting Docker container..."
cd "$DOCKER_DIR"
docker compose restart nft-auction

echo ""
echo "✅ Deployment complete!"
echo "   App: https://nft.septemlabs.com"
echo "   Container: nft-auction"
