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
        createNewGame(); // If no gameId, create a new game
    } else {
        console.log('Game ID found:', gameId);
        listenToGameUpdates(); // If gameId exists, start listening to updates
    }
}

// Create a new game document in Firestore
function createNewGame() {
    const newGame = {
        currentQuestion: '',
        currentTurn: 'player1', // Player 1 starts by choosing the decade
        player1: { lastAnswer: '', progress: '' },
        player2: { lastAnswer: '', progress: '' }
    };

    db.collection('games').add(newGame)
        .then((docRef) => {
            gameId = docRef.id;
            console.log('Game created with ID:', gameId);

            // Check if the game document exists after creation
            db.collection('games').doc(gameId).get().then((doc) => {
                if (doc.exists) {
                    console.log('Game document successfully created in Firestore:', doc.data());
                } else {
                    console.error('Game document not found after creation.');
                }
            });

            // Redirect with the new gameId in URL
            window.location.href = `pig.html?gameId=${gameId}`;
        })
        .catch((error) => {
            console.error('Error creating game:', error);
        });
}

// Real-time listener for game updates
function listenToGameUpdates() {
    db.collection('games').doc(gameId).get()
        .then((doc) => {
            if (doc.exists) {
                console.log('Game document exists:', doc.data());

                // Set up real-time listener for changes in the game document
                db.collection('games').doc(gameId).onSnapshot((docSnapshot) => {
                    const gameData = docSnapshot.data();
                    updateUI(gameData);  // Function to update the UI based on the game data
                });
            } else {
                console.error('No game document found for this game ID:', gameId);
            }
        })
        .catch((error) => {
            console.error('Error checking game document:', error);
        });
}

// Update the UI with the current game state
function updateUI(gameData) {
    questionElement.textContent = `Where did ${gameData.currentQuestion} go to college?`;
    turnIndicator.textContent = `${gameData.currentTurn === 'player1' ? 'Player 1' : 'Player 2'}'s turn`;

    // Update player progress
    player1Progress.textContent = gameData.player1.progress;
    player2Progress.textContent = gameData.player2.progress;

    // Store answers
    player1Answer = gameData.player1.lastAnswer;
    player2Answer = gameData.player2.lastAnswer;

    // If both players have answered, handle round results
    if (player1Answer && player2Answer) {
        handleRoundResults();
    }
}

// Handle decade selection
decadeDropdown.addEventListener('change', (e) => {
    const selectedDecade = e.target.value;

    if (selectedDecade) {
        // Pick a random player from the selected decade
        const randomPlayer = pickRandomPlayerFromDecade(selectedDecade);

        // Update game document with new question and switch turns
        db.collection('games').doc(gameId).update({
            currentQuestion: randomPlayer.name,
            currentTurn: currentPlayer === 'player1' ? 'player2' : 'player1'
        }).catch((error) => {
            console.error('Error updating game:', error);
        });

        // Hide decade dropdown
        decadeDropdown.style.display = 'none';
    }
});

// Handle answer submission for each player
function submitAnswer(player, answer) {
    db.collection('games').doc(gameId).update({
        [`${player}.lastAnswer`]: answer ? 'correct' : 'incorrect'
    });
}

// Handle round results
function handleRoundResults() {
    if (player1Answer === 'correct' && player2Answer !== 'correct') {
        updateProgress('player2');
    } else if (player2Answer === 'correct' && player1Answer !== 'correct') {
        updateProgress('player1');
    }
    resetForNextRound();
}

// Update player progress in the game (PIG logic)
function updateProgress(player) {
    db.collection('games').doc(gameId).get().then((doc) => {
        const progress = doc.data()[player].progress || '';
        let newProgress = progress + 'PIG'[progress.length]; // Add next letter (P -> I -> G)

        db.collection('games').doc(gameId).update({
            [`${player}.progress`]: newProgress
        });

        // Check if the player completed "PIG"
        if (newProgress === 'PIG') {
            alert(`${player === 'player1' ? 'Player 1' : 'Player 2'} has lost the game!`);
            resetGame();
        }
    });
}

// Reset the game for the next round
function resetForNextRound() {
    db.collection('games').doc(gameId).update({
        'player1.lastAnswer': '',
        'player2.lastAnswer': ''
    });
    currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
}

// Pick a random player from the selected decade using JSON data
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

// Reset the entire game
function resetGame() {
    db.collection('games').doc(gameId).delete().then(() => {
        console.log('Game reset, creating a new game...');
        createNewGame();
    }).catch((error) => {
        console.error('Error resetting game:', error);
    });
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();
    initializeGame();
});
