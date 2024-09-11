let playersData = [];
let currentDifficultyLevel = 1;
let playerTurn = 1; // To alternate between Player 1 and Player 2
let playerProgress = { 1: "", 2: "" }; // Track P-I-G progress for both players
let maxLetters = 3; // For P-I-G game
let gameId = getGameId(); // Generate or get gameId from URL
let currentQuestion = null; // Track current question for both players
let firstPlayerCorrect = false; // Track if the first player answered correctly

document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();
    listenToGameUpdates(); // Listen to Firestore for real-time updates

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
    updateWaitingStatus(); // Call the new function to manage waiting status
});

// Function to generate or get gameId from URL
function getGameId() {
    const urlParams = new URLSearchParams(window.location.search);
    let gameId = urlParams.get('gameId');

    // If no gameId in URL, create one for Player 1
    if (!gameId) {
        gameId = generateGameId();
        const newUrl = `${window.location.origin}${window.location.pathname}?gameId=${gameId}`;
        window.history.replaceState(null, null, newUrl); // Update URL without refreshing the page
    }

    return gameId;
}

// Helper function to generate a unique game ID
function generateGameId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Function to listen to real-time updates in Firestore
function listenToGameUpdates() {
    db.collection('games').doc(gameId).onSnapshot((doc) => {
        if (doc.exists) {
            const gameData = doc.data();

            // Sync game state from Firestore
            playerProgress = gameData.playerProgress;
            playerTurn = gameData.playerTurn;
            firstPlayerCorrect = gameData.firstPlayerCorrect;
            currentQuestion = gameData.currentQuestion;

            updatePlayerProgressDisplay();
            document.getElementById('turnIndicator').textContent = `Player ${playerTurn}'s turn`;

            // Display the current question if available
            if (currentQuestion) {
                displayPlayer(currentQuestion);
            }

            updateWaitingStatus(); // Manage waiting status
        }
    });
}

// Load players data from JSON
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

// Start the standard game by displaying a random player
function startStandardPlay() {
    displayRandomPlayer();
}

function displayRandomPlayer() {
    if (playersData.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        const player = playersData[randomIndex];
        currentQuestion = player;
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
}

// Display player from the selected decade
function displayPlayerFromDecade(decade) {
    const playersFromDecade = playersData.filter(player => {
        let playerYear = player.retirement_year;
        let playerDecade;

        if (playerYear >= 50 && playerYear <= 59) playerDecade = '1950s';
        else if (playerYear >= 60 && playerYear <= 69) playerDecade = '1960s';
        else if (playerYear >= 70 && playerYear <= 79) playerDecade = '1970s';
        else if (playerYear >= 80 && playerYear <= 89) playerDecade = '1980s';
        else if (playerYear >= 90 && playerYear <= 99) playerDecade = '1990s';
        else if (playerYear >= 0 && playerYear <= 9) playerDecade = '2000s';
        else if (playerYear >= 10 && playerYear <= 19) playerDecade = '2010s';
        else if (playerYear >= 20 && playerYear <= 29) playerDecade = '2020s';

        return playerDecade === decade;
    });

    if (playersFromDecade.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersFromDecade.length);
        const player = playersFromDecade[randomIndex];
        currentQuestion = player;
        displayPlayer(player);
    } else {
        const playerQuestionElement = document.getElementById('playerQuestion');
        if (playerQuestionElement) {
            playerQuestionElement.textContent = `No players found for the ${decade}`;
        }
    }
}

// Handle the player's guess
function handleGuess() {
    console.log("Checking the guess...");

    const userGuess = document.getElementById('collegeGuess').value.trim().toLowerCase();
    const playerName = document.getElementById('playerName').textContent;
    const player = playersData.find(p => p.name === playerName);

    if (playerTurn === 1) {
        handlePlayer1Guess(player, userGuess);
    } else {
        handlePlayer2Guess(player, userGuess);
    }
}

