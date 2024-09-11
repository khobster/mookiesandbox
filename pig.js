let playersData = [];
let currentPlayer = null; // Store the current player globally
let correctStreak1 = 0;
let correctStreak2 = 0;
let currentTurn = 1; // Player 1 starts
let player1HasGuessed = false;
let player2HasGuessed = false;
let gameId = null;

const correctSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const wrongSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

// Initialize Firebase and set gameId
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();

    // Generate gameId and store in Firebase
    gameId = localStorage.getItem('gameId') || generateGameID();
    localStorage.setItem('gameId', gameId);

    const gameDocRef = db.collection('games').doc(gameId);

    // Sync game state in real-time
    gameDocRef.onSnapshot((doc) => {
        if (doc.exists) {
            const gameData = doc.data();
            currentPlayer = gameData.currentPlayer;
            currentTurn = gameData.currentTurn;
            updateUI();
        } else {
            console.log('No game data found, creating a new game.');
            startNewRound();
        }
    });

    // Player input handling
    document.getElementById('submitBtn1').addEventListener('click', () => handlePlayerGuess(1));
    document.getElementById('submitBtn2').addEventListener('click', () => handlePlayerGuess(2));

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
});

function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
        })
        .catch(error => {
            console.error('Error loading player data:', error);
        });
}

function generateGameID() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Function to start a new round and sync in Firebase
function startNewRound() {
    player1HasGuessed = false;
    player2HasGuessed = false;

    const randomIndex = Math.floor(Math.random() * playersData.length);
    currentPlayer = playersData[randomIndex];

    db.collection('games').doc(gameId).set({
        currentPlayer: currentPlayer,
        currentTurn: 1 // Player 1 starts
    }).then(() => {
        console.log('New round started with player:', currentPlayer.name);
        displayPlayer(currentPlayer);
    }).catch((error) => {
        console.error('Error starting a new round:', error);
    });
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

// Handle player guesses and switch turns
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

// Switch turns between players
function switchTurns() {
    currentTurn = currentTurn === 1 ? 2 : 1;

    db.collection('games').doc(gameId).update({
        currentTurn: currentTurn
    }).then(() => {
        document.getElementById('turnIndicator').textContent = `Player ${currentTurn}'s turn`;
    }).catch((error) => {
        console.error('Error switching turns:', error);
    });
}

// Check if both players have guessed and move to the next round
function updateGameStateAfterGuess(playerNumber) {
    if (playerNumber === 1) {
        player1HasGuessed = true;
    } else {
        player2HasGuessed = true;
    }

    if (player1HasGuessed && player2HasGuessed) {
        startNewRound();
    } else {
        switchTurns();
    }
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
