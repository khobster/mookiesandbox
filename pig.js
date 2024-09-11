let playersData = [];
let currentPlayer = 'player1'; // Player 1 starts by default
let player1Answer = null;
let player2Answer = null;

// Get UI Elements
const player1Progress = document.getElementById('player1Progress');
const player2Progress = document.getElementById('player2Progress');
const questionElement = document.getElementById('playerQuestion');
const turnIndicator = document.getElementById('turnIndicator');

// Load players data from the JSON file
function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            console.log('Players data loaded:', playersData.length, 'players');
            displayRandomPlayer(); // Pick a random player on load
        })
        .catch(error => {
            console.error('Error loading players data:', error);
        });
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();
});

// Pick a random player and display it
function displayRandomPlayer() {
    if (playersData.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        const player = playersData[randomIndex];
        displayPlayer(player);
    } else {
        console.error("No players data available");
    }
}

// Display player details in the UI
function displayPlayer(player) {
    const playerNameElement = document.getElementById('playerName');
    const playerImageElement = document.getElementById('playerImage');

    if (playerNameElement && playerImageElement) {
        playerNameElement.textContent = player.name || 'Unknown Player';
        playerImageElement.src = player.image_url || 'stilllife.png';

        playerImageElement.onerror = function () {
            this.onerror = null;
            this.src = 'stilllife.png'; // Fallback to default image
        };

        document.getElementById('collegeGuess1').value = '';
        document.getElementById('collegeGuess2').value = '';
        document.getElementById('result').textContent = '';
        document.getElementById('result').className = '';
        turnIndicator.textContent = `${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'}'s turn`;

    } else {
        console.error("Player name or image element not found");
    }
}

// Player submits the answer
document.getElementById('submitBtn1').addEventListener('click', () => {
    const answer = document.getElementById('collegeGuess1').value.trim();
    submitAnswer('player1', answer);
});

document.getElementById('submitBtn2').addEventListener('click', () => {
    const answer = document.getElementById('collegeGuess2').value.trim();
    submitAnswer('player2', answer);
});

function submitAnswer(player, answer) {
    const playerGuess = simplifyString(answer);
    const correctAnswer = simplifyString(document.getElementById('playerName').textContent);

    if (isCloseMatch(playerGuess, correctAnswer)) {
        updateProgress(player, 'correct');
    } else {
        updateProgress(player, 'incorrect');
    }
}

// Simplify string for comparison
function simplifyString(str) {
    return str.trim().toLowerCase().replace(/university|college|the| /g, '');
}

// Check if the guess is close to the correct answer
function isCloseMatch(guess, answer) {
    return answer.includes(guess);
}

// Update the player's progress
function updateProgress(player, result) {
    if (player === 'player1') {
        player1Answer = result;
        player1Progress.textContent = `Player 1: ${result}`;
    } else {
        player2Answer = result;
        player2Progress.textContent = `Player 2: ${result}`;
    }

    if (player1Answer && player2Answer) {
        handleRoundResults();
    }
}

// Handle round results
function handleRoundResults() {
    if (player1Answer === 'correct' && player2Answer !== 'correct') {
        alert('Player 1 wins this round!');
    } else if (player2Answer === 'correct' && player1Answer !== 'correct') {
        alert('Player 2 wins this round!');
    } else {
        alert('Both players were incorrect, try again!');
    }
    resetForNextRound();
}

// Reset for the next round
function resetForNextRound() {
    player1Answer = null;
    player2Answer = null;
    currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
    displayRandomPlayer();
}
