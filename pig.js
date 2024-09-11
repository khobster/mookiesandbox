let playersData = [];
let currentPlayer = null; // Store the current player globally
let correctStreak1 = 0;
let correctStreak2 = 0;
let currentTurn = 1; // Player 1 starts
let player1HasGuessed = false;
let player2HasGuessed = false;

const correctSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const wrongSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

// Function to generate a unique game ID
function generateGameID() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Store the game ID in local storage or as a URL parameter
let gameID = localStorage.getItem('gameID') || new URLSearchParams(window.location.search).get('gameID');
if (!gameID) {
    gameID = generateGameID();
    localStorage.setItem('gameID', gameID);
}

document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();

    const collegeGuess1 = document.getElementById('collegeGuess1');
    const collegeGuess2 = document.getElementById('collegeGuess2');

    if (collegeGuess1) {
        collegeGuess1.addEventListener('input', (e) => {
            showSuggestions(e.target.value, 'suggestions1');
        });
    }

    if (collegeGuess2) {
        collegeGuess2.addEventListener('input', (e) => {
            showSuggestions(e.target.value, 'suggestions2');
        });
    }

    // Submit buttons for Player 1 and Player 2
    document.getElementById('submitBtn1').addEventListener('click', () => handlePlayerGuess(1));
    document.getElementById('submitBtn2').addEventListener('click', () => handlePlayerGuess(2));
});

function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
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
            console.error("Error loading player data:", error);
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

        document.getElementById('collegeGuess1').value = '';
        document.getElementById('collegeGuess2').value = '';
        document.getElementById('result').textContent = '';
        document.getElementById('result').className = '';
    }
}

function handlePlayerGuess(playerNumber) {
    const userGuess = document.getElementById(`collegeGuess${playerNumber}`).value.trim().toLowerCase();
    const resultElement = document.getElementById('result');
    let isCorrect = currentPlayer && isCloseMatch(userGuess, currentPlayer.college || 'No College');

    if (isCorrect) {
        resultElement.textContent = `Player ${playerNumber} is correct!`;
        resultElement.className = 'correct';
        correctSound.play();
        resetForNewRound();
    } else {
        resultElement.textContent = `Player ${playerNumber} is wrong!`;
        resultElement.className = 'incorrect';
        wrongSound.play();
        switchTurns();
    }

    updateGameStateAfterGuess(playerNumber);
}

function switchTurns() {
    currentTurn = currentTurn === 1 ? 2 : 1;
    document.getElementById('turnIndicator').textContent = `Player ${currentTurn}'s turn`;
}

function updateGameStateAfterGuess(playerNumber) {
    if (playerNumber === 1) {
        player1HasGuessed = true;
    } else {
        player2HasGuessed = true;
    }

    if (player1HasGuessed && player2HasGuessed) {
        // Both players have guessed, move to the next round
        startNewRound();
    } else {
        // Wait for the other player to guess
        switchTurns();
    }
}

function resetForNewRound() {
    player1HasGuessed = false;
    player2HasGuessed = false;
    startNewRound();
}

// Utility function for string matching
function isCloseMatch(guess, answer) {
    if (!guess.trim()) {
        return false;
    }

    let simpleGuess = guess.trim().toLowerCase();
    let simpleAnswer = answer.trim().toLowerCase();

    let normalizedGuess = simpleGuess.replace(/[^a-zA-Z0-9]/g, '');

    const noCollegePhrases = [
        "didntgotocollege",
        "didnotgotocollege",
        "hedidntgotocollege",
        "hedidnotgotocollege",
        "nocollege",
    ];

    if (noCollegePhrases.includes(normalizedGuess) && simpleAnswer === '') {
        return true;
    }

    if (simpleAnswer === 'unc' && (simpleGuess === 'north carolina' || simpleGuess === 'carolina')) {
        return true;
    }

    return simpleAnswer.includes(simpleGuess);
}

// Autocomplete suggestions
function showSuggestions(inputValue, suggestionBoxId) {
    const suggestionsContainer = document.getElementById(suggestionBoxId);

    if (!suggestionsContainer) {
        console.error(`Suggestion container with ID ${suggestionBoxId} not found`);
        return;
    }

    suggestionsContainer.innerHTML = ''; // Clear existing suggestions

    if (inputValue.length === 0) {
        return; // Don't show suggestions if input is empty
    }

    const suggestions = Array.from(new Set(playersData
        .map(player => player.college)
        .filter(college => college && college.toLowerCase().includes(inputValue.toLowerCase()))))
        .slice(0, 5); // Limit to 5 suggestions

    suggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.textContent = suggestion;
        suggestionItem.classList.add('suggestion-item');
        suggestionItem.addEventListener('click', () => {
            const collegeGuessInput = document.getElementById(suggestionBoxId === 'suggestions1' ? 'collegeGuess1' : 'collegeGuess2');
            if (collegeGuessInput) {
                collegeGuessInput.value = suggestion;
            }
            suggestionsContainer.innerHTML = ''; // Clear suggestions after selection
        });
        suggestionsContainer.appendChild(suggestionItem);
    });
}
