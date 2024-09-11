let playersData = [];
let currentPlayer = null; // Store the current player globally
let correctStreak1 = 0;
let correctStreak2 = 0;
let player1HasGuessed = false;
let player2HasGuessed = false;

const correctSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const wrongSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

// Generate a unique game ID
function generateGameID() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Store or retrieve the game ID
let gameID = localStorage.getItem('gameID') || new URLSearchParams(window.location.search).get('gameID');
if (!gameID) {
    gameID = generateGameID();
    localStorage.setItem('gameID', gameID);
    // Optionally add the gameID to the URL
    window.history.replaceState({}, '', `?gameID=${gameID}`);
}

document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();
    
    const submitBtn1 = document.getElementById('submitBtn1');
    const submitBtn2 = document.getElementById('submitBtn2');
    
    submitBtn1.addEventListener('click', () => handlePlayerGuess(1));
    submitBtn2.addEventListener('click', () => handlePlayerGuess(2));
});

function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            
            // Retrieve the current player ID from local storage
            const currentPlayerID = localStorage.getItem(`currentPlayerID_${gameID}`);
            if (currentPlayerID) {
                currentPlayer = playersData.find(player => player.id === currentPlayerID);
                if (currentPlayer) {
                    displayPlayer(currentPlayer);
                } else {
                    console.error("Player with stored ID not found. Starting a new round.");
                    startNewRound(); 
                }
            } else {
                startNewRound();
            }
        })
        .catch(error => {
            console.error('Error loading JSON:', error);
            document.getElementById('playerQuestion').textContent = 'Error loading player data.';
        });
}

function startNewRound() {
    player1HasGuessed = false;
    player2HasGuessed = false;
    displayRandomPlayer();
}

function displayRandomPlayer() {
    if (playersData.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        currentPlayer = playersData[randomIndex];
        
        // Store the current player ID in local storage
        localStorage.setItem(`currentPlayerID_${gameID}`, currentPlayer.id);
        displayPlayer(currentPlayer);
    } else {
        console.log("No data available");
    }
}

function displayPlayer(player) {
    const playerNameElement = document.getElementById('playerName');
    const playerImageElement = document.getElementById('playerImage');

    if (playerNameElement && playerImageElement) {
        playerNameElement.textContent = player.name;

        playerImageElement.src = 'stilllife.png';
        if (player.image_url) {
            playerImageElement.src = player.image_url;
            playerImageElement.onerror = function () {
                this.onerror = null;
                this.src = 'stilllife.png';
            };
        }

        document.getElementById('result').textContent = '';
        document.getElementById('result').className = '';
        document.getElementById('turnIndicator').textContent = "Player 1's turn";
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
