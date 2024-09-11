let playersData = [];
let currentDifficultyLevel = 1;
let playerTurn = 1; // To alternate between Player 1 and Player 2
let playerProgress = { 1: "", 2: "" }; // Track P-I-G progress for both players
let maxLetters = 3; // For P-I-G game
let gameId = getGameId(); // Generate or get gameId from URL

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

    let isCorrect = player && isCloseMatch(userGuess, player.college || 'No College');
    updateStreakAndGenerateSnippetStandard(isCorrect, playerName, document.getElementById('result'), displayRandomPlayer);
}

// Check if the guess is close enough to the correct answer
function isCloseMatch(guess, answer) {
    return guess === answer.toLowerCase().trim();
}

// Update streak, check if correct, and switch players
function updateStreakAndGenerateSnippetStandard(isCorrect, playerName, resultElement, nextPlayerCallback) {
    if (isCorrect) {
        resultElement.textContent = "That's CORRECT!";
        resultElement.className = 'correct';
    } else {
        resultElement.textContent = "That's WRONG!";
        resultElement.className = 'incorrect';
        addLetterToPlayer(); // Add letter when wrong guess
    }

    setTimeout(() => {
        nextPlayerCallback();
    }, 2000);
}

// Add a letter to the current player's progress (P-I-G)
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
    updatePlayerTurn();  // Switch turns
}

// Update the progress display for both players and store it in Firestore
function updatePlayerProgressDisplay() {
    document.getElementById('player1Progress').textContent = `Player 1: ${playerProgress[1]}`;
    document.getElementById('player2Progress').textContent = `Player 2: ${playerProgress[2]}`;

    // Update Firestore with the game state
    db.collection('games').doc(gameId).set({
        playerProgress: playerProgress,
        playerTurn: playerTurn
    }, { merge: true });
}

// Switch to the next player's turn and update Firestore
function updatePlayerTurn() {
    playerTurn = playerTurn === 1 ? 2 : 1;
    document.getElementById('turnIndicator').textContent = `Player ${playerTurn}'s turn`;

    // Update Firestore
    db.collection('games').doc(gameId).set({
        playerTurn: playerTurn
    }, { merge: true });
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

// End the game when a player spells P-I-G
function endGame(player) {
    alert(`Player ${player} has spelled P-I-G and lost the game!`);
    playerProgress = { 1: "", 2: "" };  // Reset progress
    updatePlayerProgressDisplay();
    playerTurn = 1;  // Reset to Player 1's turn
    updatePlayerTurn();

    // Reset Firestore game state
    db.collection('games').doc(gameId).update({
        playerProgress: playerProgress,
        playerTurn: playerTurn
    });
}

// Listen to real-time game updates from Firestore
function listenToGameUpdates() {
    db.collection('games').doc(gameId).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            playerProgress = data.playerProgress || { 1: "", 2: "" };
            playerTurn = data.playerTurn || 1;

            updatePlayerProgressDisplay();
            updatePlayerTurn();
        }
    });
}
