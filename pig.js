let playersData = [];
let currentDifficultyLevel = 1;
let playerTurn = 1; // To alternate between Player 1 and Player 2
let playerProgress = { 1: "", 2: "" }; // Track P-I-G progress for both players
let maxLetters = 3; // For P-I-G game
let gameId = 'unique_game_id'; // Replace this with a dynamic value for each game

document.addEventListener('DOMContentLoaded', () => {
    initializeGame(); // Initialize the game, including Firestore syncing

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleGuess);
    }

    const goFishBtn = document.getElementById('goFishBtn');
    if (goFishBtn) {
        goFishBtn.addEventListener('click', () => {
            document.getElementById('decadeDropdownContainer').style.display = 'block';
        });
    }

    const decadeDropdown = document.getElementById('decadeDropdown');
    if (decadeDropdown) {
        decadeDropdown.addEventListener('change', (e) => {
            const selectedDecade = e.target.value;
            if (selectedDecade) {
                displayPlayerFromDecade(selectedDecade);
                document.getElementById('decadeDropdownContainer').style.display = 'none';
            }
        });
    }

    setupAutoComplete(); // Setup autocomplete for college names
});

function initializeGame() {
    loadPlayersData();
    listenToGameUpdates(); // Listen to Firestore updates for syncing players
}

// Load players data from JSON and start the game
function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            playersData.sort((a, b) => a.rarity_score - b.rarity_score);
            playersData = playersData.filter(player => player.rarity_score <= currentDifficultyLevel || (player.games_played > 500 && player.retirement_year < 2000));
            startStandardPlay();
        })
        .catch(error => {
            console.error('Error loading JSON:', error);
            const playerQuestionElement = document.getElementById('playerQuestion');
            if (playerQuestionElement) {
                playerQuestionElement.textContent = 'Error loading player data.';
            }
        });
}

function startStandardPlay() {
    // Make sure the game starts by displaying the first player
    displayRandomPlayer();
}

// Display a random player from the filtered player list
function displayRandomPlayer() {
    if (playersData.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        const player = playersData[randomIndex];
        displayPlayer(player);
    }
}

function displayPlayer(player) {
    const playerNameElement = document.getElementById('playerName');
    const playerImageElement = document.getElementById('playerImage');

    if (playerNameElement && playerImageElement) {
        playerNameElement.textContent = player.name;
        playerImageElement.src = player.image_url || 'stilllife.png';

        playerImageElement.onerror = function () {
            this.onerror = null;
            this.src = 'stilllife.png';
        };

        document.getElementById('collegeGuess').value = '';
        document.getElementById('result').textContent = '';
        document.getElementById('result').className = '';
    }

    // Update the Firestore with the current player question for syncing
    db.collection('games').doc(gameId).update({
        currentPlayerQuestion: player
    });
}

// Listen to Firestore updates to sync game state between players
function listenToGameUpdates() {
    db.collection('games').doc(gameId).onSnapshot((doc) => {
        const gameData = doc.data();
        
        // Sync the current player progress and turn
        playerProgress = gameData.playerProgress || { 1: "", 2: "" };
        playerTurn = gameData.playerTurn || 1;
        updatePlayerProgressDisplay();
        updatePlayerTurn();

        // Sync the current question
        if (gameData.currentPlayerQuestion) {
            displayPlayer(gameData.currentPlayerQuestion);
        }
    });
}

// Handle player guesses
function handleGuess() {
    console.log("Checking the guess...");

    const userGuess = document.getElementById('collegeGuess').value.trim().toLowerCase();
    const playerName = document.getElementById('playerName').textContent;
    const player = playersData.find(p => p.name === playerName);

    let isCorrect = player && isCloseMatch(userGuess, player.college || 'No College');
    updateGameLogic(isCorrect, playerName);
}

// Check if the guess is close enough to the correct answer
function isCloseMatch(guess, answer) {
    return guess === answer.toLowerCase().trim();
}

// Handle the game logic for correct/incorrect guesses
function updateGameLogic(isCorrect, playerName) {
    const resultElement = document.getElementById('result');

    if (isCorrect) {
        resultElement.textContent = "That's CORRECT!";
        resultElement.className = 'correct';
        passTurnToNextPlayer(false); // Pass turn to the next player with the same question
    } else {
        resultElement.textContent = "That's WRONG!";
        resultElement.className = 'incorrect';
        addLetterToPlayer(); // Add a letter to the current player
    }

    setTimeout(() => {
        // After a short delay, move on to the next player or next question
        passTurnToNextPlayer(!isCorrect);
    }, 2000);
}

// Add a letter (P-I-G logic) to the current player when wrong
function addLetterToPlayer() {
    const currentPlayer = playerTurn;
    const currentProgress = playerProgress[currentPlayer];
    if (currentProgress.length < maxLetters) {
        const newProgress = currentProgress + "PIG"[currentProgress.length];
        playerProgress[currentPlayer] = newProgress;
        updatePlayerProgressDisplay();

        if (newProgress === "PIG") {
            endGame(currentPlayer);  // End game if the player has spelled PIG
        }
    }
}

// Pass the turn to the next player, optionally with a new question
function passTurnToNextPlayer(newQuestion) {
    playerTurn = playerTurn === 1 ? 2 : 1;
    document.getElementById('turnIndicator').textContent = `Player ${playerTurn}'s turn`;

    if (newQuestion) {
        displayRandomPlayer();  // Generate a fresh question
    }

    // Update Firestore to sync game state between players
    db.collection('games').doc(gameId).update({
        playerTurn: playerTurn,
        currentPlayerQuestion: newQuestion ? playersData[Math.floor(Math.random() * playersData.length)] : null,
        playerProgress: playerProgress
    });
}

// Update the progress display for both players
function updatePlayerProgressDisplay() {
    document.getElementById('player1Progress').textContent = `Player 1: ${playerProgress[1]}`;
    document.getElementById('player2Progress').textContent = `Player 2: ${playerProgress[2]}`;
}

// End the game when a player spells PIG
function endGame(player) {
    alert(`Player ${player} has spelled P-I-G and lost the game!`);
    playerProgress = { 1: "", 2: "" };  // Reset progress
    playerTurn = 1;  // Reset to Player 1's turn

    // Update Firestore to reset the game state
    db.collection('games').doc(gameId).update({
        playerProgress: playerProgress,
        playerTurn: playerTurn
    });

    updatePlayerProgressDisplay();
    updatePlayerTurn();
}

// Set up autocomplete for college names
function setupAutoComplete() {
    const collegeGuess = document.getElementById('collegeGuess');
    const suggestionsContainer = document.getElementById('suggestions');

    collegeGuess.addEventListener('input', () => {
        const inputValue = collegeGuess.value.toLowerCase();
        const suggestions = Array.from(new Set(playersData
            .map(player => player.college)
            .filter(college => college && college.toLowerCase().includes(inputValue))))
            .slice(0, 5); // Show up to 5 suggestions
        suggestionsContainer.innerHTML = '';
        suggestions.forEach(suggestion => {
            const suggestionItem = document.createElement('div');
            suggestionItem.textContent = suggestion;
            suggestionItem.classList.add('suggestion-item');
            suggestionItem.addEventListener('click', () => {
                collegeGuess.value = suggestion;
                suggestionsContainer.innerHTML = ''; // Clear suggestions once selected
            });
            suggestionsContainer.appendChild(suggestionItem);
        });
    });
}
