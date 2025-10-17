// Block Kit templates and constants

const buildBingoCallMessage = (word, previousCalls, isFirstCall = false) => {
    const previousCallsText = previousCalls.length > 0
        ? previousCalls.join(', ')
        : 'None yet';

    // First message has special greeting
    const messageText = isFirstCall
        ? `Sup, gamerz! It's bingo time! ⚽🎾🏀🏓\n\The word is: *${word}*`
        : `The word is: *${word}*`;

    return {
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: messageText
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

const buildBingoCardMessage = (card, stampedPositions, calledWords, hasBingo) => {
    const blocks = [];

    // Build table rows for visual display
    const tableRows = [];
    for (let row = 0; row < 5; row++) {
        const rowCells = [];
        for (let col = 0; col < 5; col++) {
            const index = row * 5 + col;
            const word = card[index];
            const isStamped = stampedPositions.includes(index);
            const isCalled = calledWords.includes(word) || word === 'FREE SPACE';
            const isFree = row === 2 && col === 2;

            let cellText = word;

            if (isFree) {
                cellText = '⭐ FREE ⭐';
            } else if (isStamped) {
                cellText = `✅ ${word}`;
            } else if (isCalled) {
                cellText = `🔵 ${word}`;
            } else {
                cellText = `⚪ ${word}`;
            }

            rowCells.push({
                type: 'raw_text',
                text: cellText
            });
        }
        tableRows.push(rowCells);
    }

    // Add table block (this is the main content)
    blocks.push({
        type: 'table',
        rows: tableRows
    });

    // Add legend
    blocks.push({
        type: 'context',
        elements: [
            {
                type: 'mrkdwn',
                text: '⚪ Not called  •  🔵 Called  •  ✅ Stamped  •  ⭐ FREE'
            }
        ]
    });

    // Build interactive buttons (only for called, unstamped words)
    const availableButtons = [];
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const index = row * 5 + col;
            const word = card[index];
            const isStamped = stampedPositions.includes(index);
            const isCalled = calledWords.includes(word) || word === 'FREE SPACE';
            const isFree = row === 2 && col === 2;

            // Only show buttons for called words that aren't stamped yet (and not FREE)
            if (isCalled && !isStamped && !isFree) {
                availableButtons.push({
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: word,
                        emoji: true
                    },
                    action_id: `stamp_${row}_${col}`,
                    style: 'primary'
                });
            }
        }
    }

    // Add BINGO button with available stamp buttons if any
    const actionElements = [];
    if (hasBingo) {
        actionElements.push({
            type: 'button',
            text: {
                type: 'plain_text',
                text: '🎊 BINGO! 🎊'
            },
            action_id: 'call_bingo',
            style: 'primary'
        });
    }

    // Add up to 4 stamp buttons in the same row as BINGO
    for (let i = 0; i < Math.min(availableButtons.length, hasBingo ? 4 : 5); i++) {
        actionElements.push(availableButtons[i]);
    }

    if (actionElements.length > 0) {
        blocks.push({
            type: 'actions',
            elements: actionElements
        });
    }

    return { blocks };
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

            let buttonText = word;
            let buttonStyle = undefined;

            if (isFree) {
                // FREE space - always stamped
                buttonText = '⭐';
                buttonStyle = 'danger';
            } else if (isStamped) {
                // Stamped by user
                buttonText = '✅';
                buttonStyle = 'danger';
            } else if (isCalled) {
                // Called but not stamped
                buttonText = word.substring(0, 4);
                buttonStyle = 'primary';
            } else {
                // Not called yet
                buttonText = '⚪';
            }

            const button = {
                type: 'button',
                text: {
                    type: 'plain_text',
                    text: buttonText,
                    emoji: true
                },
                action_id: `stamp_${row}_${col}`
            };

            if (buttonStyle) {
                button.style = buttonStyle;
            }

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
                    is_decimal_allowed: true,
                    min_value: '1',
                    initial_value: '1',
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
                        text: 'Enter at least 24 words or phrases, separated by commas'
                    }
                },
                label: {
                    type: 'plain_text',
                    text: 'Word List'
                },
                hint: {
                    type: 'plain_text',
                    text: 'Comma-separated words/phrases (minimum 24 required)'
                }
            }
        ]
    };
};

module.exports = {
    buildBingoCallMessage,
    buildBingoCardMessage,
    buildBingoCardModal,
    buildGameSetupModal
};

