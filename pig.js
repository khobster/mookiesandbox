const firebaseConfig = {
  apiKey: "AIzaSyDicI1nKcrMDaaYkL_8q70yj1mM05tW5Ak",
  authDomain: "mookie-pig-challenge.firebaseapp.com",
  projectId: "mookie-pig-challenge",
  storageBucket: "mookie-pig-challenge.appspot.com",
  messagingSenderId: "96530997300",
  appId: "1:96530997300:web:96400cf87b98c8e19eaa61",
  measurementId: "G-NJQ84VFPYK"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let gameId;
let currentPlayer;
let playersData = [];
let cumulativeRarityScore = 0;

// DOM Elements
const newGameBtn = document.getElementById('newGameBtn');
const setupArea = document.getElementById('setupArea');
const gameArea = document.getElementById('gameArea');
const gameUrlInput = document.getElementById('gameUrlInput');
const shareLinkDiv = document.getElementById('shareLink');
const player1SubmitBtn = document.getElementById('player1Submit');
const player2SubmitBtn = document.getElementById('player2Submit');

// Event Listener for starting a new game
newGameBtn.addEventListener('click', createNewGame);

// Load players data
function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            playersData.sort((a, b) => a.rarity_score - b.rarity_score);
            const urlParams = new URLSearchParams(window.location.search);
            const gameIdFromUrl = urlParams.get('gameId');
            if (gameIdFromUrl) {
                setupGame(gameIdFromUrl);
            }
        })
        .catch(error => {
            console.error('Error loading JSON:', error);
            document.getElementById('currentQuestion').textContent = 'Error loading player data.';
        });
}

