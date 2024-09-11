let gameId;
let currentPlayer = 'player1'; // Player 1 starts by default
let player1Answer = null;
let player2Answer = null;
let playersData = [];

// Get UI Elements
const player1Progress = document.getElementById('player1Progress');
const player2Progress = document.getElementById('player2Progress');
const questionElement = document.getElementById('playerQuestion');
const turnIndicator = document.getElementById('turnIndicator');

// Load players data from the JSON file
function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            console.log('Players data loaded:', playersData.length, 'players');
            console.log('Sample players:', playersData.slice(0, 5));  // Log the first 5 players
        })
        .catch(error => {
            console.error('Error loading players data:', error);
        });
}

// Get the gameId from URL or create a new game
function initializeGame() {
    const urlParams = new URLSearchParams(window.location.search);
    gameId = urlParams.get('gameId');

    if (!gameId) {
        createNewGame();
    } else {
        console.log('Game ID found:', gameId);
        checkAndInitializeGame();
    }
}

// Check if the game exists and initialize or create a new one
function checkAndInitializeGame() {
    db.collection('games').doc(gameId).get()
        .then((doc) => {
            if (doc.exists) {
                console.log('Game document exists:', doc.data());
                listenToGameUpdates();
            } else {
                console.log('Game document not found. Creating a new game.');
                createNewGame();
            }
        })
        .catch((error) => {
            console.error('Error checking game document:', error);
            createNewGame();
        });
}

// Create a new game document in Firestore
function createNewGame() {
    const newGame = {
        currentQuestion: '',
        currentTurn: 'player1',
        player1: { lastAnswer: '', progress: '' },
        player2: { lastAnswer: '', progress: '' }
    };

    db.collection('games').add(newGame)
        .then((docRef) => {
            gameId = docRef.id;
            console.log('Game created with ID:', gameId);
            window.history.replaceState(null, null, `?gameId=${gameId}`);
            listenToGameUpdates();
        })
        .catch((error) => {
            console.error('Error creating game:', error);
        });
}

// Real-time listener for game updates
function listenToGameUpdates() {
    db.collection('games').doc(gameId).onSnapshot((docSnapshot) => {
        if (docSnapshot.exists) {
            const gameData = docSnapshot.data();
            updateUI(gameData);
        } else {
            console.error('Game document no longer exists.');
            createNewGame();
        }
    }, (error) => {
        console.error('Error listening to game updates:', error);
    });
}

// Update the UI with the current game state
function updateUI(gameData) {
    if (!gameData) {
        console.error('No game data available');
        return;
    }

    questionElement.textContent = gameData.currentQuestion ? `Where did ${gameData.currentQuestion} go to college?` : 'Waiting for question...';
    turnIndicator.textContent = `${gameData.currentTurn === 'player1' ? 'Player 1' : 'Player 2'}'s turn`;

    player1Progress.textContent = gameData.player1.progress;
    player2Progress.textContent = gameData.player2.progress;

    player1Answer = gameData.player1.lastAnswer;
    player2Answer = gameData.player2.lastAnswer;

    if (player1Answer && player2Answer) {
        handleRoundResults();
    }
}

// Pick a random player from the players data
function displayRandomPlayer() {
    console.log('Selecting random player from available data...');
    if (playersData.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        const selectedPlayer = playersData[randomIndex];
        console.log('Selected player:', selectedPlayer.name);

        db.collection('games').doc(gameId).update({
            currentQuestion: selectedPlayer.name,
            currentTurn: currentPlayer === 'player1' ? 'player2' : 'player1'
        }).then(() => {
            console.log('Game updated successfully with player:', selectedPlayer.name);
        }).catch((error) => {
            console.error('Error updating game:', error);
        });
    } else {
        console.error('No players available in data.');
        questionElement.textContent = 'No players available. Please refresh the game.';
    }
}

// Handle round results after both players submit their answers
function handleRoundResults() {
    if (player1Answer === 'correct' && player2Answer !== 'correct') {
        updateProgress('player2');
    } else if (player2Answer === 'correct' && player1Answer !== 'correct') {
        updateProgress('player1');
    }
    resetForNextRound();
}

function updateProgress(player) {
    db.collection('games').doc(gameId).get().then((doc) => {
        if (doc.exists) {
            const progress = doc.data()[player].progress || '';
            let newProgress = progress + 'PIG'[progress.length];

            db.collection('games').doc(gameId).update({
                [`${player}.progress`]: newProgress
            }).then(() => {
                if (newProgress === 'PIG') {
                    alert(`${player === 'player1' ? 'Player 1' : 'Player 2'} has lost the game!`);
                    resetGame();
                }
            }).catch((error) => {
                console.error('Error updating progress:', error);
            });
        } else {
            console.error('Game document not found');
            createNewGame();
        }
    }).catch((error) => {
        console.error('Error getting game document:', error);
    });
}

function resetForNextRound() {
    db.collection('games').doc(gameId).update({
        'player1.lastAnswer': '',
        'player2.lastAnswer': ''
    }).catch((error) => {
        console.error('Error resetting for next round:', error);
    });
    currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
}

function resetGame() {
    db.collection('games').doc(gameId).delete().then(() => {
        console.log('Game reset, creating a new game...');
        createNewGame();
    }).catch((error) => {
        console.error('Error resetting game:', error);
        createNewGame();
    });
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();
    initializeGame();
});
