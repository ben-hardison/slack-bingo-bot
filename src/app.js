const { App, AwsLambdaReceiver } = require('@slack/bolt');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const dynamoService = require('./services/dynamoService');
const gameService = require('./services/gameService');
const {
    buildBingoCallMessage,
    buildBingoCardModal,
    buildGameSetupModal
} = require('./config/constants');

// Initialize EventBridge client
const eventBridge = new AWS.EventBridge();

// Initialize AWS Lambda receiver
const awsLambdaReceiver = new AwsLambdaReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Initialize Bolt app
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver: awsLambdaReceiver,
});

// Slash command: /play-bingo
app.command('/play-bingo', async ({ command, ack, client }) => {
    await ack();

    try {
        // Store channel ID in modal's private_metadata so we can retrieve it later
        const modal = buildGameSetupModal();
        modal.private_metadata = JSON.stringify({
            channelId: command.channel_id,
            userId: command.user_id
        });

        // Open modal for game setup
        await client.views.open({
            trigger_id: command.trigger_id,
            view: modal
        });
    } catch (error) {
        console.error('Error opening game setup modal:', error);
    }
});

// Slash command: /stop-bingo
app.command('/stop-bingo', async ({ command, ack, client }) => {
    await ack();

    try {
        // Check if there's an active game
        const game = await dynamoService.getActiveGame();

        if (!game) {
            await client.chat.postEphemeral({
                channel: command.channel_id,
                user: command.user_id,
                text: '❌ No active game found. Nothing to stop!'
            });
            return;
        }

        // End the game
        await dynamoService.completeGame(game.gameId, 'manual_stop');

        // Disable EventBridge rule to stop automated calls
        try {
            await eventBridge.disableRule({
                Name: 'slack-bingo-scheduler'
            }).promise();
            console.log('EventBridge rule disabled');
        } catch (error) {
            console.error('Error disabling EventBridge rule:', error);
        }

        // Post message to channel
        await client.chat.postMessage({
            channel: command.channel_id,
            text: '🛑 Game stopped by <@' + command.user_id + '>. Start a new game with `/play-bingo`'
        });

        console.log(`Game ${game.gameId} stopped manually by user ${command.user_id}`);
    } catch (error) {
        console.error('Error stopping game:', error);
        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: command.user_id,
            text: '❌ Error stopping game. Please try again.'
        });
    }
});

// Handle game setup modal submission
app.view('game_setup_modal', async ({ ack, body, view, client }) => {
    // Validate inputs
    const frequency = parseInt(view.state.values.frequency_block.frequency_input.value);
    const wordListRaw = view.state.values.wordlist_block.wordlist_input.value;

    // Parse word list (comma-separated)
    const wordList = wordListRaw
        .split(',')
        .map(word => word.trim())
        .filter(word => word.length > 0);

    // Validation
    if (wordList.length < 24) {
        await ack({
            response_action: 'errors',
            errors: {
                wordlist_block: `Need at least 24 words. You provided ${wordList.length}.`
            }
        });
        return;
    }

    await ack();

    try {
        // HARDCODED CHANNEL ID for hackathon
        const channelId = 'C09LX2V8SLA';

        // Get channel ID from private_metadata (disabled for now)
        // const metadata = JSON.parse(view.private_metadata || '{}');
        // const channelId = metadata.channelId || body.user.id;

        // Check if there's already an active game
        const existingGame = await dynamoService.getActiveGame();
        if (existingGame) {
            // End the existing game first
            await dynamoService.completeGame(existingGame.gameId, 'system');
        }

        // Create new game
        const gameId = uuidv4();
        const gameData = {
            gameId,
            channelId: channelId, // Using hardcoded channel ID
            wordList,
            frequency,
            startTime: new Date().toISOString()
        };

        await dynamoService.createGame(gameData);

        // Make first call immediately
        const firstWord = gameService.getRandomWord(wordList);
        const message = buildBingoCallMessage(firstWord, [], true); // true = isFirstCall

        // Update game with first call
        await dynamoService.updateGameCallHistory(gameId, firstWord);

        // Post first call to channel
        await client.chat.postMessage({
            channel: channelId,
            text: `Game started! The first word is: ${firstWord}`,
            ...message
        });

        // Enable EventBridge rule for automated calls
        try {
            await eventBridge.enableRule({
                Name: 'slack-bingo-scheduler'
            }).promise();
            console.log('EventBridge rule enabled for automated calls');
        } catch (error) {
            console.error('Error enabling EventBridge rule:', error);
            // Don't fail the game start, just log the error
        }

    } catch (error) {
        console.error('Error creating game:', error);
        // Get channel from metadata
        const metadata = JSON.parse(view.private_metadata || '{}');
        const channelId = metadata.channelId || body.user.id;

        // Send error message
        await client.chat.postMessage({
            channel: channelId,
            text: '❌ Error starting game. Please try again.'
        });
    }
});

