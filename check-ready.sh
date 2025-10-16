#!/bin/bash

# Pre-deployment readiness checker
# Run this before deploying to make sure everything is set up

echo "🔍 Slack Bingo Bot - Readiness Check"
echo "====================================="
echo ""

READY=true

# Check Node.js
echo -n "✓ Checking Node.js... "
if command -v node &> /dev/null; then
    VERSION=$(node --version)
    echo "✅ Found $VERSION"
else
    echo "❌ Not installed"
    echo "  Run: brew install node"
    READY=false
fi

# Check npm
echo -n "✓ Checking npm... "
if command -v npm &> /dev/null; then
    VERSION=$(npm --version)
    echo "✅ Found v$VERSION"
else
    echo "❌ Not installed"
    READY=false
fi

# Check AWS CLI
echo -n "✓ Checking AWS CLI... "
if command -v aws &> /dev/null; then
    VERSION=$(aws --version | cut -d' ' -f1)
    echo "✅ Found $VERSION"
else
    echo "❌ Not installed"
    echo "  Run: brew install awscli"
    READY=false
fi

# Check AWS credentials
echo -n "✓ Checking AWS credentials... "
if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    echo "✅ Configured (Account: $ACCOUNT)"
else
    echo "❌ Not configured"
    echo "  Run: aws configure"
    READY=false
fi

# Check SAM CLI
echo -n "✓ Checking AWS SAM CLI... "
if command -v sam &> /dev/null; then
    VERSION=$(sam --version | cut -d' ' -f4)
    echo "✅ Found $VERSION"
else
    echo "❌ Not installed"
    echo "  Run: brew install aws-sam-cli"
    READY=false
fi

echo ""
echo "📁 Checking project files..."

# Check package.json
echo -n "✓ package.json... "
if [ -f "package.json" ]; then
    echo "✅"
else
    echo "❌ Missing"
    READY=false
fi

# Check template.yaml
echo -n "✓ template.yaml... "
if [ -f "template.yaml" ]; then
    echo "✅"
else
    echo "❌ Missing"
    READY=false
fi

# Check src/app.js
echo -n "✓ src/app.js... "
if [ -f "src/app.js" ]; then
    echo "✅"
else
    echo "❌ Missing"
    READY=false
fi

# Check src/scheduler.js
echo -n "✓ src/scheduler.js... "
if [ -f "src/scheduler.js" ]; then
    echo "✅"
else
    echo "❌ Missing"
    READY=false
fi

# Check .env
echo -n "✓ .env file... "
if [ -f ".env" ]; then
    echo "✅"
    
    # Check if tokens are configured
    source .env
    
    echo -n "  └─ SLACK_BOT_TOKEN... "
    if [ ! -z "$SLACK_BOT_TOKEN" ] && [ "$SLACK_BOT_TOKEN" != "xoxb-your-bot-token-here" ]; then
        echo "✅"
    else
        echo "❌ Not configured"
        echo "     Edit .env and add your Slack bot token"
        READY=false
    fi
    
    echo -n "  └─ SLACK_SIGNING_SECRET... "
    if [ ! -z "$SLACK_SIGNING_SECRET" ] && [ "$SLACK_SIGNING_SECRET" != "your-signing-secret-here" ]; then
        echo "✅"
    else
        echo "❌ Not configured"
        echo "     Edit .env and add your Slack signing secret"
        READY=false
    fi
else
    echo "❌ Missing"
    echo "  Run: cp .env.example .env"
    echo "  Then edit .env with your Slack tokens"
    READY=false
fi

# Check node_modules
echo -n "✓ node_modules... "
if [ -d "node_modules" ]; then
    echo "✅"
else
    echo "⚠️  Not installed"
    echo "  Run: npm install"
    READY=false
fi

echo ""
echo "====================================="

if [ "$READY" = true ]; then
    echo "✅ All checks passed! You're ready to deploy!"
    echo ""
    echo "Next step:"
    echo "  ./deploy.sh"
    echo ""
    echo "Or manually:"
    echo "  sam build"
    echo "  sam deploy --guided"
else
    echo "❌ Some checks failed. Please fix the issues above."
    echo ""
    echo "Quick fixes:"
    echo "  npm install          # Install dependencies"
    echo "  cp .env.example .env # Create environment file"
    echo "  nano .env            # Edit with your tokens"
    echo "  aws configure        # Set up AWS credentials"
fi

echo ""

