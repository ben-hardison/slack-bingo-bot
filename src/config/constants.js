// Block Kit templates and constants

const GREETINGS = [
    "Sup gamers! 🎉",
    "Hey team! Ready to put it all on red? 🎲 🎰",
    "Bingo time! 🎊",
    "New call alert! 🔔",
    "Let's play! 🎮"
];

const getRandomGreeting = () => {
    return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
};

const buildBingoCallMessage = (word, previousCalls) => {
    const previousCallsText = previousCalls.length > 0
        ? previousCalls.join(', ')
        : 'None yet';

    return {
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `${getRandomGreeting()}\nYour bingo word is: *${word}*`
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `_Previous calls:_ ${previousCallsText}`
                }
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: '🎯 My Bingo Card'
                        },
                        action_id: 'open_card_modal',
                        style: 'primary'
                    }
                ]
            }
        ]
    };
};

const buildBingoCardModal = (card, stampedPositions, calledWords, hasBingo) => {
    const blocks = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: '🎉 Bingo Card 🎉'
            }
        }
    ];

    // Build 5 rows of buttons (5x5 grid)
    for (let row = 0; row < 5; row++) {
        const rowElements = [];

        for (let col = 0; col < 5; col++) {
            const index = row * 5 + col;
            const word = card[index];
            const isStamped = stampedPositions.includes(index);
            const isCalled = calledWords.includes(word) || word === 'FREE SPACE';
            const isFree = row === 2 && col === 2;

            let buttonStyle = undefined;
            let buttonText = word;
            let disabled = false;

            if (isFree) {
                // FREE space - always stamped
                buttonStyle = 'danger';
                buttonText = '⭐ FREE ⭐';
            } else if (isStamped) {
                // Stamped by user
                buttonStyle = 'danger';
                buttonText = `✓ ${word}`;
            } else if (isCalled) {
                // Called but not stamped
                buttonStyle = 'primary';
            } else {
                // Not called yet - disabled
                disabled = true;
            }

            const button = {
                type: 'button',
                text: {
                    type: 'plain_text',
                    text: buttonText.length > 75 ? buttonText.substring(0, 72) + '...' : buttonText
                },
                action_id: `stamp_${row}_${col}`
            };

            if (buttonStyle) {
                button.style = buttonStyle;
            }

            // Note: Block Kit doesn't support disabled buttons directly
            // We'll handle this in the action handler by checking if word is called

            rowElements.push(button);
        }

        blocks.push({
            type: 'actions',
            elements: rowElements
        });
    }

    // Add divider
    blocks.push({ type: 'divider' });

    // Add BINGO button
    blocks.push({
        type: 'actions',
        elements: [
            {
                type: 'button',
                text: {
                    type: 'plain_text',
                    text: hasBingo ? '🎊 BINGO! 🎊' : 'BINGO!'
                },
                action_id: 'call_bingo',
                style: hasBingo ? 'primary' : undefined,
                // We'll show/hide this contextually
            }
        ]
    });

    // Add helper text
    if (!hasBingo) {
        blocks.push({
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: '_Click on called words to stamp them. Get 5 in a row to win!_'
                }
            ]
        });
    } else {
        blocks.push({
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: '*You have BINGO! Click the button above to claim victory! 👑*'
                }
            ]
        });
    }

    return {
        type: 'modal',
        callback_id: 'bingo_card_modal',
        title: {
            type: 'plain_text',
            text: 'My Bingo Card'
        },
        close: {
            type: 'plain_text',
            text: 'Close'
        },
        blocks
    };
};

const buildGameSetupModal = () => {
    return {
        type: 'modal',
        callback_id: 'game_setup_modal',
        title: {
            type: 'plain_text',
            text: 'Start Bingo Game'
        },
        submit: {
            type: 'plain_text',
            text: 'Start Game'
        },
        close: {
            type: 'plain_text',
            text: 'Cancel'
        },
        blocks: [
            {
                type: 'input',
                block_id: 'frequency_block',
                element: {
                    type: 'number_input',
                    action_id: 'frequency_input',
                    // TODO: Change this to allow seconds, or partial minutes.
                    is_decimal_allowed: true,
                    min_value: '0.1',
                    initial_value: '0.33',
                    placeholder: {
                        type: 'plain_text',
                        text: 'Enter frequency'
                    }
                },
                label: {
                    type: 'plain_text',
                    text: 'Call Frequency'
                },
                hint: {
                    type: 'plain_text',
                    text: 'How often should new words be called?'
                }
            },
            {
                type: 'input',
                block_id: 'wordlist_block',
                element: {
                    type: 'plain_text_input',
                    action_id: 'wordlist_input',
                    multiline: true,
                    placeholder: {
                        type: 'plain_text',
                        text: 'Enter at least 30 words or phrases, separated by commas'
                    }
                },
                label: {
                    type: 'plain_text',
                    text: 'Word List'
                },
                hint: {
                    type: 'plain_text',
                    text: 'Comma-separated words/phrases (minimum 30 required)'
                }
            }
        ]
    };
};

module.exports = {
    buildBingoCallMessage,
    buildBingoCardModal,
    buildGameSetupModal,
    getRandomGreeting
};