// Handle "My Bingo Card" button click
app.action('open_card_modal', async ({ ack, body, client }) => {
    await ack();

    try {
        const userId = body.user.id;
        const game = await dynamoService.getActiveGame();

        if (!game) {
            await client.chat.postEphemeral({
                channel: body.channel.id,
                user: userId,
                text: '❌ No active game found. Start a game with /play-bingo'
            });
            return;
        }

        // Check if user has a card
        let userCard = await dynamoService.getUserCard(game.gameId, userId);

        // If not, generate one
        if (!userCard) {
            const card = gameService.generateBingoCard(game.wordList);
            userCard = await dynamoService.createUserCard(game.gameId, userId, card);
        }

        // Check if user has bingo
        const hasBingo = gameService.checkBingo(userCard.stampedPositions);

        // Build and show modal
        const modal = buildBingoCardModal(
            userCard.card,
            userCard.stampedPositions,
            game.callHistory,
            hasBingo
        );

        await client.views.open({
            trigger_id: body.trigger_id,
            view: modal
        });

    } catch (error) {
        console.error('Error opening card modal:', error);
    }
});

// Handle stamp button clicks
app.action(/^stamp_\d+_\d+$/, async ({ ack, body, action, client }) => {
    await ack();

    try {
        const userId = body.user.id;
        const game = await dynamoService.getActiveGame();

        if (!game) {
            return;
        }

        // Parse row and column from action_id (e.g., "stamp_2_3")
        const [, row, col] = action.action_id.match(/stamp_(\d+)_(\d+)/);
        const position = parseInt(row) * 5 + parseInt(col);

        // Get user's card
        const userCard = await dynamoService.getUserCard(game.gameId, userId);
        if (!userCard) {
            return;
        }

        // Ignore clicks on FREE space
        if (position === 12) {
            return;
        }

        const word = userCard.card[position];

        // Check if word has been called
        if (!game.callHistory.includes(word)) {
            // Word not called yet, ignore
            return;
        }

        // Check if already stamped
        if (userCard.stampedPositions.includes(position)) {
            // Already stamped, ignore
            return;
        }

        // Add stamp
        const newStamps = [...userCard.stampedPositions, position];
        await dynamoService.updateUserCardStamps(game.gameId, userId, newStamps);

        // Check for bingo
        const hasBingo = gameService.checkBingo(newStamps);

        // Update modal
        const modal = buildBingoCardModal(
            userCard.card,
            newStamps,
            game.callHistory,
            hasBingo
        );

        await client.views.update({
            view_id: body.view.id,
            view: modal
        });

    } catch (error) {
        console.error('Error handling stamp:', error);
    }
});

// Handle BINGO button click
app.action('call_bingo', async ({ ack, body, client }) => {
    await ack();

    try {
        const userId = body.user.id;
        const game = await dynamoService.getActiveGame();

        if (!game) {
            await client.chat.postEphemeral({
                channel: body.user.id,
                user: userId,
                text: '❌ No active game found.'
            });
            return;
        }

        // Get user's card
        const userCard = await dynamoService.getUserCard(game.gameId, userId);
        if (!userCard) {
            return;
        }

        // Verify user actually has bingo
        const hasBingo = gameService.checkBingo(userCard.stampedPositions);
        if (!hasBingo) {
            await client.chat.postEphemeral({
                channel: body.user.id,
                user: userId,
                text: '❌ You don\'t have bingo yet! You need 5 in a row, column, or diagonal.'
            });
            return;
        }

        // Try to complete the game (atomic operation)
        const result = await dynamoService.completeGame(game.gameId, userId);

        if (result.success) {
            // User won! Disable EventBridge rule to stop automated calls
            try {
                await eventBridge.disableRule({
                    Name: 'slack-bingo-scheduler'
                }).promise();
                console.log('EventBridge rule disabled after game won');
            } catch (error) {
                console.error('Error disabling EventBridge rule:', error);
            }

            // Post winner message to channel
            const winnerMessage = {
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `🚨GAME OVER, GAMERZ! 🚨\n\nYour 👑 Bingo King 👑 is <@${userId}> 🥳\n\nUntil next time ⚽🎾🏀🏓`
                        }
                    }
                ]
            };

            // Post to the game's channel
            await client.chat.postMessage({
                channel: game.channelId,
                text: `Game over! <@${userId}> has won Bingo! 👑`,
                ...winnerMessage
            });

            // Close the modal
            await client.views.update({
                view_id: body.view.id,
                view: {
                    type: 'modal',
                    title: {
                        type: 'plain_text',
                        text: 'Congratulations!'
                    },
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: '🎊 *You won!* 🎊\n\nCongratulations on your victory!'
                            }
                        }
                    ]
                }
            });

            // TODO: Disable EventBridge rule to stop further calls

        } else {
            // Someone else won first
            await client.chat.postEphemeral({
                channel: body.user.id,
                user: userId,
                text: '❌ Game already won by another player. Better luck next time!'
            });
        }

    } catch (error) {
        console.error('Error handling bingo call:', error);
    }
});

// Export Lambda handler
module.exports.handler = async (event, context, callback) => {
    const handler = await awsLambdaReceiver.start();
    return handler(event, context, callback);
};

