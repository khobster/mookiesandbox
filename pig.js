let gameId;
let currentPlayer = 'player1'; // Start with Player 1
let playersData = []; // Holds the player data from the JSON
let player1Answer = null;
let player2Answer = null;

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
        currentTurn: 'player1', // Player 1 picks the decade first
        player1: { lastAnswer: '', progress: '' },
        player2: { lastAnswer: '', progress: '' }
    };

    db.collection('games').add(newGame)
        .then((docRef) => {
            gameId = docRef.id;
            console.log('Game created with ID:', gameId);
            listenToGameUpdates(); // Start listening for updates
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
            
            // Sync UI with the game state
            questionElement.textContent = `Where did ${gameData.currentQuestion} go to college?`;
            turnIndicator.textContent = `${gameData.currentTurn === 'player1' ? 'Player 1' : 'Player 2'}'s turn`;

            // Update player progress
            player1Progress.textContent = gameData.player1.progress;
            player2Progress.textContent = gameData.player2.progress;

            // Sync answers
            player1Answer = gameData.player1.lastAnswer;
            player2Answer = gameData.player2.lastAnswer;

            // Sync the decade dropdown
            if (gameData.currentTurn === currentPlayer) {
                decadeDropdown.style.display = 'block'; // Show the dropdown for the current player
            } else {
                decadeDropdown.style.display = 'none'; // Hide the dropdown for the other player
            }

            // Handle round results if both players have submitted answers
            if (player1Answer && player2Answer) {
                handleRoundResults();
            }
        }
    });
}

// Handle Decade Selection (by Player 1 or Player 2)
decadeDropdown.addEventListener('change', (e) => {
    const selectedDecade = e.target.value;

    if (selectedDecade) {
        // Retrieve a player from the selected decade
        const randomPlayer = pickRandomPlayerFromDecade(selectedDecade);

        // Update Firebase with the new question and switch turns
        db.collection('games').doc(gameId).update({
            currentQuestion: randomPlayer.name,
            currentTurn: currentPlayer === 'player1' ? 'player2' : 'player1'
        });

        // Hide the decade dropdown for both players
        decadeDropdown.style.display = 'none';
    }
});

// Handle Player Answer Submission
function submitAnswer(player, answer) {
    db.collection('games').doc(gameId).update({
        [`${player}.lastAnswer`]: answer ? 'correct' : 'incorrect'
    });
}

// Handle Round Results
function handleRoundResults() {
    if (player1Answer === 'correct' && player2Answer !== 'correct') {
        // Player 2 gets a letter
        updateProgress('player2');
    } else if (player2Answer === 'correct' && player1Answer !== 'correct') {
        // Player 1 gets a letter
        updateProgress('player1');
    }

    // Reset answers for the next round
    resetForNextRound();
}

// Update Player Progress (P-I-G)
function updateProgress(player) {
    db.collection('games').doc(gameId).get().then((doc) => {
        const progress = doc.data()[player].progress || '';
        let newProgress = progress + 'PIG'[progress.length]; // Add the next letter (P -> I -> G)
        
        db.collection('games').doc(gameId).update({
            [`${player}.progress`]: newProgress
        });

        // Check if the player has completed PIG
        if (newProgress === 'PIG') {
            alert(`${player === 'player1' ? 'Player 1' : 'Player 2'} has lost the game!`);
            resetGame();
        }
    });
}

// Reset for the Next Round
function resetForNextRound() {
    db.collection('games').doc(gameId).update({
        'player1.lastAnswer': '',
        'player2.lastAnswer': ''
    });

    // Switch the turn to the other player
    currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
}

// Pick a Random Player from the Selected Decade using JSON data
function pickRandomPlayerFromDecade(decade) {
    const playersFromDecade = playersData.filter(player => {
        let playerYear = player.retirement_year;

        let playerDecade;
        if (playerYear >= 50 && playerYear <= 59) {
            playerDecade = '1950s';
        } else if (playerYear >= 60 && playerYear <= 69) {
            playerDecade = '1960s';
        } else if (playerYear >= 70 && playerYear <= 79) {
            playerDecade = '1970s';
        } else if (playerYear >= 80 && playerYear <= 89) {
            playerDecade = '1980s';
        } else if (playerYear >= 90 && playerYear <= 99) {
            playerDecade = '1990s';
        } else if (playerYear >= 0 && playerYear <= 9) {
            playerDecade = '2000s';
        } else if (playerYear >= 10 && playerYear <= 19) {
            playerDecade = '2010s';
        } else if (playerYear >= 20 && playerYear <= 29) {
            playerDecade = '2020s';
        }

        return playerDecade === decade;
    });

    if (playersFromDecade.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersFromDecade.length);
        return playersFromDecade[randomIndex];
    } else {
        return { name: 'Unknown Player', college: 'Unknown College' };
    }
}

// Initialize Game and Load Players
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();
    createNewGame();
});
