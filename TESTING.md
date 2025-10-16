# Testing Guide - Slack Bingo Bot

## Pre-Deployment Testing

### 1. Verify File Structure

```bash
cd /Users/ben/Documents/GitHub/slack-bingo-bot
ls -la
```

Expected files:
- `package.json`
- `template.yaml`
- `src/app.js`
- `src/scheduler.js`
- `src/services/dynamoService.js`
- `src/services/gameService.js`
- `src/config/constants.js`
- `.gitignore`
- `.env.example`
- `README.md`
- `QUICKSTART.md`
- `deploy.sh`
- `sample-wordlist.txt`

### 2. Install Dependencies

```bash
npm install
```

Expected output: Should install `@slack/bolt`, `aws-sdk`, `uuid`

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your actual tokens
```

Verify `.env` has:
```
SLACK_BOT_TOKEN=xoxb-actual-token
SLACK_SIGNING_SECRET=actual-secret
AWS_REGION=us-east-1
```

## Deployment Testing

### 1. Build with SAM

```bash
sam build
```

Expected output:
```
Build Succeeded

Built Artifacts  : .aws-sam/build
Built Template   : .aws-sam/build/template.yaml
```

### 2. Deploy to AWS

```bash
sam deploy --guided
```

**First time prompts:**
- Stack Name: `slack-bingo-bot`
- AWS Region: `us-east-1`
- Parameter SlackBotToken: `[paste token]`
- Parameter SlackSigningSecret: `[paste secret]`
- Confirm changes: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Disable rollback: `N`
- SlackBotFunction has no authorization: `Y`
- Save arguments to configuration: `Y`

**Look for in output:**
```
Outputs
-----------------------------------------------------------------------
Key                 SlackBotApiUrl
Description         API Gateway endpoint URL for Slack events
Value               https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/Prod/slack/events
```

**COPY THIS URL** - You need it for Slack configuration!

### 3. Verify AWS Resources

Check in AWS Console:

**Lambda Functions:**
- `slack-bingo-bot-SlackBotFunction-xxxx`
- `slack-bingo-bot-SchedulerFunction-xxxx`

**DynamoDB Tables:**
- `slack-bingo-games`
- `slack-bingo-user-cards`

**API Gateway:**
- `slack-bingo-bot` API with `/slack/events` endpoint

**EventBridge Rules:**
- `slack-bingo-scheduler` (should be DISABLED initially)

## Slack App Configuration Testing

### 1. Configure Slash Command

Go to https://api.slack.com/apps → Your App → Slash Commands

- Click "Create New Command"
- Command: `/play-bingo`
- Request URL: `{SlackBotApiUrl}` (from SAM output)
- Short Description: `Start a Bingo game`
- Save

**Test:** Type `/play-bingo` in Slack - should see the command in autocomplete

### 2. Configure Interactivity

Go to Interactivity & Shortcuts

- Turn on "Interactivity"
- Request URL: `{SlackBotApiUrl}` (same URL)
- Save Changes

**Test:** The toggle should stay green (not revert to off)

### 3. Verify OAuth Scopes

Go to OAuth & Permissions → Scopes

Should have:
- ✅ `chat:write`
- ✅ `commands`
- ✅ `channels:read`

### 4. Reinstall App (if needed)

If you added scopes:
- OAuth & Permissions → Reinstall App
- Click "Allow"

## Functional Testing

### Test 1: Invite Bot to Channel

**Steps:**
1. Go to any Slack channel
2. Type: `/invite @Bingo Bot` (or your bot name)
3. Press Enter

**Expected:**
- Bot appears in channel members
- Message: "added an integration to this channel: @Bingo Bot"

**If fails:**
- Check bot is installed to workspace
- Verify bot name matches

### Test 2: Open Game Setup Modal

**Steps:**
1. In the same channel, type: `/play-bingo`
2. Press Enter

**Expected:**
- Modal opens with title "Start Bingo Game"
- Two input fields visible:
  - "Call Frequency (minutes)" - default 15
  - "Word List" - empty multiline text
- "Start Game" button at bottom
- "Cancel" button

**If fails:**
- Check Slash Command is configured correctly
- Verify API Gateway URL matches
- Check CloudWatch logs: `sam logs -n SlackBotFunction --stack-name slack-bingo-bot --tail`

### Test 3: Validate Word List

**Steps:**
1. Open `/play-bingo` modal
2. Enter frequency: `5`
3. Enter only 10 words: `one, two, three, four, five, six, seven, eight, nine, ten`
4. Click "Start Game"

**Expected:**
- Modal stays open
- Error message appears: "Need at least 30 words. You provided 10."

**If fails:**
- Check validation logic in `src/app.js`

### Test 4: Start Game Successfully

**Steps:**
1. Open `/play-bingo` modal
2. Enter frequency: `5`
3. Copy words from `sample-wordlist.txt` and paste
4. Click "Start Game"

**Expected:**
- Modal closes
- Message appears in channel:
  ```
  Sup gamers! 🎉
  Your bingo word is: **[WORD]**
  
  Previous calls: None yet
  
  [🎯 My Bingo Card] (button)
  ```

**If fails:**
- Check CloudWatch logs for errors
- Verify DynamoDB table exists
- Check bot has `chat:write` permission

### Test 5: Generate Bingo Card

**Steps:**
1. After game starts, click "🎯 My Bingo Card" button

**Expected:**
- Modal opens with title "My Bingo Card"
- Header: "🎉 Bingo Card 🎉"
- 5 rows of 5 buttons each (25 total)
- Center button (row 3, col 3) says "⭐ FREE ⭐" in red
- All other buttons show words from your list
- Bottom has "BINGO!" button (grayed out)
- Bottom text: "Click on called words to stamp them. Get 5 in a row to win!"

**If fails:**
- Check DynamoDB UserCards table
- Verify card generation in `gameService.js`
- Check CloudWatch logs

### Test 6: Button States

**Steps:**
1. Open "My Bingo Card"
2. Look at first called word (from game message)
3. Find that word on your card
4. Compare to other words

**Expected:**
- Called word button: Blue (primary style)
- FREE button: Red (danger style)
- Uncalled word buttons: Normal/gray

**Visual Check:**
- 1 red button (FREE)
- 1 blue button (called word)
- 23 gray buttons (not called)

### Test 7: Stamp a Square

**Steps:**
1. Open "My Bingo Card"
2. Click the blue button (called word)

**Expected:**
- Button turns red
- Button text prefixed with "✓"
- Modal updates instantly
- BINGO! button still grayed out (no bingo yet)

**If fails:**
- Check stamp action handler in `src/app.js`
- Verify DynamoDB update logic

### Test 8: Try to Stamp Uncalled Word

**Steps:**
1. Open "My Bingo Card"
2. Click a gray button (uncalled word)

**Expected:**
- Nothing happens
- Button stays gray
- No error message

**If fails:**
- Check validation in stamp handler

### Test 9: Test Scheduler (Manual)

**Option A: Wait 15 minutes**
- Wait for next automated call
- Message should appear in channel

**Option B: Invoke Lambda manually**

```bash
aws lambda invoke \
  --function-name slack-bingo-bot-SchedulerFunction-xxxx \
  --payload '{}' \
  response.json

