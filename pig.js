let playersData = [];
let currentPlayer = 'player1';
let currentQuestion = '';
let gameID = null;
let isTwoForOneActive = false;
let selectedDecade = '';

// Load the players data and initialize the game
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData(); // Load player data from JSON
    gameID = getGameID();
    loadGameData(gameID);

    // Event listener for 'Let's See If You're Right' button
    const submitButton = document.getElementById('submitAnswer');
    const guessInput = document.getElementById('guessInput');

    submitButton.addEventListener('click', () => {
        const userGuess = guessInput.value.trim().toLowerCase();
        processGuess(userGuess);
    });

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
            displayPlayerFromDecade(selectedDecade); // Display player based on selected decade
        });
    }

    // Real-time game updates
    db.collection("games").doc(gameID).onSnapshot((doc) => {
        const gameData = doc.data();
        updateGameUI(gameData);
    });
});

// Fetch player data from the external JSON and store it
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

// Get or generate the game ID
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

// Initialize a new game
async function initializeNewGame(gameID) {
    currentQuestion = getRandomPlayer(); // Set a random player question
    await db.collection("games").doc(gameID).set({
        player1: { progress: '', lastAnswer: '' },
        player2: { progress: '', lastAnswer: '' },
        currentTurn: 'player1',
        currentQuestion: currentQuestion.name // Store the player name as the current question
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
        gameData[currentPlayer].progress += 'P'; // Add a letter for wrong answer
    }

    gameData.currentTurn = currentPlayer === 'player1' ? 'player2' : 'player1';
    gameData.currentQuestion = getRandomPlayer().name; // Get a new player for the next turn

    await db.collection("games").doc(gameID).set(gameData);
    document.getElementById('guessInput').value = ''; // Clear input
}

// Display a random player from the selected decade
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

// Get the decade for a player based on their retirement year
function getPlayerDecade(year) {
    if (year >= 1950 && year <= 1959) return '1950s';
    if (year >= 1960 && year <= 1969) return '1960s';
    if (year >= 1970 && year <= 1979) return '1970s';
    if (year >= 1980 && year <= 1989) return '1980s';
    if (year >= 1990 && year <= 1999) return '1990s';
    if (year >= 2000 && year <= 2009) return '2000s';
    if (year >= 2010 && year <= 2019) return '2010s';
    if (year >= 2020 && year <= 2029) return '2020s';
}

// Display the player's details (name, image, etc.)
function displayPlayer(player) {
    document.getElementById('playerName').textContent = player.name;
    document.getElementById('playerImage').src = player.image_url || 'default_image.png';
    document.getElementById('playerQuestion').textContent = `Where did ${player.name} go to college?`;
}

// Update the game UI based on the current state
function updateGameUI(gameData) {
    currentPlayer = gameData.currentTurn;
    document.getElementById('player1Progress').textContent = `Player 1: ${gameData.player1.progress}`;
    document.getElementById('player2Progress').textContent = `Player 2: ${gameData.player2.progress}`;
    document.getElementById('turnIndicator').textContent = `${currentPlayer === 'player1' ? "Player 1's turn" : "Player 2's turn"}`;

    const currentPlayerData = playersData.find(p => p.name === gameData.currentQuestion);
    if (currentPlayerData) {
        displayPlayer(currentPlayerData);
    }

    checkForWinner(gameData);
}

// Check if any player has spelled "PIG" and declare a winner
function checkForWinner(gameData) {
    if (gameData.player1.progress === 'PIG') {
        alert('Player 2 wins!');
        resetGame();
    } else if (gameData.player2.progress === 'PIG') {
        alert('Player 1 wins!');
        resetGame();
    }
}

// Reset the game (optional logic here to reset)
function resetGame() {
    db.collection("games").doc(gameID).delete().then(() => {
        window.location.reload();
    });
}
