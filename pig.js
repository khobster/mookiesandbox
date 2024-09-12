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
const setupArea = document.getElementById('setupArea');
const gameArea = document.getElementById('gameArea');
const gameUrlInput = document.getElementById('gameUrlInput');
const shareLinkDiv = document.getElementById('shareLink');
const player1SubmitBtn = document.getElementById('player1Submit');
const player2SubmitBtn = document.getElementById('player2Submit');

// Event Listener for starting a new game
newGameBtn.addEventListener('click', createNewGame);

// Load players data
fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
    .then(response => response.json())
    .then(data => {
        playersData = data;
    })
    .catch(error => console.error('Error loading players data:', error));

// Function to create a new game
function createNewGame() {
    db.collection('pigGames').add({
        currentPlayer: 1,
        player1Progress: '',
        player2Progress: '',
        currentQuestion: '',
        gameStatus: 'waiting',
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
}

// Function to start a new round
function startNewRound() {
    // Select a random question from your playersData
    const randomIndex = Math.floor(Math.random() * playersData.length);
    const selectedPlayer = playersData[randomIndex];
    
    db.collection('pigGames').doc(gameId).update({
        currentQuestion: selectedPlayer.name,
        correctAnswer: selectedPlayer.college
    }).catch(error => console.error("Error starting new round:", error));
}

// Function to handle player guesses
player1SubmitBtn.addEventListener('click', () => submitGuess(1));
player2SubmitBtn.addEventListener('click', () => submitGuess(2));

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
    return answer.includes(guess);
}

function updateGameAfterGuess(playerNum, isCorrect, gameData) {
    let updates = { currentPlayer: playerNum === 1 ? 2 : 1 };
    
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

// Function to copy the game URL to clipboard
function copyGameUrl() {
    gameUrlInput.select();
    document.execCommand('copy');
    alert('Game URL copied to clipboard!');
}

// Check if there's a gameId in the URL when the page loads
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdFromUrl = urlParams.get('gameId');
    if (gameIdFromUrl) {
        setupGame(gameIdFromUrl);
    }
};
