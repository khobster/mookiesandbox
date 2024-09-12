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
const newGameBtn = document.getElementById('newGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const gameIdInput = document.getElementById('gameIdInput');
const setupArea = document.getElementById('setupArea');
const gameArea = document.getElementById('gameArea');
const currentQuestionEl = document.getElementById('currentQuestion');
const currentPlayerEl = document.getElementById('currentPlayer');
const player1ProgressEl = document.getElementById('player1Progress');
const player2ProgressEl = document.getElementById('player2Progress');
const player1SubmitBtn = document.getElementById('player1Submit');
const player2SubmitBtn = document.getElementById('player2Submit');
const resultEl = document.getElementById('result');

// Event Listeners
newGameBtn.addEventListener('click', createNewGame);
joinGameBtn.addEventListener('click', joinGame);
player1SubmitBtn.addEventListener('click', () => submitGuess(1));
player2SubmitBtn.addEventListener('click', () => submitGuess(2));

// Load players data
fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
    .then(response => response.json())
    .then(data => {
        playersData = data;
    })
    .catch(error => console.error('Error loading players data:', error));

function createNewGame() {
    console.log("Attempting to create a new game...");
    db.collection('pigGames').add({
        currentPlayer: 1,
        player1Progress: '',
        player2Progress: '',
        currentQuestion: '',
        gameStatus: 'waiting'
    }).then(docRef => {
        console.log("Game created successfully with ID:", docRef.id);
        gameId = docRef.id;
        const gameUrl = `${window.location.origin}${window.location.pathname}?gameId=${gameId}`;
        
        // Update URL without reloading the page
        window.history.pushState({}, '', gameUrl);
        
        // Display game ID and URL for sharing
        const shareInfo = `
            <h3>Game created!</h3>
            <p>Share this link with your friend:</p>
            <input type="text" value="${gameUrl}" id="gameUrlInput" readonly>
            <button onclick="copyGameUrl()">Copy Link</button>
        `;
        document.getElementById('shareInfo').innerHTML = shareInfo;
        document.getElementById('shareInfo').style.display = 'block';
        
        setupGame(gameId);
    }).catch(error => {
        console.error("Error creating game:", error);
        console.error("Error details:", error.code, error.message);
        alert("Error creating game. Please check console for details.");
    });
}

function joinGame() {
    const urlParams = new URLSearchParams(window.location.search);
    gameId = urlParams.get('gameId');
    
    if (!gameId) {
        gameId = gameIdInput.value.trim();
    }
    
    if (gameId) {
        setupGame(gameId);
    } else {
        alert("Please enter a valid Game ID or use a valid game link.");
    }
}

function setupGame(id) {
    gameId = id;
    setupArea.style.display = 'none';
    gameArea.style.display = 'block';
    
    db.collection('pigGames').doc(gameId)
        .onSnapshot(doc => {
            if (doc.exists) {
                updateGameState(doc.data());
            } else {
                console.error("Game not found");
                alert("Game not found. Returning to setup.");
                resetGame();
            }
        }, error => {
            console.error("Error listening to game updates:", error);
        });
}

function updateGameState(gameData) {
    currentPlayer = gameData.currentPlayer;
    currentPlayerEl.textContent = `Current Turn: Player ${currentPlayer}`;
    player1ProgressEl.textContent = gameData.player1Progress;
    player2ProgressEl.textContent = gameData.player2Progress;
    currentQuestionEl.textContent = gameData.currentQuestion || "Waiting for question...";

    if (gameData.gameStatus === 'waiting' && gameData.player1Progress === '' && gameData.player2Progress === '') {
        startNewRound();
    }
}

function startNewRound() {
    if (playersData.length > 0) {
        const randomPlayer = playersData[Math.floor(Math.random() * playersData.length)];
        const question = `Where did ${randomPlayer.name} go to college?`;
        db.collection('pigGames').doc(gameId).update({
            currentQuestion: question,
            correctAnswer: randomPlayer.college || 'No College',
            gameStatus: 'active'
        });
    }
}

function submitGuess(playerNum) {
    if (currentPlayer !== playerNum) {
        alert("It's not your turn!");
        return;
    }

    const guessInput = document.getElementById(`player${playerNum}Input`);
    const guess = guessInput.value.trim().toLowerCase();
    
    db.collection('pigGames').doc(gameId).get().then(doc => {
        const gameData = doc.data();
        const isCorrect = isCloseMatch(guess, gameData.correctAnswer);
        
        updateGameAfterGuess(playerNum, isCorrect, gameData);
        guessInput.value = '';
    });
}

function isCloseMatch(guess, answer) {
    answer = answer.toLowerCase();
    if (answer === '' && ['no college', 'didnt go to college'].includes(guess)) return true;
    return answer.includes(guess);
}

function updateGameAfterGuess(playerNum, isCorrect, gameData) {
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
        if (updates.gameStatus === 'ended') {
            alert(`Game Over! Player ${updates.winner} wins!`);
            resetGame();
        } else if (isCorrect) {
            startNewRound();
        }
    });
}

function getNextLetter(progress) {
    if (!progress.includes('P')) return 'P';
    if (!progress.includes('I')) return 'I';
    return 'PIG';
}

function resetGame() {
    setupArea.style.display = 'block';
    gameArea.style.display = 'none';
    gameIdInput.value = '';
}

function copyGameUrl() {
    const gameUrlInput = document.getElementById('gameUrlInput');
    gameUrlInput.select();
    document.execCommand('copy');
    alert('Game link copied to clipboard!');
}

// Check for existing game ID in URL on page load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlGameId = urlParams.get('gameId');
    if (urlGameId) {
        gameId = urlGameId;
        setupGame(gameId);
    }
});
