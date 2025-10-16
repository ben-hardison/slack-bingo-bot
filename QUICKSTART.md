# Quick Start Guide - Slack Bingo Bot

## What You've Done So Far ✅

- Created Slack App at https://api.slack.com/apps
- Got Bot OAuth Token (`xoxb-...`)
- Configured OAuth scopes: `chat:write`, `commands`, `channels:read`

## Next Steps

### 1. Install Dependencies

```bash
cd /Users/ben/Documents/GitHub/slack-bingo-bot
npm install
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and add your tokens:
```
SLACK_BOT_TOKEN=xoxb-your-actual-token-here
SLACK_SIGNING_SECRET=your-actual-secret-here
AWS_REGION=us-east-1
```

### 3. Deploy to AWS

First time deployment:

```bash
sam build
sam deploy --guided
```

Answer the prompts:
- **Stack Name**: `slack-bingo-bot`
- **AWS Region**: `us-east-1` (or your preferred region)
- **Parameter SlackBotToken**: Paste your `xoxb-...` token
- **Parameter SlackSigningSecret**: Paste your signing secret
- **Confirm changes before deploy**: `Y`
- **Allow SAM CLI IAM role creation**: `Y`
- **Disable rollback**: `N`
- **Save arguments to configuration file**: `Y`

**Important**: Copy the `SlackBotApiUrl` from the output! You'll need it next.

### 4. Configure Slack App with API URL

Go back to https://api.slack.com/apps and select your app:

#### A. Set up Slash Command
1. Go to **Slash Commands**
2. Click "Create New Command"
3. Command: `/play-bingo`
4. Request URL: `{SlackBotApiUrl}` ← paste the URL from SAM output
5. Short Description: `Start a Bingo game`
6. Click Save

#### B. Enable Interactivity
1. Go to **Interactivity & Shortcuts**
2. Turn on "Interactivity"
3. Request URL: `{SlackBotApiUrl}` ← same URL as above
4. Click Save Changes

### 5. Test Your Bot! 🎉

1. **Invite bot to a channel:**
   ```
   /invite @Bingo Bot
   ```
   (Use whatever name you gave your app)

2. **Start a game:**
   ```
   /play-bingo
   ```

3. **Fill in the modal:**
   - Frequency: 15 (minutes)
   - Word list: Enter at least 30 comma-separated words like:
     ```
     meeting, deadline, synergy, pivot, bandwidth, action items, circle back, 
     deep dive, touch base, low hanging fruit, think outside the box, 
     move the needle, quick win, best practice, leverage, paradigm shift,
     game changer, win-win, on the same page, drill down, take this offline,
     push the envelope, raise the bar, ballpark figure, back of the envelope,
     boil the ocean, core competency, deliverable, ecosystem, frameworks
     ```

4. **Click "My Bingo Card"** button in the message

5. **Play!** Wait for calls (or manually test the scheduler)

## Troubleshooting

### Bot not responding to /play-bingo
- Check that you added the Slash Command URL in Slack app settings
- Verify the URL matches exactly what SAM output
- Check CloudWatch Logs for errors

### Modal not opening
- Check that Interactivity is enabled
- Verify Request URL is set correctly
- Bot must be invited to the channel

### How to redeploy after code changes
```bash
sam build
sam deploy
```
(No `--guided` needed after first time)

### View AWS Lambda logs
```bash
sam logs --stack-name slack-bingo-bot --tail
```

### Delete everything (start over)
```bash
sam delete --stack-name slack-bingo-bot
```

## What's Working Now

✅ Slash command `/play-bingo`
✅ Game setup modal
✅ Bingo card generation (unique per user)
✅ Interactive card with clickable buttons
✅ Stamp tracking
✅ Bingo validation
✅ Winner detection and announcement

## What Needs Manual Testing

⚠️ **EventBridge Scheduler** - Currently set to 15 min intervals. You can:
- Wait 15 minutes for automatic calls
- Manually invoke the scheduler Lambda in AWS Console for testing
- Or update the EventBridge rule to `rate(1 minute)` for faster testing

## Known MVP Limitations

1. **Channel ID**: Currently, the bot posts to the user who started the game. To fix:
   - Need to capture actual channel ID where `/play-bingo` was called
   - Will require small update to command handler

2. **EventBridge Dynamic Scheduling**: Fixed at 15 minutes. To make it dynamic:
   - Need to add AWS EventBridge SDK code to update the rule
   - Currently in TODO comments

3. **One game per workspace**: By design for hackathon MVP

## Next Enhancements (Optional)

- [ ] Fix channel ID to post to actual game channel
- [ ] Add `/bingo-end` command to stop games
- [ ] Dynamic EventBridge rule updates based on frequency
- [ ] Add game stats and leaderboard
- [ ] Support multiple games per channel

Good luck with your hackathon! 🎉

