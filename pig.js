let player1Progress = '';
let player2Progress = '';
let currentPlayer = 'player1';
let currentQuestion = '';
let gameID = null;

document.addEventListener('DOMContentLoaded', () => {
  gameID = getGameID(); // Either generate or get from URL
  loadGameData(gameID);

  const submitButton = document.getElementById('submitAnswer');
  const guessInput = document.getElementById('guessInput');

  submitButton.addEventListener('click', () => {
    const userGuess = guessInput.value.trim().toLowerCase();
    processGuess(userGuess);
  });

  // Real-time updates for the game
  db.collection("games").doc(gameID).onSnapshot((doc) => {
    const gameData = doc.data();
    updateGameUI(gameData);
  });
});

// Get the gameID from the URL or create a new one
function getGameID() {
  const urlParams = new URLSearchParams(window.location.search);
  let gameID = urlParams.get('gameID');
  if (!gameID) {
    gameID = generateGameID();
    window.location.search = `?gameID=${gameID}`;
  }
  return gameID;
}

function generateGameID() {
  return Math.random().toString(36).substring(7);
}

// Load the game data from Firebase
async function loadGameData(gameID) {
  const gameDoc = await db.collection("games").doc(gameID).get();
  if (gameDoc.exists) {
    updateGameUI(gameDoc.data());
  } else {
    initializeNewGame(gameID);
  }
}

// Initialize a new game
async function initializeNewGame(gameID) {
  currentQuestion = getRandomPlayer();
  await db.collection("games").doc(gameID).set({
    player1: { progress: '', lastAnswer: '' },
    player2: { progress: '', lastAnswer: '' },
    currentTurn: 'player1',
    currentQuestion: currentQuestion
  });
}

// Process the current player's guess
async function processGuess(guess) {
  const gameDoc = await db.collection("games").doc(gameID).get();
  const gameData = gameDoc.data();
  const correctAnswer = 'duke'; // Example correct answer, replace with real player data

  if (guess === correctAnswer) {
    gameData[currentPlayer].lastAnswer = 'correct';
  } else {
    gameData[currentPlayer].lastAnswer = 'incorrect';
    gameData[currentPlayer].progress += 'P'; // Add a letter for wrong answer
  }

  gameData.currentTurn = currentPlayer === 'player1' ? 'player2' : 'player1';
  gameData.currentQuestion = getRandomPlayer(); // Get a new player for the next turn

  await db.collection("games").doc(gameID).set(gameData);
  document.getElementById('guessInput').value = ''; // Clear input
}

// Get a random player for the trivia question (replace with your actual logic)
function getRandomPlayer() {
  return 'Grant Hill'; // Replace with real random player logic
}

// Update the UI based on game data
function updateGameUI(gameData) {
  currentPlayer = gameData.currentTurn;
  document.getElementById('player1Progress').textContent = `Player 1: ${gameData.player1.progress}`;
  document.getElementById('player2Progress').textContent = `Player 2: ${gameData.player2.progress}`;
  document.getElementById('currentQuestion').textContent = `Where did ${gameData.currentQuestion} go to college?`;

  if (currentPlayer === 'player1') {
    document.getElementById('turnIndicator').textContent = "Player 1's turn";
  } else {
    document.getElementById('turnIndicator').textContent = "Player 2's turn";
  }

  checkForWinner(gameData);
}

// Check if any player has spelled "PIG"
function checkForWinner(gameData) {
  if (gameData.player1.progress === 'PIG') {
    alert('Player 2 wins!');
    resetGame();
  } else if (gameData.player2.progress === 'PIG') {
    alert('Player 1 wins!');
    resetGame();
  }
}

// Reset the game (optional logic here to reset)
function resetGame() {
  db.collection("games").doc(gameID).delete().then(() => {
    window.location.reload();
  });
}
