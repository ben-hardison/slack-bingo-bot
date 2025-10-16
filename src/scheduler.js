const AWS = require('aws-sdk');
const dynamoService = require('./services/dynamoService');
const gameService = require('./services/gameService');
const { buildBingoCallMessage } = require('./config/constants');

// Initialize Slack Web API client
const https = require('https');

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

// Post message to Slack using Web API
const postSlackMessage = async (channel, message) => {
    const payload = JSON.stringify({
        channel,
        text: message.text || 'New bingo call!',
        blocks: message.blocks
    });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'slack.com',
            path: '/api/chat.postMessage',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const response = JSON.parse(data);
                if (response.ok) {
                    resolve(response);
                } else {
                    reject(new Error(`Slack API error: ${response.error}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(payload);
        req.end();
    });
};

// Lambda handler for EventBridge scheduled events
exports.handler = async (event) => {
    console.log('Scheduler triggered:', JSON.stringify(event));

    try {
        // Get active game
        const game = await dynamoService.getActiveGame();

        if (!game) {
            console.log('No active game found');
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'No active game' })
            };
        }

        // Check if all words have been called
        if (game.callHistory.length >= game.wordList.length) {
            console.log('All words have been called');
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'All words called' })
            };
        }

        // Get random word that hasn't been called yet
        const newWord = gameService.getRandomWord(game.wordList, game.callHistory);

        if (!newWord) {
            console.log('No more words available');
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'No more words' })
            };
        }

        // Update game with new call
        const updatedGame = await dynamoService.updateGameCallHistory(game.gameId, newWord);

        // Build and send message
        // Get previous calls (all except the one we just added)
        const previousCalls = updatedGame.callHistory.slice(0, -1);
        const message = buildBingoCallMessage(newWord, previousCalls);

        console.log(`Posting to channel ${game.channelId}: ${newWord}`);
        console.log(`Previous calls: ${previousCalls.join(', ')}`);

        // Post to channel
        const result = await postSlackMessage(game.channelId, message);

        console.log(`Posted new call: ${newWord}`, result);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Bingo call posted successfully',
                word: newWord
            })
        };

    } catch (error) {
        console.error('Error in scheduler:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error processing scheduler',
                error: error.message
            })
        };
    }
};

