let playersData = [];
let currentPlayer = null; // Store the current player globally so both players answer the same question.
let correctStreak1 = 0;
let correctStreak2 = 0;
let currentTurn = 1; // Track whose turn it is
let player1HasGuessed = false; // Track if Player 1 has guessed
let player2HasGuessed = false; // Track if Player 2 has guessed

const correctSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const wrongSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();

    // Handle player submissions
    const submitBtn1 = document.getElementById('submitBtn1');
    const submitBtn2 = document.getElementById('submitBtn2');

    submitBtn1.addEventListener('click', () => {
        handlePlayerGuess(1);
    });

    submitBtn2.addEventListener('click', () => {
        handlePlayerGuess(2);
    });
});

function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            startNewRound(); // Start the game with a new player
        })
        .catch(error => {
            console.error('Error loading JSON:', error);
            const playerQuestionElement = document.getElementById('playerQuestion');
            if (playerQuestionElement) {
                playerQuestionElement.textContent = 'Error loading player data.';
            }
        });
}

function startNewRound() {
    player1HasGuessed = false;
    player2HasGuessed = false;
    displayRandomPlayer(); // Select and display a new random player for both players
}

function displayRandomPlayer() {
    if (playersData.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        currentPlayer = playersData[randomIndex]; // Set the current player globally
        displayPlayer(currentPlayer); // Display player info for both players
    } else {
        console.log("No data available");
    }
}

function displayPlayer(player) {
    const playerNameElement = document.getElementById('playerName');
    const playerImageElement = document.getElementById('playerImage');

    if (playerNameElement && playerImageElement) {
        playerNameElement.textContent = player.name;

        playerImageElement.src = 'stilllife.png'; // Placeholder image
        if (player.image_url) {
            playerImageElement.src = player.image_url;
            playerImageElement.onerror = function () {
                this.onerror = null;
                this.src = 'stilllife.png';
            };
        }

        document.getElementById('result').textContent = '';
        document.getElementById('result').className = '';
        document.getElementById('turnIndicator').textContent = "Player 1's turn"; // Reset the turn indicator
    } else {
        console.error("Player name or image element not found");
    }
}

function handlePlayerGuess(playerNumber) {
    const guessInput = document.getElementById(`collegeGuess${playerNumber}`);
    const guess = guessInput.value.trim().toLowerCase();
    const resultElement = document.getElementById('result');
    let isCorrect = false;

    if (currentPlayer) {
        isCorrect = isCloseMatch(guess, currentPlayer.college || 'No College');
    }

    updateStreakAndDisplayResult(isCorrect, playerNumber, resultElement);

    // Clear the input field
    guessInput.value = '';

    // Mark the player's guess as completed
    if (playerNumber === 1) {
        player1HasGuessed = true;
        document.getElementById('turnIndicator').textContent = "Player 2's turn";
    } else {
        player2HasGuessed = true;
    }

    // If both players have guessed, start a new round
    if (player1HasGuessed && player2HasGuessed) {
        setTimeout(() => {
            startNewRound(); // Start a new round after both players have guessed
        }, 2000); // Wait 2 seconds before showing the next player
    }
}

function updateStreakAndDisplayResult(isCorrect, playerNumber, resultElement) {
    if (isCorrect) {
        if (playerNumber === 1) {
            correctStreak1++;
            document.getElementById('player1Progress').textContent = `Player 1: Correct!`;
        } else {
            correctStreak2++;
            document.getElementById('player2Progress').textContent = `Player 2: Correct!`;
        }
        resultElement.textContent = "Correct!";
        resultElement.className = 'correct';
        correctSound.play();
    } else {
        resultElement.textContent = "Wrong answer. Try again!";
        resultElement.className = 'incorrect';
        wrongSound.play();
    }
}

function isCloseMatch(guess, answer) {
    let simpleGuess = guess.trim().toLowerCase();
    let simpleAnswer = answer.trim().toLowerCase();
    return simpleAnswer.includes(simpleGuess);
}
