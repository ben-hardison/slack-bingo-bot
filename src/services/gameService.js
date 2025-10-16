// Game logic: card generation, bingo validation

const generateBingoCard = (wordList) => {
    // Shuffle word list
    const shuffled = [...wordList].sort(() => Math.random() - 0.5);

    // Take first 24 words (we need 25 squares - 1 free space)
    const selectedWords = shuffled.slice(0, 24);

    // Create 25-square card with FREE space at position 12 (row 2, col 2)
    const card = [];
    let wordIndex = 0;

    for (let i = 0; i < 25; i++) {
        if (i === 12) {
            // Center square is FREE SPACE
            card.push('FREE SPACE');
        } else {
            card.push(selectedWords[wordIndex]);
            wordIndex++;
        }
    }

    return card;
};

const checkBingo = (stampedPositions) => {
    // Winning patterns: 5 rows, 5 columns, 2 diagonals
    const winningPatterns = [
        // Rows
        [0, 1, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [10, 11, 12, 13, 14],
        [15, 16, 17, 18, 19],
        [20, 21, 22, 23, 24],
        // Columns
        [0, 5, 10, 15, 20],
        [1, 6, 11, 16, 21],
        [2, 7, 12, 17, 22],
        [3, 8, 13, 18, 23],
        [4, 9, 14, 19, 24],
        // Diagonals
        [0, 6, 12, 18, 24],
        [4, 8, 12, 16, 20]
    ];

    // Check if any pattern is completely stamped
    for (const pattern of winningPatterns) {
        const isWinningPattern = pattern.every(position =>
            stampedPositions.includes(position)
        );

        if (isWinningPattern) {
            return true;
        }
    }

    return false;
};

const getRandomWord = (wordList, excludeWords = []) => {
    const availableWords = wordList.filter(word => !excludeWords.includes(word));

    if (availableWords.length === 0) {
        return null; // No more words available
    }

    const randomIndex = Math.floor(Math.random() * availableWords.length);
    return availableWords[randomIndex];
};

module.exports = {
    generateBingoCard,
    checkBingo,
    getRandomWord
};

