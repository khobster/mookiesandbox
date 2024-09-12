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
const shareInfo = document.getElementById('shareInfo');
const gameArea = document.getElementById('gameArea');
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
    })
    .catch(error => console.error('Error loading players data:', error));

// Check for existing game ID in URL on page load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    gameId = urlParams.get('gameId');
    if (gameId) {
        setupGame(gameId);
    } else {
        console.error("No gameId found in URL");
        alert("No game ID found. Please start a new game from the main page.");
        window.location.href = 'https://www.mookie.click';
    }
});

function setupGame(id) {
    gameId = id;
    console.log("Setting up game with ID:", gameId);
    
    const gameUrl = `${window.location.origin}${window.location.pathname}?gameId=${gameId}`;
    const gameUrlInput = document.getElementById('gameUrlInput');
    if (gameUrlInput) gameUrlInput.value = gameUrl;
    
    if (shareInfo) shareInfo.style.display = 'block';
    if (gameArea) gameArea.style.display = 'block';
    
    db.collection('pigGames').doc(gameId).get().then(doc => {
        if (doc.exists) {
            console.log("Game data found:", doc.data());
            updateGameState(doc.data());
            setupRealtimeListener();
        } else {
            console.error("Game not found");
            alert("Game not found. Please check the URL or create a new game.");
            window.location.href = 'https://www.mookie.click';
        }
    }).catch(error => {
        console.error("Error getting game:", error);
    });
}

function setupRealtimeListener() {
    db.collection('pigGames').doc(gameId)
        .onSnapshot(doc => {
            if (doc.exists) {
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
    currentPlayer = gameData.currentPlayer;
    if (currentPlayerEl) currentPlayerEl.textContent = `Current Turn: Player ${currentPlayer}`;
    if (player1ProgressEl) player1ProgressEl.textContent = gameData.player1Progress;
    if (player2ProgressEl) player2ProgressEl.textContent = gameData.player2Progress;
    if (currentQuestionEl) currentQuestionEl.textContent = gameData.currentQuestion || "Waiting for question...";

    if (gameData.gameStatus === 'waiting' && gameData.player1Progress === '' && gameData.player2Progress === '') {
        startNewRound();
    }
}

// ... [rest of the functions remain the same]

function copyGameUrl() {
    const gameUrlInput = document.getElementById('gameUrlInput');
    if (gameUrlInput) {
        gameUrlInput.select();
        document.execCommand('copy');
        alert('Game link copied to clipboard!');
    }
}
