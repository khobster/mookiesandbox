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

// DOM Elements
const gameUrlInput = document.getElementById('gameUrlInput');
const currentQuestionEl = document.getElementById('currentQuestion');
const currentPlayerEl = document.getElementById('currentPlayer');
const player1ProgressEl = document.getElementById('player1Progress');
const player2ProgressEl = document.getElementById('player2Progress');
const player1SubmitBtn = document.getElementById('player1Submit');
const player2SubmitBtn = document.getElementById('player2Submit');
const resultEl = document.getElementById('result');

// Event Listeners
if (player1SubmitBtn) player1SubmitBtn.addEventListener('click', () => submitGuess(1));
if (player2SubmitBtn) player2SubmitBtn.addEventListener('click', () => submitGuess(2));

// Load players data
fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
    .then(response => response.json())
    .then(data => {
        playersData = data;
        console.log('Players data loaded successfully');
    })
    .catch(error => console.error('Error loading players data:', error));

// Initialize game on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    gameId = localStorage.getItem('pigGameId');
    console.log('Game ID from localStorage:', gameId);
    if (gameId) {
        setupGame(gameId);
    } else {
        console.error("No game ID found in localStorage");
        alert("No game ID found. Please start a new game from the main page.");
        window.location.href = 'https://www.mookie.click';
    }
});

function setupGame(id) {
    gameId = id;
    console.log('Setting up game with ID:', gameId);
    const gameUrl = `${window.location.origin}${window.location.pathname}?gameId=${gameId}`;
    if (gameUrlInput) {
        gameUrlInput.value = gameUrl;
        console.log('Game URL set in input field');
    } else {
        console.error('gameUrlInput element not found');
    }
    
    db.collection('pigGames').doc(gameId).get()
        .then(doc => {
            if (doc.exists) {
                console.log('Game data found:', doc.data());
                updateGameState(doc.data());
                setupRealtimeListener();
            } else {
                console.error('Game not found in Firestore');
                alert("Game not found. Please check the URL or create a new game.");
                window.location.href = 'https://www.mookie.click';
            }
        })
        .catch(error => {
            console.error('Error getting game:', error);
            alert("Error retrieving game data. Please try again.");
        });
}

function setupRealtimeListener() {
    console.log('Setting up realtime listener for game:', gameId);
    db.collection('pigGames').doc(gameId)
        .onSnapshot(doc => {
            if (doc.exists) {
                console.log('Realtime update received:', doc.data());
                updateGameState(doc.data());
            } else {
                console.error("Game no longer exists");
                alert("This game has been deleted or does not exist.");
                window.location.href = 'https://www.mookie.click';
            }
        }, error => {
            console.error("Error listening to game updates:", error);
        });
}

function updateGameState(gameData) {
    console.log('Updating game state:', gameData);
    currentPlayer = gameData.currentPlayer;
    if (currentPlayerEl) currentPlayerEl.textContent = `Current Turn: Player ${currentPlayer}`;
    if (player1ProgressEl) player1ProgressEl.textContent = gameData.player1Progress;
    if (player2ProgressEl) player2ProgressEl.textContent = gameData.player2Progress;
    if (currentQuestionEl) currentQuestionEl.textContent = gameData.currentQuestion || "Waiting for question...";

    if (gameData.gameStatus === 'waiting' && gameData.player1Progress === '' && gameData.player2Progress === '') {
        startNewRound();
    }
}

function startNewRound() {
    console.log('Starting new round');
    if (playersData.length > 0) {
        const randomPlayer = playersData[Math.floor(Math.random() * playersData.length)];
        const question = `Where did ${randomPlayer.name} go to college?`;
        db.collection('pigGames').doc(gameId).update({
            currentQuestion: question,
            correctAnswer: randomPlayer.college || 'No College',
            gameStatus: 'active'
        }).then(() => {
            console.log('New round started with question:', question);
        }).catch(error => {
            console.error('Error starting new round:', error);
        });
    } else {
        console.error('No player data available');
    }
}

function submitGuess(playerNum) {
    console.log(`Player ${playerNum} submitting guess`);
    if (currentPlayer !== playerNum) {
        alert("It's not your turn!");
        return;
    }

    const guessInput = document.getElementById(`player${playerNum}Input`);
    const guess = guessInput.value.trim().toLowerCase();
    
    db.collection('pigGames').doc(gameId).get().then(doc => {
        const gameData = doc.data();
        const isCorrect = isCloseMatch(guess, gameData.correctAnswer);
        console.log(`Guess: ${guess}, Correct Answer: ${gameData.correctAnswer}, Is Correct: ${isCorrect}`);
        
        updateGameAfterGuess(playerNum, isCorrect, gameData);
        guessInput.value = '';
    }).catch(error => {
        console.error('Error submitting guess:', error);
    });
}

function isCloseMatch(guess, answer) {
    answer = answer.toLowerCase();
    if (answer === '' && ['no college', 'didnt go to college'].includes(guess)) return true;
    return answer.includes(guess);
}

function updateGameAfterGuess(playerNum, isCorrect, gameData) {
    console.log(`Updating game after guess: Player ${playerNum}, Correct: ${isCorrect}`);
    let updates = {
        currentPlayer: playerNum === 1 ? 2 : 1
    };

    if (!isCorrect) {
        const progressKey = `player${playerNum}Progress`;
        const newProgress = getNextLetter(gameData[progressKey]);
        updates[progressKey] = newProgress;

        if (newProgress === 'PIG') {
            updates.gameStatus = 'ended';
            updates.winner = playerNum === 1 ? 2 : 1;
        }
    }

    db.collection('pigGames').doc(gameId).update(updates).then(() => {
        console.log('Game updated after guess:', updates);
        if (updates.gameStatus === 'ended') {
            alert(`Game Over! Player ${updates.winner} wins!`);
        } else if (isCorrect) {
            startNewRound();
        }
    }).catch(error => {
        console.error('Error updating game after guess:', error);
    });
}

function getNextLetter(progress) {
    if (!progress.includes('P')) return 'P';
    if (!progress.includes('I')) return 'I';
    return 'PIG';
}

function copyGameUrl() {
    if (gameUrlInput) {
        gameUrlInput.select();
        document.execCommand('copy');
        alert('Game link copied to clipboard!');
    } else {
        console.error('gameUrlInput element not found');
    }
}
