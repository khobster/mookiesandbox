let gameId;  // This will hold the dynamically generated game ID

// UI Elements
const player1Progress = document.getElementById('player1Progress');
const player2Progress = document.getElementById('player2Progress');
const decadeDropdown = document.getElementById('decadeDropdown');
const decadeDropdownContainer = document.getElementById('decadeDropdownContainer');
const turnIndicator = document.getElementById('turnIndicator');
const questionElement = document.getElementById('playerQuestion');

// Track answers and player turn
let player1Answer = null;
let player2Answer = null;
let playerTurn = 1;  // Player 1 starts by default

// Create a new game document with a unique game ID
function createNewGame() {
    const newGame = {
        currentQuestion: '',
        currentTurn: 'player1', // Player 1 starts by choosing the decade
        player1: {
            lastAnswer: '',
            progress: ''
        },
        player2: {
            lastAnswer: '',
            progress: ''
        }
    };

    // Add a new document to the "games" collection and get its ID
    db.collection('games').add(newGame)
        .then((docRef) => {
            gameId = docRef.id;  // Store the new game ID
            console.log('Game created with ID:', gameId);

            // Start listening to the game state
            listenToGameUpdates();
        })
        .catch((error) => {
            console.error('Error creating game:', error);
        });
}

// Real-time Firestore Listener for Game Updates
function listenToGameUpdates() {
    db.collection('games').doc(gameId).onSnapshot((doc) => {
        if (doc.exists) {
            const gameData = doc.data();
            
            // Update UI with the current question and turn
            questionElement.textContent = `Where did ${gameData.currentQuestion} go to college?`;
            turnIndicator.textContent = `${gameData.currentTurn === 'player1' ? 'Player 1' : 'Player 2'}'s turn to pick the decade`;
            
            // Update player progress
            player1Progress.textContent = gameData.player1.progress;
            player2Progress.textContent = gameData.player2.progress;

            // Track the last answer for both players
            player1Answer = gameData.player1.lastAnswer;
            player2Answer = gameData.player2.lastAnswer;
            
            // Check if both players have answered
            if (player1Answer && player2Answer) {
                handleRoundResults();
            }
        }
    });
}

// Handle Decade Selection
decadeDropdown.addEventListener('change', (e) => {
    const selectedDecade = e.target.value;

    if (selectedDecade) {
        // Pick a random player from the selected decade (replace with actual logic)
        const randomPlayer = pickRandomPlayerFromDecade(selectedDecade);
        
        // Update the game with the new question and switch turns
        db.collection('games').doc(gameId).update({
            currentQuestion: randomPlayer,
            currentTurn: playerTurn === 1 ? 'player2' : 'player1'
        });
        
        decadeDropdownContainer.style.display = 'none';  // Hide the dropdown after selecting
    }
});

// Handle Answer Submission (each player submits an answer)
function submitAnswer(player, answer) {
    // Update the player's last answer in the game state
    db.collection('games').doc(gameId).update({
        [`${player}.lastAnswer`]: answer ? 'correct' : 'incorrect'
    });
}

// Determine Round Results
function handleRoundResults() {
    if (player1Answer === 'correct' && player2Answer !== 'correct') {
        // Player 2 gets a letter
        updateProgress(2);
    } else if (player2Answer === 'correct' && player1Answer !== 'correct') {
        // Player 1 gets a letter
        updateProgress(1);
    }

    // Reset for the next round
    resetForNextRound();
}

// Update Progress (PIG game mechanics)
function updateProgress(player) {
    db.collection('games').doc(gameId).get().then((doc) => {
        const progress = doc.data()[`player${player}`].progress || '';
        
        let newProgress = progress + 'P'.charAt(progress.length);  // Add next letter (P -> I -> G)
        db.collection('games').doc(gameId).update({
            [`player${player}.progress`]: newProgress
        });

        // Check if player has completed "PIG"
        if (newProgress === 'PIG') {
            alert(`Player ${player} has lost the game!`);
            resetGame();
        }
    });
}

// Reset for the next round
function resetForNextRound() {
    // Reset the answers in the database
    db.collection('games').doc(gameId).update({
        'player1.lastAnswer': '',
        'player2.lastAnswer': ''
    });
    
    // Switch the turn to the next player
    playerTurn = playerTurn === 1 ? 2 : 1;
}

// Initialize the game
createNewGame();  // This will create a new game each time
