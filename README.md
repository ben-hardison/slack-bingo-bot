# Slack Bingo Bot

A fun Slack app for playing Bingo with your team! Get intermittent messages throughout the day and mark your card to win.

## Features

- 🎮 Start games with `/play-bingo` command
- 🎯 Unique 5x5 bingo cards for each player
- 🔔 Automated word calls at configurable intervals
- ✓ Interactive card with clickable buttons
- 👑 First to get 5 in a row wins!

## Prerequisites

- Node.js 18+
- AWS CLI configured with credentials
- AWS SAM CLI
- Slack workspace with admin access

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "Bingo Bot" and select your workspace
4. Go to **OAuth & Permissions** and add these scopes:
   - `chat:write`
   - `commands`
   - `channels:read`
5. Install app to workspace
6. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
7. Go to **Basic Information** and copy the **Signing Secret**

### 3. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your tokens:

```
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your-secret-here
```

### 4. Deploy to AWS

```bash
# Build the application
sam build

# Deploy (first time - will prompt for configuration)
sam deploy --guided
```

When prompted:
- Stack Name: `slack-bingo-bot`
- AWS Region: Your preferred region (e.g., `us-east-1`)
- Parameter SlackBotToken: Paste your bot token
- Parameter SlackSigningSecret: Paste your signing secret
- Confirm changes: Y
- Allow SAM CLI IAM role creation: Y
- Save arguments to configuration file: Y

After deployment, note the `SlackBotApiUrl` output.

### 5. Configure Slack App URLs

Back in the Slack App settings:

1. Go to **Slash Commands**
   - Create new command: `/play-bingo`
   - Request URL: `{SlackBotApiUrl}` (from SAM output)
   - Description: "Start a Bingo game"

2. Go to **Interactivity & Shortcuts**
   - Enable Interactivity
   - Request URL: `{SlackBotApiUrl}` (same URL)

3. Save changes

### 6. Test the App

1. Go to a Slack channel
2. Invite the bot: `/invite @Bingo Bot`
3. Start a game: `/play-bingo`
4. Fill in frequency and word list (minimum 30 words)
5. Click "Start Game"
6. Click "My Bingo Card" button to see your card
7. Wait for automated calls or manually invoke the scheduler

## Architecture

- **AWS Lambda**: Runs the Slack Bolt app and scheduler
- **API Gateway**: HTTP endpoint for Slack events
- **DynamoDB**: Stores game state and user cards
- **EventBridge**: Triggers automated bingo calls

## Development

### Local Testing

For local development, you can use SAM Local:

```bash
sam local start-api
```

Note: You'll need Docker running for this.

### Updating Code

After making changes:

```bash
sam build
sam deploy
```

## Troubleshooting

**Bot not responding:**
- Check Lambda logs in CloudWatch
- Verify Slack URLs match API Gateway endpoint
- Ensure bot is invited to the channel

**Permission errors:**
- Verify OAuth scopes in Slack app settings
- Check IAM permissions in SAM template

**Game not starting:**
- Check DynamoDB tables exist
- Verify environment variables in Lambda

## Future Enhancements

- Support multiple simultaneous games per channel
- Add `/bingo-end` command to stop games
- Implement dynamic EventBridge scheduling
- Add game statistics and leaderboards
- Custom themes and word list templates

## License

MIT
