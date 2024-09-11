let playersData = [];
let currentPlayer = 'player1';
let currentQuestion = '';
let gameID = null;
let selectedDecade = '';

// Load player data from JSON and initialize the game
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData(); // Load player data from JSON
    gameID = getGameID();
    loadGameData(gameID);

    // Add event listener for submitting the guess
    const submitButton = document.getElementById('submitAnswer');
    const guessInput = document.getElementById('guessInput');
    
    if (submitButton && guessInput) {
        submitButton.addEventListener('click', () => {
            const userGuess = guessInput.value.trim().toLowerCase();
            processGuess(userGuess);
        });
    }

    // Event listener for the 'Go Fish' button
    const goFishBtn = document.getElementById('goFishBtn');
    if (goFishBtn) {
        goFishBtn.addEventListener('click', () => {
            document.getElementById('decadeDropdownContainer').style.display = 'block';
        });
    }

    // Event listener for the decade dropdown
    const decadeDropdown = document.getElementById('decadeDropdown');
    if (decadeDropdown) {
        decadeDropdown.addEventListener('change', (e) => {
            selectedDecade = e.target.value;
            displayPlayerFromDecade(selectedDecade); // Display player based on the selected decade
        });
    }

    // Real-time updates from Firebase
    db.collection("games").doc(gameID).onSnapshot((doc) => {
        const gameData = doc.data();
        updateGameUI(gameData);
    });
});

// Fetch player data from the external JSON
function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            playersData.sort((a, b) => a.rarity_score - b.rarity_score);
        })
        .catch(error => {
            console.error('Error loading player data:', error);
        });
}

// Get or generate the game ID from the URL
function getGameID() {
    const urlParams = new URLSearchParams(window.location.search);
    let gameID = urlParams.get('gameID');
    if (!gameID) {
        gameID = generateGameID();
        window.location.search = `?gameID=${gameID}`;
    }
    return gameID;
}

// Generate a random game ID
function generateGameID() {
    return Math.random().toString(36).substring(7);
}

// Load game data from Firebase
async function loadGameData(gameID) {
    const gameDoc = await db.collection("games").doc(gameID).get();
    if (gameDoc.exists) {
        updateGameUI(gameDoc.data());
    } else {
        initializeNewGame(gameID);
    }
}

// Initialize a new game and set the first question
async function initializeNewGame(gameID) {
    currentQuestion = getRandomPlayer(); // Get a random player from JSON
    await db.collection("games").doc(gameID).set({
        player1: { progress: '', lastAnswer: '' },
        player2: { progress: '', lastAnswer: '' },
        currentTurn: 'player1',
        currentQuestion: currentQuestion.name // Store the player's name as the question
    });
}

// Randomly select a player from the dataset
function getRandomPlayer() {
    const randomIndex = Math.floor(Math.random() * playersData.length);
    return playersData[randomIndex];
}

// Process the current player's guess
async function processGuess(guess) {
    const gameDoc = await db.collection("games").doc(gameID).get();
    const gameData = gameDoc.data();
    const player = playersData.find(p => p.name === gameData.currentQuestion);

    const correctAnswer = player ? player.college.toLowerCase() : '';

    if (guess === correctAnswer) {
        gameData[currentPlayer].lastAnswer = 'correct';
    } else {
        gameData[currentPlayer].lastAnswer = 'incorrect';
        gameData[currentPlayer].progress += 'P'; // Add a letter for wrong answers
    }

    // Switch turns and get a new player question
    gameData.currentTurn = currentPlayer === 'player1' ? 'player2' : 'player1';
    gameData.currentQuestion = getRandomPlayer().name; // Get a new random player

    await db.collection("games").doc(gameID).set(gameData);
    document.getElementById('guessInput').value = ''; // Clear the input field
}

// Display a player from the selected decade
function displayPlayerFromDecade(decade) {
    const playersFromDecade = playersData.filter(player => {
        const playerYear = player.retirement_year;
        return decade === getPlayerDecade(playerYear);
    });

    if (playersFromDecade.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersFromDecade.length);
        displayPlayer(playersFromDecade[randomIndex]);
    } else {
        document.getElementById('playerQuestion').textContent = `No players found for the ${decade}`;
    }
}

// Get the decade based on player's retirement year
function getPlayerDecade(year) {
    if (year >= 1950 && year <= 1959) return '1950s';
    if (year >= 1960 && year <= 1969) return '1960s';
    if (year >= 1970 && year <= 1979) return '1970s';
    if (year >= 1980 && year <= 1989) return '1980s';
    if (year >= 1990 && year <= 1999) return '1990s';
    if (year >= 2000 && year <= 2009) return '2000s';
    if (year >= 2010 && year <= 2019) return '2010s';
    if (year >= 2020 && year <= 2029) return '2020s';
    return 'Unknown';
}

// Display a player's details (e.g., name and image)
function displayPlayer(player) {
    const playerNameElement = document.getElementById('playerName');
    const playerImageElement = document.getElementById('playerImage');
    
    if (playerNameElement && playerImageElement) {
        playerNameElement.textContent = player.name;
        playerImageElement.src = player.image_url || 'default-image-url.png';
    }
}

// Update the game UI (turns, progress, etc.)
function updateGameUI(gameData) {
    currentPlayer = gameData.currentTurn;
    document.getElementById('player1Progress').textContent = `Player 1: ${gameData.player1.progress}`;
    document.getElementById('player2Progress').textContent = `Player 2: ${gameData.player2.progress}`;
    document.getElementById('playerQuestion').textContent = `Where did ${gameData.currentQuestion} go to college?`;

    if (currentPlayer === 'player1') {
        document.getElementById('turnIndicator').textContent = "Player 1's turn";
    } else {
        document.getElementById('turnIndicator').textContent = "Player 2's turn";
    }

    checkForWinner(gameData);
}

// Check if any player has spelled "PIG"
function checkForWinner(gameData) {
    if (gameData.player1.progress === 'PIG') {
        alert('Player 2 wins!');
        resetGame();
    } else if (gameData.player2.progress === 'PIG') {
        alert('Player 1 wins!');
        resetGame();
    }
}

// Reset the game (optional logic)
function resetGame() {
    db.collection("games").doc(gameID).delete().then(() => {
        window.location.reload();
    });
}
