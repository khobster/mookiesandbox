let playersData = [];
let playerTurn = 1; // Alternating turn for selecting the decade
let playerProgress = { 1: "", 2: "" }; // Track P-I-G progress for both players
let gameId = 'unique_game_id'; // Replace this dynamically
let currentPlayer; // Store current player question
let selectedDecade = ""; // Store selected decade

// Firebase sync
let db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    initializeGame(); // Initialize the game, including Firebase syncing

    // Add listeners for decade selection and answer submission
    const submitBtn1 = document.getElementById('submitBtn1');
    const submitBtn2 = document.getElementById('submitBtn2');

    if (submitBtn1 && submitBtn2) {
        submitBtn1.addEventListener('click', handleGuess);
        submitBtn2.addEventListener('click', handleGuess);
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
            selectedDecade = e.target.value;
            if (selectedDecade) {
                document.getElementById('decadeDropdownContainer').style.display = 'none';
                displayPlayerFromDecade(selectedDecade);
            }
        });
    }
});

// Initialize game
function initializeGame() {
    loadPlayersData(); // Load players data
    listenToGameUpdates(); // Listen to Firebase updates for sync
}

// Load players data
function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            playersData.sort((a, b) => a.rarity_score - b.rarity_score); // Sort players by rarity score
            startStandardPlay();
        })
        .catch(error => console.error('Error loading player data:', error));
}

// Start game with a random player
function startStandardPlay() {
    // Player chooses decade before question is selected
    if (!selectedDecade) {
        document.getElementById('decadeDropdownContainer').style.display = 'block';
    } else {
        displayRandomPlayer();
    }
}

// Display random player based on selected decade
function displayPlayerFromDecade(decade) {
    const playersFromDecade = playersData.filter(player => player.retirement_year.startsWith(decade));
    if (playersFromDecade.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersFromDecade.length);
        currentPlayer = playersFromDecade[randomIndex];
        displayPlayer(currentPlayer);
    }
}

// Display player info
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
        resetInputs(); // Clear previous inputs
    }
    db.collection('games').doc(gameId).update({
        currentPlayerQuestion: player
    });
}

// Reset input fields for new question
function resetInputs() {
    document.getElementById('collegeGuess1').value = '';
    document.getElementById('collegeGuess2').value = '';
    document.getElementById('result').textContent = '';
}

// Listen to Firebase for game updates
function listenToGameUpdates() {
    db.collection('games').doc(gameId).onSnapshot((doc) => {
        const gameData = doc.data();
        playerProgress = gameData.playerProgress || { 1: "", 2: "" };
        playerTurn = gameData.playerTurn || 1;
        updatePlayerProgressDisplay();
        if (gameData.currentPlayerQuestion) {
            displayPlayer(gameData.currentPlayerQuestion);
        }
    });
}

// Handle both players' guesses
function handleGuess() {
    const userGuess1 = document.getElementById('collegeGuess1').value.trim().toLowerCase();
    const userGuess2 = document.getElementById('collegeGuess2').value.trim().toLowerCase();
    const playerName = document.getElementById('playerName').textContent;

    const isCorrect1 = currentPlayer && isCloseMatch(userGuess1, currentPlayer.college || 'No College');
    const isCorrect2 = currentPlayer && isCloseMatch(userGuess2, currentPlayer.college || 'No College');
    
    updateGameLogic(isCorrect1, isCorrect2);
}

// Check if guesses are correct
function isCloseMatch(guess, answer) {
    return guess === answer.toLowerCase().trim();
}

// Update game logic
function updateGameLogic(isCorrect1, isCorrect2) {
    const resultElement = document.getElementById('result');
    
    if (isCorrect1 !== isCorrect2) {
        if (isCorrect1) {
            playerProgress[2] += "PIG"[playerProgress[2].length];
            resultElement.textContent = "Player 2 gets a letter!";
        } else {
            playerProgress[1] += "PIG"[playerProgress[1].length];
            resultElement.textContent = "Player 1 gets a letter!";
        }
    } else {
        resultElement.textContent = "No letters given. Next question!";
    }

    updatePlayerProgressDisplay();

    // Sync progress with Firebase
    db.collection('games').doc(gameId).update({
        playerProgress: playerProgress
    });

    setTimeout(() => {
        startStandardPlay(); // New question
    }, 2000);
}

// Display player progress
function updatePlayerProgressDisplay() {
    document.getElementById('player1Progress').textContent = `Player 1: ${playerProgress[1]}`;
    document.getElementById('player2Progress').textContent = `Player 2: ${playerProgress[2]}`;
}
