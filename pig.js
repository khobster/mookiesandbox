let playersData = [];
let currentPlayer = null;
let correctStreak1 = 0;
let correctStreak2 = 0;
let player1HasGuessed = false;
let player2HasGuessed = false;

const correctSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const wrongSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

// Firebase reference to the game data
let gameRef;
let gameId;

// Extract gameId from URL (only once here in pig.js)
const urlParams = new URLSearchParams(window.location.search);
gameId = urlParams.get('gameId');

document.addEventListener('DOMContentLoaded', () => {
    if (gameId) {
        gameRef = db.collection('games').doc(gameId);
        loadGameData();
    } else {
        console.error("No gameId found in the URL!");
    }

    const submitBtn1 = document.getElementById('submitBtn1');
    const submitBtn2 = document.getElementById('submitBtn2');

    submitBtn1.addEventListener('click', () => handlePlayerGuess(1));
    submitBtn2.addEventListener('click', () => handlePlayerGuess(2));
});

function loadGameData() {
    // Log gameId to verify it exists in URL
    console.log("Attempting to load game with gameId:", gameId);

    gameRef.get().then((doc) => {
        if (doc.exists) {
            const gameData = doc.data();
            console.log("Game data loaded successfully:", gameData);

            // Initialize the game based on the loaded game data
            document.getElementById('playerQuestion').textContent = gameData.currentQuestion || 'Where did the player go to college?';
            document.getElementById('turnIndicator').textContent = gameData.currentTurn === 'player1' ? "Player 1's turn" : "Player 2's turn";
        } else {
            console.error(`No such game found with gameId: ${gameId}`);
        }
    }).catch((error) => {
        console.error("Error loading game:", error);
    });
}

function handlePlayerGuess(playerNumber) {
    const guessInput = document.getElementById(`collegeGuess${playerNumber}`);
    const guess = guessInput.value.trim().toLowerCase();
    const resultElement = document.getElementById('result');
    let isCorrect = false;

    if (currentPlayer) {
        isCorrect = isCloseMatch(guess, currentPlayer.college || 'No College');
    }

    updateStreakAndDisplayResult(isCorrect, playerNumber, resultElement);

    // Clear the input field
    guessInput.value = '';

    if (playerNumber === 1) {
        player1HasGuessed = true;
        document.getElementById('turnIndicator').textContent = "Player 2's turn";
    } else {
        player2HasGuessed = true;
    }

    if (player1HasGuessed && player2HasGuessed) {
        setTimeout(() => {
            startNewRound();
        }, 2000);
    }
}

function updateStreakAndDisplayResult(isCorrect, playerNumber, resultElement) {
    if (isCorrect) {
        resultElement.textContent = "Correct!";
        resultElement.className = 'correct';
        correctSound.play();
    } else {
        resultElement.textContent = "Wrong answer. Try again!";
        resultElement.className = 'incorrect';
        wrongSound.play();
    }
}

function isCloseMatch(guess, answer) {
    let simpleGuess = guess.trim().toLowerCase();
    let simpleAnswer = answer.trim().toLowerCase();
    return simpleAnswer.includes(simpleGuess);
}

function showSuggestions(input) {
    const suggestionsContainer = document.getElementById('suggestions');
    suggestionsContainer.innerHTML = '';
    
    if (input.length === 0) {
        return;
    }
    
    const suggestions = Array.from(new Set(playersData
        .map(player => player.college)
        .filter(college => college && college.toLowerCase().indexOf(input.toLowerCase()) !== -1)))
        .slice(0, 5);
        
    suggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.textContent = suggestion;
        suggestionItem.classList.add('suggestion-item');
        suggestionItem.addEventListener('click', () => {
            document.getElementById('collegeGuess1').value = suggestion;
            suggestionsContainer.innerHTML = '';
        });
        suggestionsContainer.appendChild(suggestionItem);
    });
}

document.getElementById('collegeGuess1').addEventListener('input', (e) => {
    showSuggestions(e.target.value);
});

document.getElementById('collegeGuess2').addEventListener('input', (e) => {
    showSuggestions(e.target.value);
});

// Game creation logic when pigLink is clicked
document.getElementById('pigLink').addEventListener('click', () => {
  console.log("Attempting to create a new game...");

  db.collection('games').add({
    currentQuestion: 'Where did the player go to college?',  // Example question
    currentTurn: 'player1',  // Player 1 starts
    player1: { lastAnswer: '', progress: '' },
    player2: { lastAnswer: '', progress: '' }
  })
  .then((docRef) => {
    // Log game creation success and ID
    console.log('New game created successfully with ID:', docRef.id);
    const gameId = docRef.id;
    window.location.href = `pig.html?gameId=${gameId}`;
  })
  .catch((error) => {
    // Log any errors that occur during game creation
    console.error('Error creating game in Firestore:', error);
    alert('Error creating game. Please check Firebase initialization.');
  });
});
