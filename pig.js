let gameId;
let currentPlayer = 'player1';  // Start with Player 1 by default
let player1Answer = null;
let player2Answer = null;
let playersData = [];  // Holds the player data from the JSON

// Get UI Elements
const player1Progress = document.getElementById('player1Progress');
const player2Progress = document.getElementById('player2Progress');
const decadeDropdown = document.getElementById('decadeDropdown');
const questionElement = document.getElementById('playerQuestion');
const turnIndicator = document.getElementById('turnIndicator');

// Load players data from the JSON file
function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            console.log('Players data loaded:', playersData);
        })
        .catch(error => {
            console.error('Error loading players data:', error);
        });
}

// Firebase: Create a New Game
function createNewGame() {
    const newGame = {
        currentQuestion: '',
        playerTurn: 'player1',  // Player 1 picks the decade first
        player1: { lastAnswer: '', progress: '' },
        player2: { lastAnswer: '', progress: '' }
    };

    db.collection('games').add(newGame)
        .then((docRef) => {
            gameId = docRef.id;
            console.log('Game created with ID:', gameId);

            // Update the URL with the gameId
            const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?gameId=${gameId}`;
            window.history.pushState({ path: newUrl }, '', newUrl);

            listenToGameUpdates();  // Start listening to game updates
        })
        .catch((error) => {
            console.error('Error creating game:', error);
        });
}

// Firebase: Listen to Real-Time Game Updates
function listenToGameUpdates() {
    db.collection('games').doc(gameId).onSnapshot((doc) => {
        if (doc.exists) {
            const gameData = doc.data();
            console.log('Game data:', gameData);  // Log the game data for debugging

            // Sync UI with the game state
            questionElement.textContent = `Where did ${gameData.currentQuestion || '...'} go to college?`;
            turnIndicator.textContent = `${gameData.playerTurn === 'player1' ? 'Player 1' : 'Player 2'}'s turn`;

            // Update player progress
            player1Progress.textContent = gameData.player1.progress || '';
            player2Progress.textContent = gameData.player2.progress || '';

            // Sync the last answers
            player1Answer = gameData.player1.lastAnswer;
            player2Answer = gameData.player2.lastAnswer;

            // Sync the decade dropdown: Only show for the current player
            if (gameData.playerTurn === currentPlayer) {
                decadeDropdown.style.display = 'block';  // Show for the current player
            } else {
                decadeDropdown.style.display = 'none';  // Hide for the other player
            }

            // Handle round results if both players have submitted answers
            if (player1Answer && player2Answer) {
                handleRoundResults();
            }
        } else {
            console.error('No game data found!');
        }
    });
}

// Firebase: Load existing game by ID from URL
function loadGameById(gameIdFromUrl) {
    gameId = gameIdFromUrl;
    listenToGameUpdates();
}

// Handle Decade Selection (by Player 1 or Player 2)
decadeDropdown.addEventListener('change', (e) => {
    const selectedDecade = e.target.value;
    if (selectedDecade) {
        const randomPlayer = pickRandomPlayerFromDecade(selectedDecade);

        // Update Firebase with the new question and switch turns
        db.collection('games').doc(gameId).update({
            currentQuestion: randomPlayer.name,  // Set the selected player's name as the question
            playerTurn: currentPlayer === 'player1' ? 'player2' : 'player1'  // Switch the turn
        });

        // Hide the decade dropdown
        decadeDropdown.style.display = 'none';
    }
});

// On Page Load: Check if a `gameId` is present in the URL
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdFromUrl = urlParams.get('gameId');

    if (gameIdFromUrl) {
        console.log('Loading existing game with ID:', gameIdFromUrl);
        loadGameById(gameIdFromUrl);  // Load the existing game if the gameId is present in the URL
    } else {
        console.log('Creating a new game');
        createNewGame();  // Create a new game if no gameId is present in the URL
    }

    loadPlayersData();  // Load player data from JSON
});
