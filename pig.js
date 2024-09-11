let playersData = [];
let currentPlayer = 'player1'; // Player 1 starts by default
let player1Answer = null;
let player2Answer = null;

// Get UI Elements
const player1Progress = document.getElementById('player1Progress');
const player2Progress = document.getElementById('player2Progress');
const questionElement = document.getElementById('playerQuestion');
const turnIndicator = document.getElementById('turnIndicator');

// Load players data from the JSON file (updated URL if needed)
function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            console.log('Players data loaded:', playersData.length, 'players');
            displayRandomPlayer(); // Start with a random player question
        })
        .catch(error => {
            console.error('Error loading players data:', error);
        });
}

// Function to display a random player and update the question
function displayRandomPlayer() {
    if (playersData.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        const player = playersData[randomIndex];
        displayPlayer(player);
    } else {
        console.error('No player data available');
    }
}

// Function to update the UI with the selected player
function displayPlayer(player) {
    const playerNameElement = document.getElementById('playerName');
    const playerImageElement = document.getElementById('playerImage');
    
    if (playerNameElement && playerImageElement) {
        playerNameElement.textContent = player.name;
        playerImageElement.src = 'stilllife.png'; // Placeholder image

        // If player has an image, update the image
        if (player.image_url) {
            playerImageElement.src = player.image_url;
            playerImageElement.onerror = function () {
                this.onerror = null;
                this.src = 'stilllife.png'; // Fallback to placeholder image if not found
            };
        }

        // Update the question element to show the player's question
        questionElement.textContent = `Where did ${player.name} go to college?`;

        // Clear previous guesses and results
        document.getElementById('collegeGuess').value = '';
        document.getElementById('result').textContent = '';
        document.getElementById('result').className = '';
    } else {
        console.error('Player name or image element not found');
    }
}

// Handle answer submission
function submitAnswer(player, answer) {
    const isCorrect = player.college && simplifyString(answer) === simplifyString(player.college);
    if (isCorrect) {
        console.log(`${player.name} went to ${player.college}. Correct!`);
    } else {
        console.log(`Wrong! ${player.name} went to ${player.college}.`);
    }
}

// Simplify string for matching
function simplifyString(str) {
    return str.trim().toLowerCase().replace(/university|college|the| /g, '');
}

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData(); // Load player data on page load
});
