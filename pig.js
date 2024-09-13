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
    console.log("Loading players data...");
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            console.log("Players data loaded successfully. Count:", data.length);
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
    console.log("Creating new game...");
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
        console.log("New game created with ID:", docRef.id);
        gameId = docRef.id;
        const shareableUrl = `${window.location.origin}/pig.html?gameId=${gameId}`;
        
        gameUrlInput.value = shareableUrl;
        shareLinkDiv.style.display = 'block';
        
        newGameBtn.style.display = 'none';
        
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
    console.log("Setting up game with ID:", id);
    gameId = id;
    setupArea.style.display = 'none';
    gameArea.style.display = 'block';

    db.collection('pigGames').doc(gameId)
        .onSnapshot(doc => {
            if (doc.exists) {
                console.log("Game state updated:", doc.data());
                updateGameState(doc.data());
            } else {
                console.error("Game not found");
                alert("Game not found. Returning to the main page.");
                window.location.href = 'index.html';
            }
        }, error => {
            console.error("Error listening to game updates:", error);
        });
    
    startNewRound();
}

// Function to update the game state
function updateGameState(gameData) {
    console.log("Updating game state:", gameData);
    currentPlayer = gameData.currentPlayer;
    document.getElementById('currentPlayer').textContent = `Current Turn: Player ${currentPlayer}`;
    document.getElementById('player1Progress').textContent = gameData.player1Progress;
    document.getElementById('player2Progress').textContent = gameData.player2Progress;
    document.getElementById('currentQuestion').textContent = gameData.currentQuestion || "Waiting for question...";
    document.getElementById('cumulativeRarityScore').textContent = `Score: ${Math.round(gameData.cumulativeRarityScore)}`;
    
    player1SubmitBtn.disabled = gameData.player1Answered;
    player2SubmitBtn.disabled = gameData.player2Answered;

    if (gameData.player1Answered && gameData.player2Answered) {
        console.log("Both players have answered. Starting new round in 2 seconds.");
        setTimeout(startNewRound, 2000);
    }
}

function startNewRound() {
    console.log("Starting new round");
    const selectedPlayer = selectPlayerByRarity();
    console.log("Selected player:", selectedPlayer.name);
    
    db.collection('pigGames').doc(gameId).update({
        currentQuestion: selectedPlayer.name,
        correctAnswer: selectedPlayer.college,
        player1Answered: false,
        player2Answered: false,
        player1Guess: '',
        player2Guess: '',
        currentPlayer: 1
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
    
    return playersData[playersData.length - 1];
}

// Function to handle player guesses
player1SubmitBtn.addEventListener('click', () => submitGuess(1));
player2SubmitBtn.addEventListener('click', () => submitGuess(2));

function submitGuess(playerNum) {
    console.log("Submitting guess for Player", playerNum);
    const guessInput = document.getElementById(`player${playerNum}Input`);
    const guess = guessInput.value.trim().toLowerCase();

    db.collection('pigGames').doc(gameId).get().then(doc => {
        const gameData = doc.data();
        updateGameAfterGuess(playerNum, guess, gameData);
        guessInput.value = '';
    });
}

function updateGameAfterGuess(playerNum, guess, gameData) {
    console.log(`Updating game after guess. Player: ${playerNum}, Guess: ${guess}`);
    let updates = {
        [`player${playerNum}Answered`]: true,
        [`player${playerNum}Guess`]: guess,
        currentPlayer: playerNum === 1 ? 2 : 1
    };

    const isCorrect = isCloseMatch(guess, gameData.correctAnswer);
    console.log(`Guess is correct: ${isCorrect}`);

    if (gameData.player1Answered && playerNum === 2) {
        console.log("Both players have answered. Evaluating round.");
        const player1Correct = isCloseMatch(gameData.player1Guess, gameData.correctAnswer);
        const player2Correct = isCloseMatch(guess, gameData.correctAnswer);

        if (!player1Correct && player2Correct) {
            updates.player1Progress = getNextLetter(gameData.player1Progress);
        } else if (player1Correct && !player2Correct) {
            updates.player2Progress = getNextLetter(gameData.player2Progress);
        }

        if (player1Correct || player2Correct) {
            const player = playersData.find(p => p.name === gameData.currentQuestion);
            if (player) {
                cumulativeRarityScore += player.rarity_score;
                updates.cumulativeRarityScore = cumulativeRarityScore;
                console.log(`Updated cumulative rarity score: ${cumulativeRarityScore}`);
            }
        }

        if (updates.player1Progress === 'PIG' || updates.player2Progress === 'PIG') {
            updates.gameStatus = 'ended';
            updates.winner = updates.player1Progress === 'PIG' ? 2 : 1;
            console.log(`Game ended. Winner: Player ${updates.winner}`);
        }
    }

    db.collection('pigGames').doc(gameId).update(updates).then(() => {
        if (updates.gameStatus === 'ended') {
            alert(`Game Over! Player ${updates.winner} wins!`);
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

function copyGameUrl() {
    gameUrlInput.select();
    document.execCommand('copy');
    alert('Game URL copied to clipboard!');
}

// Autocomplete functionality
function showSuggestions(input) {
    console.log("Showing suggestions for input:", input);
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
        console.log("Suggestions:", suggestions);
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
    console.log("DOM fully loaded. Initializing game...");
    loadPlayersData();

    const collegeGuess = document.getElementById('collegeGuess');
    if (collegeGuess) {
        collegeGuess.addEventListener('input', (e) => {
            showSuggestions(e.target.value);
        });
    }
});

// Check if there's a gameId in the URL when the page loads
window.onload = function() {
    console.log("Window loaded. Checking for gameId in URL...");
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdFromUrl = urlParams.get('gameId');
    if (gameIdFromUrl) {
        console.log("GameId found in URL:", gameIdFromUrl);
        setupGame(gameIdFromUrl);
    } else {
        console.log("No gameId found in URL. Ready for new game.");
    }
};
