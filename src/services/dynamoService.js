const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const GAMES_TABLE = process.env.GAMES_TABLE;
const USER_CARDS_TABLE = process.env.USER_CARDS_TABLE;

// Game operations
const createGame = async (gameData) => {
    const params = {
        TableName: GAMES_TABLE,
        Item: {
            gameId: gameData.gameId,
            status: 'active',
            channelId: gameData.channelId,
            wordList: gameData.wordList,
            frequency: gameData.frequency,
            callHistory: [],
            startTime: gameData.startTime,
            createdAt: new Date().toISOString()
        }
    };

    await dynamodb.put(params).promise();
    return params.Item;
};

const getActiveGame = async () => {
    const params = {
        TableName: GAMES_TABLE,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
            '#status': 'status'
        },
        ExpressionAttributeValues: {
            ':status': 'active'
        }
    };

    const result = await dynamodb.scan(params).promise();
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
};

const getGame = async (gameId) => {
    const params = {
        TableName: GAMES_TABLE,
        Key: { gameId }
    };

    const result = await dynamodb.get(params).promise();
    return result.Item;
};

const updateGameCallHistory = async (gameId, newCall) => {
    const params = {
        TableName: GAMES_TABLE,
        Key: { gameId },
        UpdateExpression: 'SET callHistory = list_append(callHistory, :newCall)',
        ExpressionAttributeValues: {
            ':newCall': [newCall]
        },
        ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.update(params).promise();
    return result.Attributes;
};

const completeGame = async (gameId, winnerId) => {
    const params = {
        TableName: GAMES_TABLE,
        Key: { gameId },
        UpdateExpression: 'SET #status = :completed, winnerId = :winnerId, completedAt = :completedAt',
        ConditionExpression: '#status = :active',
        ExpressionAttributeNames: {
            '#status': 'status'
        },
        ExpressionAttributeValues: {
            ':completed': 'completed',
            ':active': 'active',
            ':winnerId': winnerId,
            ':completedAt': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
    };

    try {
        const result = await dynamodb.update(params).promise();
        return { success: true, game: result.Attributes };
    } catch (error) {
        if (error.code === 'ConditionalCheckFailedException') {
            // Game already completed by someone else
            return { success: false, message: 'Game already won by another player' };
        }
        throw error;
    }
};

// User card operations
const createUserCard = async (gameId, userId, card) => {
    const cardId = `${gameId}#${userId}`;
    const params = {
        TableName: USER_CARDS_TABLE,
        Item: {
            cardId,
            gameId,
            userId,
            card,
            stampedPositions: [12], // FREE space at index 12 (row 2, col 2)
            createdAt: new Date().toISOString()
        }
    };

    await dynamodb.put(params).promise();
    return params.Item;
};

const getUserCard = async (gameId, userId) => {
    const cardId = `${gameId}#${userId}`;
    const params = {
        TableName: USER_CARDS_TABLE,
        Key: { cardId }
    };

    const result = await dynamodb.get(params).promise();
    return result.Item;
};

const updateUserCardStamps = async (gameId, userId, stampedPositions) => {
    const cardId = `${gameId}#${userId}`;
    const params = {
        TableName: USER_CARDS_TABLE,
        Key: { cardId },
        UpdateExpression: 'SET stampedPositions = :stamps',
        ExpressionAttributeValues: {
            ':stamps': stampedPositions
        },
        ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.update(params).promise();
    return result.Attributes;
};

module.exports = {
    createGame,
    getActiveGame,
    getGame,
    updateGameCallHistory,
    completeGame,
    createUserCard,
    getUserCard,
    updateUserCardStamps
};

