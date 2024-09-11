let gameId;
let currentPlayer = 'player1'; // Player 1 starts by default
let player1Answer = null;
let player2Answer = null;
let playersData = [];

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

    decadeDropdown.style.display = gameData.currentTurn === currentPlayer ? 'block' : 'none';
}

// Handle decade selection
decadeDropdown.addEventListener('change', (e) => {
    const selectedDecade = e.target.value;

    if (selectedDecade) {
        const randomPlayer = pickRandomPlayerFromDecade(selectedDecade);

        db.collection('games').doc(gameId).update({
            currentQuestion: randomPlayer.name,
            currentTurn: currentPlayer === 'player1' ? 'player2' : 'player1'
        }).then(() => {
            console.log('Game updated successfully');
        }).catch((error) => {
            console.error('Error updating game:', error);
            checkAndInitializeGame(); // Try to reinitialize the game if update fails
        });
    }
});

// Pick a random player from the selected decade
function pickRandomPlayerFromDecade(decade) {
    const playersFromDecade = playersData.filter(player => {
        const playerYear = player.retirement_year;
        const playerDecade = Math.floor(playerYear / 10) * 10 + 's';
        return playerDecade === decade;
    });

    if (playersFromDecade.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersFromDecade.length);
        return playersFromDecade[randomIndex];
    } else {
        return { name: 'Unknown Player', college: 'Unknown College' };
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();
    initializeGame();
});

// Add these functions to handle game logic
function submitAnswer(player, answer) {
    db.collection('games').doc(gameId).update({
        [`${player}.lastAnswer`]: answer ? 'correct' : 'incorrect'
    }).catch((error) => {
        console.error('Error submitting answer:', error);
        checkAndInitializeGame(); // Try to reinitialize the game if update fails
    });
}

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
                checkAndInitializeGame(); // Try to reinitialize the game if update fails
            });
        } else {
            console.error('Game document not found');
            createNewGame();
        }
    }).catch((error) => {
        console.error('Error getting game document:', error);
        checkAndInitializeGame(); // Try to reinitialize the game if get fails
    });
}

function resetForNextRound() {
    db.collection('games').doc(gameId).update({
        'player1.lastAnswer': '',
        'player2.lastAnswer': ''
    }).catch((error) => {
        console.error('Error resetting for next round:', error);
        checkAndInitializeGame(); // Try to reinitialize the game if update fails
    });
    currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
}

function resetGame() {
    db.collection('games').doc(gameId).delete().then(() => {
        console.log('Game reset, creating a new game...');
        createNewGame();
    }).catch((error) => {
        console.error('Error resetting game:', error);
        createNewGame(); // Create a new game even if deletion fails
    });
}
