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
const joinGameBtn = document.getElementById('joinGameBtn');
const gameIdInput = document.getElementById('gameIdInput');
const shareInfo = document.getElementById('shareInfo');
const joinGameArea = document.getElementById('joinGame');
const gameArea = document.getElementById('gameArea');
const currentQuestionEl = document.getElementById('currentQuestion');
const currentPlayerEl = document.getElementById('currentPlayer');
const player1ProgressEl = document.getElementById('player1Progress');
const player2ProgressEl = document.getElementById('player2Progress');
const player1SubmitBtn = document.getElementById('player1Submit');
const player2SubmitBtn = document.getElementById('player2Submit');
const resultEl = document.getElementById('result');

// Event Listeners
if (joinGameBtn) joinGameBtn.addEventListener('click', joinExistingGame);
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
        createNewGame();
    }
});

function createNewGame() {
    console.log("Creating a new PIG game...");
    db.collection('pigGames').add({
        currentPlayer: 1,
        player1Progress: '',
        player2Progress: '',
        currentQuestion: '',
        gameStatus: 'waiting',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then((docRef) => {
        console.log('New game created with ID:', docRef.id);
        gameId = docRef.id;
        setupGame(gameId);
    })
    .catch((error) => {
        console.error('Error creating game:', error);
        alert('There was an error creating the game. Please try again.');
    });
}

function setupGame(id) {
    gameId = id;
    const gameUrl = `${window.location.origin}${window.location.pathname}?gameId=${gameId}`;
    document.getElementById('gameUrlInput').value = gameUrl;
    shareInfo.style.display = 'block';
    gameArea.style.display = 'block';
    if (joinGameArea) joinGameArea.style.display = 'none';
    
    db.collection('pigGames').doc(gameId)
        .onSnapshot(doc => {
            if (doc.exists) {
                updateGameState(doc.data());
            } else {
                console.error("Game not found");
                alert("Game not found. Please check the URL or create a new game.");
                window.location.href = 'https://www.mookie.click';
            }
        }, error => {
            console.error("Error listening to game updates:", error);
        });
}

function joinExistingGame() {
    const inputGameId = gameIdInput.value.trim();
    if (inputGameId) {
        setupGame(inputGameId);
    } else {
        alert("Please enter a valid Game ID.");
    }
}

// ... [rest of the functions remain the same]

function copyGameUrl() {
    const gameUrlInput = document.getElementById('gameUrlInput');
    gameUrlInput.select();
    document.execCommand('copy');
    alert('Game link copied to clipboard!');
}