cat response.json
```

**Expected:**
- New message in channel with different word
- Previous calls list updated
- Can open card and see new word in blue

### Test 10: Get Bingo (Manual)

This is tricky to test naturally. To force-test:

**Steps:**
1. Manually invoke scheduler 5+ times (see Test 9)
2. Open your card
3. Look for 5 called words in a row/column/diagonal
4. Stamp all 5
5. Check BINGO! button

**Expected:**
- BINGO! button turns blue (primary)
- Text at bottom says "You have BINGO! Click the button above to claim victory! 👑"

**To test bingo logic programmatically:**
```javascript
// In Node REPL or test file
const { checkBingo } = require('./src/services/gameService');

// Top row bingo
console.log(checkBingo([0, 1, 2, 3, 4, 12])); // true (12 is FREE)

// No bingo
console.log(checkBingo([0, 1, 2, 12])); // false
```

### Test 11: Win the Game

**Steps:**
1. Get bingo (see Test 10)
2. Click blue "🎊 BINGO! 🎊" button

**Expected:**
- Modal changes to "Congratulations!"
- Message appears in channel:
  ```
  🎊 GAME OVER! 🎊
  
  @yourname has won Bingo! 👑
  ```

**If fails:**
- Check game completion logic in `dynamoService.js`
- Verify conditional update works
- Check channel posting permissions

### Test 12: Race Condition (Multiple Winners)

**Steps:**
1. Start a game
2. Have two users both get bingo
3. Both click BINGO! button simultaneously (within seconds)

**Expected:**
- First user: Wins, sees congratulations, message posted
- Second user: Error message "Game already won by another player"
- Only ONE winner message in channel

**Verifies:** DynamoDB conditional update prevents double-winning

### Test 13: Concurrent Games Prevention

**Steps:**
1. Start a game with `/play-bingo`
2. Immediately start another game with `/play-bingo`

**Expected:**
- First game ends
- Second game starts
- Only one active game in DynamoDB `slack-bingo-games` table

**Check:**
```bash
aws dynamodb scan --table-name slack-bingo-games
```

Should see one game with `status: "active"`

## Troubleshooting Tests

### Check CloudWatch Logs

```bash
# SlackBot logs
sam logs -n SlackBotFunction --stack-name slack-bingo-bot --tail

