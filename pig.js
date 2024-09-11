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
        checkGameExistence(); // Check if the game exists before listening to updates
    }
}

// Check if the game document exists
function checkGameExistence() {
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
        currentTurn: 'player1', // Player 1 starts by choosing the decade
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
    questionElement.textContent = gameData.currentQuestion ? `Where did ${gameData.currentQuestion} go to college?` : 'Waiting for question...';
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

    // Show/hide decade dropdown based on whose turn it is
    decadeDropdown.style.display = gameData.currentTurn === currentPlayer ? 'block' : 'none';
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
    }
});

// Rest of the functions remain the same...

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();
    initializeGame();
});