// Function to create a new game
function createNewGame() {
    db.collection('pigGames').add({
        currentPlayer: 1,
        player1Progress: '',
        player2Progress: '',
        currentQuestion: '',
        correctAnswer: '',
        player1Answered: false,
        player2Answered: false,
        player1Guess: '',
        player2Guess: '',
        gameStatus: 'waiting',
        cumulativeRarityScore: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(docRef => {
        gameId = docRef.id;
        const shareableUrl = `${window.location.origin}/pig.html?gameId=${gameId}`;
        
        // Display the shareable link
        gameUrlInput.value = shareableUrl;
        shareLinkDiv.style.display = 'block';
        
        // Hide the "Start New Game" button
        newGameBtn.style.display = 'none';
        
        // Add event listener for the "Start Game" button
        const startGameBtn = document.createElement('button');
        startGameBtn.textContent = 'Start Game';
        startGameBtn.addEventListener('click', () => {
            setupGame(gameId);
        });
        setupArea.appendChild(startGameBtn);
    }).catch(error => console.error("Error creating game:", error));
}

// Function to setup the game
function setupGame(id) {
    gameId = id;
    setupArea.style.display = 'none';
    gameArea.style.display = 'block';

    // Listen for updates to the game document in Firestore
    db.collection('pigGames').doc(gameId)
        .onSnapshot(doc => {
            if (doc.exists) {
                updateGameState(doc.data());
            } else {
                console.error("Game not found");
                alert("Game not found. Returning to the main page.");
                window.location.href = 'index.html';
            }
        }, error => {
            console.error("Error listening to game updates:", error);
        });
    
    // Initialize the game state
    startNewRound();
}

// Function to update the game state
function updateGameState(gameData) {
    currentPlayer = gameData.currentPlayer;
    document.getElementById('currentPlayer').textContent = `Current Turn: Player ${currentPlayer}`;
    document.getElementById('player1Progress').textContent = gameData.player1Progress;
    document.getElementById('player2Progress').textContent = gameData.player2Progress;
    document.getElementById('currentQuestion').textContent = gameData.currentQuestion || "Waiting for question...";
    document.getElementById('cumulativeRarityScore').textContent = `Score: ${Math.round(gameData.cumulativeRarityScore)}`;
    
    // Enable/disable submit buttons based on whether the player has answered
    player1SubmitBtn.disabled = gameData.player1Answered;
    player2SubmitBtn.disabled = gameData.player2Answered;

    // Check if both players have answered and start a new round if needed
    if (gameData.player1Answered && gameData.player2Answered) {
        setTimeout(startNewRound, 2000); // Wait 2 seconds before starting a new round
    }
}

function startNewRound() {
    const selectedPlayer = selectPlayerByRarity();
    
    db.collection('pigGames').doc(gameId).update({
        currentQuestion: selectedPlayer.name,
        correctAnswer: selectedPlayer.college,
        player1Answered: false,
        player2Answered: false,
        player1Guess: '',
        player2Guess: '',
        currentPlayer: 1 // Reset to player 1 for each new question
    }).catch(error => console.error("Error starting new round:", error));
}

// Function to select a player based on rarity score
function selectPlayerByRarity() {
    const totalRarity = playersData.reduce((sum, player) => sum + player.rarity_score, 0);
    let randomValue = Math.random() * totalRarity;
    
    for (let player of playersData) {
        randomValue -= player.rarity_score;
        if (randomValue <= 0) {
            return player;
        }
    }
    
    return playersData[playersData.length - 1]; // Fallback to last player if something goes wrong
}

// Function to handle player guesses
player1SubmitBtn.addEventListener('click', () => submitGuess(1));
player2SubmitBtn.addEventListener('click', () => submitGuess(2));

function submitGuess(playerNum) {
    const guessInput = document.getElementById(`player${playerNum}Input`);
    const guess = guessInput.value.trim().toLowerCase();

    db.collection('pigGames').doc(gameId).get().then(doc => {
        const gameData = doc.data();
        updateGameAfterGuess(playerNum, guess, gameData);
        guessInput.value = '';
    });
}

function updateGameAfterGuess(playerNum, guess, gameData) {
    let updates = {
        [`player${playerNum}Answered`]: true,
        [`player${playerNum}Guess`]: guess,
        currentPlayer: playerNum === 1 ? 2 : 1
    };

    const isCorrect = isCloseMatch(guess, gameData.correctAnswer);

    if (gameData.player1Answered && playerNum === 2) {
        // Both players have answered, evaluate the round
        const player1Correct = isCloseMatch(gameData.player1Guess, gameData.correctAnswer);
        const player2Correct = isCloseMatch(guess, gameData.correctAnswer);

        if (!player1Correct && player2Correct) {
            updates.player1Progress = getNextLetter(gameData.player1Progress);
        } else if (player1Correct && !player2Correct) {
            updates.player2Progress = getNextLetter(gameData.player2Progress);
        }

        // Update cumulative rarity score
        if (player1Correct || player2Correct) {
            const player = playersData.find(p => p.name === gameData.currentQuestion);
            if (player) {
                cumulativeRarityScore += player.rarity_score;
                updates.cumulativeRarityScore = cumulativeRarityScore;
            }
        }

        // Check for game end
        if (updates.player1Progress === 'PIG' || updates.player2Progress === 'PIG') {
            updates.gameStatus = 'ended';
            updates.winner = updates.player1Progress === 'PIG' ? 2 : 1;
        }
    }

    db.collection('pigGames').doc(gameId).update(updates).then(() => {
        if (updates.gameStatus === 'ended') {
            alert(`Game Over! Player ${updates.winner} wins!`);
        } else if (isCorrect) {
            // If the guess was correct, start a new round
            setTimeout(startNewRound, 1000);
        }
    });
}

function isCloseMatch(guess, answer) {
    guess = guess.toLowerCase().trim();
    answer = answer.toLowerCase().trim();
    return answer.includes(guess) || guess.includes(answer);
}

function getNextLetter(progress) {
    if (!progress.includes('P')) return 'P';
    if (!progress.includes('I')) return 'I';
    return 'PIG';
}

// Function to copy the game URL to clipboard
function copyGameUrl() {
    gameUrlInput.select();
    document.execCommand('copy');
    alert('Game URL copied to clipboard!');
}

// Autocomplete functionality
function showSuggestions(input) {
    const suggestionsContainer = document.getElementById('suggestions');
    if (suggestionsContainer) {
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
                const collegeGuess = document.getElementById('collegeGuess');
                if (collegeGuess) {
                    collegeGuess.value = suggestion;
                }
                suggestionsContainer.innerHTML = '';
            });
            suggestionsContainer.appendChild(suggestionItem);
        });
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();

    const collegeGuess = document.getElementById('collegeGuess');
    if (collegeGuess) {
        collegeGuess.addEventListener('input', (e) => {
            showSuggestions(e.target.value);
        });
    }

    // Other event listeners can be added here if needed
});

// Check if there's a gameId in the URL when the page loads
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdFromUrl = urlParams.get('gameId');
    if (gameIdFromUrl) {
        setupGame(gameIdFromUrl);
    }
};
