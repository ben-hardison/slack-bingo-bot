#!/bin/bash

# Deployment script for Slack Bingo Bot
# Makes deployment easier for hackathon

set -e

echo "🎮 Slack Bingo Bot Deployment Script"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your Slack tokens!"
    echo "   - SLACK_BOT_TOKEN=xoxb-..."
    echo "   - SLACK_SIGNING_SECRET=..."
    echo ""
    echo "Press Enter when you've updated .env..."
    read
fi

# Source environment variables
source .env

# Check if tokens are set
if [ -z "$SLACK_BOT_TOKEN" ] || [ "$SLACK_BOT_TOKEN" = "xoxb-your-bot-token-here" ]; then
    echo "❌ SLACK_BOT_TOKEN not set in .env"
    exit 1
fi

if [ -z "$SLACK_SIGNING_SECRET" ] || [ "$SLACK_SIGNING_SECRET" = "your-signing-secret-here" ]; then
    echo "❌ SLACK_SIGNING_SECRET not set in .env"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Build with SAM
echo "🔨 Building with SAM..."
sam build
echo ""

# Check if this is first deployment
if [ ! -f samconfig.toml ]; then
    echo "🚀 First time deployment - running guided setup..."
    echo ""
    sam deploy --guided \
        --parameter-overrides \
        "SlackBotToken=$SLACK_BOT_TOKEN" \
        "SlackSigningSecret=$SLACK_SIGNING_SECRET"
else
    echo "🚀 Deploying to AWS..."
    echo ""
    sam deploy
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Copy the SlackBotApiUrl from above"
echo "   2. Go to https://api.slack.com/apps"
echo "   3. Update your Slash Command URL"
echo "   4. Update your Interactivity Request URL"
echo "   5. Test with: /play-bingo"
echo ""
echo "🎉 Good luck with your hackathon!"

