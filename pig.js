let gameId;
let currentPlayer = 'player1';  // Track whose turn it is
let playersData = [];
let player1Answer = null;
let player2Answer = null;

// Get URL Params (gameId)
function getGameIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('gameId');
}

// Initialize Firebase
function initializeGame() {
    gameId = getGameIdFromURL();

    if (gameId) {
        console.log('Game ID found:', gameId);
        listenToGameUpdates();
    } else {
        console.error('No Game ID found in the URL.');
    }
}

// Fetch players data from the JSON file
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

// Listen to Game Updates from Firebase in real-time
function listenToGameUpdates() {
    db.collection('games').doc(gameId).onSnapshot((doc) => {
        if (doc.exists) {
            const gameData = doc.data();
            
            // Update the UI with the current state of the game
            updateUI(gameData);
        } else {
            console.error('No game document found for this game ID.');
        }
    });
}

// Update the UI based on game state
function updateUI(gameData) {
    const questionElement = document.getElementById('playerQuestion');
    const turnIndicator = document.getElementById('turnIndicator');
    const player1Progress = document.getElementById('player1Progress');
    const player2Progress = document.getElementById('player2Progress');

    // Update question
    if (gameData.currentQuestion) {
        questionElement.textContent = `Where did ${gameData.currentQuestion} go to college?`;
    }

    // Update turn indicator
    turnIndicator.textContent = `${gameData.currentTurn === 'player1' ? 'Player 1' : 'Player 2'}'s turn`;

    // Update progress
    player1Progress.textContent = gameData.player1.progress;
    player2Progress.textContent = gameData.player2.progress;

    // Update answers
    player1Answer = gameData.player1.lastAnswer;
    player2Answer = gameData.player2.lastAnswer;

    // Handle round results if both players have submitted their answers
    if (player1Answer && player2Answer) {
        handleRoundResults();
    }
}

// Handle the round results and update progress
function handleRoundResults() {
    if (player1Answer === 'correct' && player2Answer !== 'correct') {
        updateProgress('player2');
    } else if (player2Answer === 'correct' && player1Answer !== 'correct') {
        updateProgress('player1');
    }

    // Reset for the next round
    resetForNextRound();
}

// Update player progress (P-I-G mechanics)
function updateProgress(player) {
    db.collection('games').doc(gameId).get().then((doc) => {
        const progress = doc.data()[player].progress || '';
        let newProgress = progress + 'PIG'[progress.length];  // Add next letter (P -> I -> G)
        
        db.collection('games').doc(gameId).update({
            [`${player}.progress`]: newProgress
        });

        // Check if player has lost (completed "PIG")
        if (newProgress === 'PIG') {
            alert(`${player === 'player1' ? 'Player 1' : 'Player 2'} has lost the game!`);
            resetGame();
        }
    });
}

// Reset the game state for the next round
function resetForNextRound() {
    db.collection('games').doc(gameId).update({
        'player1.lastAnswer': '',
        'player2.lastAnswer': ''
    });

    // Switch turn to the other player
    currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
}

// Handle decade selection by Player 1 or Player 2
document.getElementById('decadeDropdown').addEventListener('change', (e) => {
    const selectedDecade = e.target.value;

    if (selectedDecade) {
        const randomPlayer = pickRandomPlayerFromDecade(selectedDecade);

        // Update Firebase with the new question and switch turns
        db.collection('games').doc(gameId).update({
            currentQuestion: randomPlayer.name,
            currentTurn: currentPlayer === 'player1' ? 'player2' : 'player1'
        });

        // Hide the dropdown after selecting
        document.getElementById('decadeDropdownContainer').style.display = 'none';
    }
});

// Handle answer submission for both players
document.getElementById('submitBtn1').addEventListener('click', () => {
    const player1Guess = document.getElementById('collegeGuess1').value;
    submitAnswer('player1', player1Guess);
});

document.getElementById('submitBtn2').addEventListener('click', () => {
    const player2Guess = document.getElementById('collegeGuess2').value;
    submitAnswer('player2', player2Guess);
});

// Submit answer to Firebase
function submitAnswer(player, answer) {
    const isCorrect = checkAnswer(answer);
    
    db.collection('games').doc(gameId).update({
        [`${player}.lastAnswer`]: isCorrect ? 'correct' : 'incorrect'
    });
}

// Check if the submitted answer is correct
function checkAnswer(guess) {
    const currentQuestion = document.getElementById('playerQuestion').textContent;
    const playerData = playersData.find(p => p.name === currentQuestion);
    
    if (playerData && playerData.college.toLowerCase() === guess.toLowerCase()) {
        return true;
    }
    return false;
}

// Pick a random player from the selected decade
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

// Initialize the game on page load
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();
    initializeGame();
});
