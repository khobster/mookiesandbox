let gameId;  // This will hold the dynamically generated game ID
let playerId; // Will hold 'player1' or 'player2' for each player

// UI Elements
const player1Progress = document.getElementById('player1Progress');
const player2Progress = document.getElementById('player2Progress');
const decadeDropdown = document.getElementById('decadeDropdown');
const decadeDropdownContainer = document.getElementById('decadeDropdownContainer');
const turnIndicator = document.getElementById('turnIndicator');
const questionElement = document.getElementById('playerQuestion');
const submitBtn = document.getElementById('submitBtn');

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
        const randomPlayer = pickRandomPlayerFromDecade(selectedDecade); // Replace this with actual player data logic

        // Update the game with the new question and switch turns
        db.collection('games').doc(gameId).update({
            currentQuestion: randomPlayer,
            currentTurn: playerTurn === 1 ? 'player2' : 'player1'
        });

        decadeDropdownContainer.style.display = 'none'; // Hide the dropdown after selecting
    }
});

// Handle Answer Submission (each player submits an answer)
submitBtn.addEventListener('click', () => {
    const answerInput = document.getElementById('collegeGuess').value;
    const currentPlayer = playerTurn === 1 ? 'player1' : 'player2';
    
    submitAnswer(currentPlayer, answerInput);
});

// Submit answer and update Firestore
function submitAnswer(player, answer) {
    // Example validation for correct/incorrect answers (to be replaced with real logic)
    const isCorrect = (answer.toLowerCase() === 'correct answer');  // Replace with actual validation logic

    db.collection('games').doc(gameId).update({
        [`${player}.lastAnswer`]: isCorrect ? 'correct' : 'incorrect'
    });
}

// Handle Round Results
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

    // Show the decade dropdown only for the player whose turn it is
    if (playerTurn === 1) {
        decadeDropdownContainer.style.display = 'block';
    } else {
        decadeDropdownContainer.style.display = 'none';  // Player 2 should not see the dropdown
    }
}

// Pick a random player from the selected decade (mock data for testing, replace with actual logic)
function pickRandomPlayerFromDecade(decade) {
    // Mock data for testing, replace with actual player data lookup
    const playersByDecade = {
        '1980s': ['Michael Jordan', 'Magic Johnson', 'Larry Bird'],
        '1990s': ['Shaquille O’Neal', 'Kobe Bryant', 'Tim Duncan'],
        '2000s': ['LeBron James', 'Carmelo Anthony', 'Dwyane Wade'],
    };

    const players = playersByDecade[decade] || [];
    if (players.length > 0) {
        // Return a random player from the decade
        return players[Math.floor(Math.random() * players.length)];
    } else {
        console.error(`No players found for the selected decade: ${decade}`);
        return 'Unknown Player';
    }
}

// Initialize the game
createNewGame();  // This will create a new game each time