function handlePlayer1Guess(player, guess) {
    if (isCloseMatch(guess, player.college)) {
        firstPlayerCorrect = true; // Player 1 correct
        resultDisplay("CORRECT", "correct");
        updateFirestoreState();
    } else {
        firstPlayerCorrect = false; // Player 1 incorrect
        resultDisplay("WRONG", "incorrect");
        switchToNewQuestionForPlayer2(); // Player 2 gets a fresh question
    }
}

function handlePlayer2Guess(player, guess) {
    if (firstPlayerCorrect) {
        // Player 2 must answer the same question
        if (isCloseMatch(guess, player.college)) {
            resultDisplay("CORRECT", "correct");
            switchTurn(); // No letter for anyone, switch turns
        } else {
            resultDisplay("WRONG", "incorrect");
            addLetterToPlayer(2); // Player 2 gets a letter
        }
    } else {
        // Player 2 got a fresh question, Player 1 now gets a fresh question if Player 2 is wrong
        if (isCloseMatch(guess, player.college)) {
            resultDisplay("CORRECT", "correct");
            switchTurn(); // Player 1 has to answer a fresh question
        } else {
            resultDisplay("WRONG", "incorrect");
            switchTurn(); // No letter yet, Player 1 gets a fresh question
        }
    }

    updateFirestoreState(); // Sync Firestore
}

// Add a letter to the current player
function addLetterToPlayer(playerNum) {
    const currentProgress = playerProgress[playerNum];
    if (currentProgress.length < maxLetters) {
        const newProgress = currentProgress + "PIG"[currentProgress.length];
        playerProgress[playerNum] = newProgress;
        updatePlayerProgressDisplay();

        if (newProgress === "PIG") {
            endGame(playerNum); // End game if the player has spelled PIG
        }
    }
}

// Update the progress display for both players
function updatePlayerProgressDisplay() {
    document.getElementById('player1Progress').textContent = `Player 1: ${playerProgress[1]}`;
    document.getElementById('player2Progress').textContent = `Player 2: ${playerProgress[2]}`;
}

// Function to manage the "waiting" status and disable inputs
function updateWaitingStatus() {
    const collegeGuess = document.getElementById('collegeGuess');
    const submitBtn = document.getElementById('submitBtn');

    if (playerTurn === 1) {
        if (gameId && playerTurn !== 1) {
            submitBtn.disabled = true;
            collegeGuess.disabled = true;
            document.getElementById('result').textContent = "Waiting for Player 2...";
        }
    } else {
        if (gameId && playerTurn !== 2) {
            submitBtn.disabled = true;
            collegeGuess.disabled = true;
            document.getElementById('result').textContent = "Waiting for Player 1...";
        }
    }
}

// Switch turn and sync Firestore
function switchTurn() {
    playerTurn = playerTurn === 1 ? 2 : 1;
    document.getElementById('turnIndicator').textContent = `Player ${playerTurn}'s turn`;
    updateFirestoreState(); // Sync Firestore
}

// Function to update Firestore state
function updateFirestoreState() {
    db.collection('games').doc(gameId).set({
        playerProgress: playerProgress,
        playerTurn: playerTurn,
        firstPlayerCorrect: firstPlayerCorrect,
        currentQuestion: currentQuestion
    });
}

// End the game when a player spells "P-I-G"
function endGame(losingPlayer) {
    alert(`Player ${losingPlayer} has spelled P-I-G and lost the game!`);
    resetGameState();
}

// Reset the game state
function resetGameState() {
    playerProgress = { 1: "", 2: "" };
    playerTurn = 1;
    firstPlayerCorrect = false;
    updatePlayerProgressDisplay();
    switchTurn();
    updateFirestoreState();
}

// Utility function to display the result
function resultDisplay(message, className) {
    const resultElement = document.getElementById('result');
    resultElement.textContent = message;
    resultElement.className = className;
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