# Scheduler logs
sam logs -n SchedulerFunction --stack-name slack-bingo-bot --tail
```

### Check DynamoDB Data

**Games:**
```bash
aws dynamodb scan --table-name slack-bingo-games
```

**User Cards:**
```bash
aws dynamodb scan --table-name slack-bingo-user-cards
```

### Test API Gateway Directly

```bash
curl -X POST https://your-api-url/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}'
```

Expected: Should return the challenge

### Verify EventBridge Rule

```bash
aws events describe-rule --name slack-bingo-scheduler
```

Expected:
```json
{
  "State": "DISABLED",
  "ScheduleExpression": "rate(15 minutes)"
}
```

## Performance Tests

### Lambda Cold Start
- First `/play-bingo` after deployment: 2-5 seconds
- Subsequent calls: <1 second

### Modal Load Time
- "My Bingo Card" first time: 1-2 seconds
- "My Bingo Card" subsequent: <1 second

### Stamp Response
- Click stamp button: <500ms update

## Load Testing (Optional)

```bash
# Simulate 10 concurrent users opening cards
for i in {1..10}; do
  # Trigger card generation via API
  # (requires custom test script)
done
```

Expected: All cards generate successfully without errors

## Cleanup After Testing

### Delete Test Games

```bash
aws dynamodb delete-table --table-name slack-bingo-games
aws dynamodb delete-table --table-name slack-bingo-user-cards
```

### Delete Stack

```bash
sam delete --stack-name slack-bingo-bot
```

### Remove from Slack

1. Go to https://api.slack.com/apps
2. Select your app
3. Settings → Basic Information
4. "Delete App"

## Test Checklist

- [ ] Dependencies installed
- [ ] Environment configured
- [ ] SAM build successful
- [ ] SAM deploy successful
- [ ] API Gateway URL obtained
- [ ] Slash command configured
- [ ] Interactivity enabled
- [ ] Bot invited to channel
- [ ] `/play-bingo` opens modal
- [ ] Word list validation works
- [ ] Game starts successfully
- [ ] First call posted to channel
- [ ] "My Bingo Card" generates unique card
- [ ] FREE space always stamped
- [ ] Called words are blue
- [ ] Stamping works correctly
- [ ] Can't stamp uncalled words
- [ ] Scheduler posts new calls
- [ ] Bingo detection works
- [ ] Winner message posts to channel
- [ ] Race condition prevented
- [ ] Only one active game at a time

## Success Criteria

✅ **MVP is ready when all checklist items pass!**

Good luck with your hackathon! 🎉

