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

    decadeDropdown.style.display = gameData.currentTurn === currentPlayer ? 'block' : 'none';
}

// Pick a random player from the selected decade
function pickRandomPlayerFromDecade(decade) {
    console.log('Selecting player from decade:', decade);
    console.log('Total players in data:', playersData.length);

    const playersFromDecade = playersData.filter(player => {
        const playerYear = parseInt(player.retirement_year);
        let playerDecade;

        // Align the logic with the Plunko game's success in picking players
        if (playerYear >= 1950 && playerYear < 1960) playerDecade = '1950s';
        else if (playerYear >= 1960 && playerYear < 1970) playerDecade = '1960s';
        else if (playerYear >= 1970 && playerYear < 1980) playerDecade = '1970s';
        else if (playerYear >= 1980 && playerYear < 1990) playerDecade = '1980s';
        else if (playerYear >= 1990 && playerYear < 2000) playerDecade = '1990s';
        else if (playerYear >= 2000 && playerYear < 2010) playerDecade = '2000s';
        else if (playerYear >= 2010 && playerYear < 2020) playerDecade = '2010s';
        else if (playerYear >= 2020) playerDecade = '2020s';

        return playerDecade === decade;
    });

    console.log('Players found in selected decade:', playersFromDecade.length);

    if (playersFromDecade.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersFromDecade.length);
        const selectedPlayer = playersFromDecade[randomIndex];
        console.log('Selected player:', selectedPlayer.name);
        return selectedPlayer;
    } else {
        // Instead of an alert, we log a message and provide feedback in the UI
        console.warn('No players found for the selected decade:', decade);
        return null;  // Return null instead of a placeholder player
    }
}

// Handle decade selection
decadeDropdown.addEventListener('change', (e) => {
    const selectedDecade = e.target.value;
    console.log('Selected decade:', selectedDecade);

    if (selectedDecade) {
        const randomPlayer = pickRandomPlayerFromDecade(selectedDecade);

        if (randomPlayer) {
            // Proceed if a valid player was found
            db.collection('games').doc(gameId).update({
                currentQuestion: randomPlayer.name,
                currentTurn: currentPlayer === 'player1' ? 'player2' : 'player1'
            }).then(() => {
                console.log('Game updated successfully with player:', randomPlayer.name);
            }).catch((error) => {
                console.error('Error updating game:', error);
                checkAndInitializeGame();
            });
        } else {
            // Provide feedback in the UI rather than an alert
            questionElement.textContent = `No players found for the selected decade. Please try another decade.`;
        }
    }
});

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

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();
    initializeGame();
});
