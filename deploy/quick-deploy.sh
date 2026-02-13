#!/bin/bash
# Quick Deploy Script - Auto commit, push, and rebuild
# Note: Configure git credentials with: git config credential.helper store

set -e

echo "🚀 Starting auto-deployment..."

# Git config
git config --global user.name "OrtobomPatricio"
git config --global user.email "ortobompatricio@gmail.com"

# Commit and push
echo "📝 Committing changes..."
git add .
git commit -m "fix: WhatsApp messaging - DB schema + React Hooks fixes" || echo "No changes to commit"

echo "⬆️  Pushing to GitHub..."
git push origin main

# Rebuild Docker
echo "🐳 Rebuilding Docker containers..."
docker compose down
docker compose build --no-cache app
docker compose up -d

echo "✅ Deployment complete!"
echo "📊 Viewing logs (Ctrl+C to exit)..."
docker compose logs -f app
