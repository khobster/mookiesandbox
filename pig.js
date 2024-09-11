let playersData = [];
let player1Progress = '';
let player2Progress = '';
let currentPlayer = 'player1';
let currentQuestion = '';
let gameID = null;

document.addEventListener('DOMContentLoaded', () => {
  gameID = getGameID(); // Either generate or get from URL
  loadPlayersData().then(() => loadGameData(gameID)); // Load players from JSON and then game data

  const submitButton = document.getElementById('submitBtn');
  const guessInput = document.getElementById('collegeGuess');
  const goFishButton = document.getElementById('goFishBtn');
  const decadeDropdown = document.getElementById('decadeDropdown');

  if (submitButton && guessInput) {
    submitButton.addEventListener('click', () => {
      const userGuess = guessInput.value.trim().toLowerCase();
      processGuess(userGuess);
    });
  }

  if (goFishButton) {
    goFishButton.addEventListener('click', () => {
      document.getElementById('decadeDropdownContainer').style.display = 'block';
    });
  }

  if (decadeDropdown) {
    decadeDropdown.addEventListener('change', (event) => {
      const selectedDecade = event.target.value;
      if (selectedDecade) {
        displayPlayerFromDecade(selectedDecade);
        document.getElementById('decadeDropdownContainer').style.display = 'none';
      }
    });
  }

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

// Load player data from JSON
async function loadPlayersData() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json');
    playersData = await response.json();
  } catch (error) {
    console.error('Error loading player data:', error);
  }
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
    currentQuestion: currentQuestion.name
  });
  displayPlayer(currentQuestion); // Display the random player
}

// Process the current player's guess
async function processGuess(guess) {
  const gameDoc = await db.collection("games").doc(gameID).get();
  const gameData = gameDoc.data();
  const correctAnswer = currentQuestion.college.toLowerCase(); // Get the correct answer from player data

  if (guess === correctAnswer) {
    gameData[currentPlayer].lastAnswer = 'correct';
  } else {
    gameData[currentPlayer].lastAnswer = 'incorrect';
    gameData[currentPlayer].progress += 'P'; // Add a letter for wrong answer
  }

  gameData.currentTurn = currentPlayer === 'player1' ? 'player2' : 'player1';
  currentQuestion = getRandomPlayer(); // Get a new player for the next turn
  gameData.currentQuestion = currentQuestion.name;

  await db.collection("games").doc(gameID).set(gameData);
  document.getElementById('collegeGuess').value = ''; // Clear input
  displayPlayer(currentQuestion); // Display the new random player
}

// Get a random player from the JSON
function getRandomPlayer() {
  const randomIndex = Math.floor(Math.random() * playersData.length);
  return playersData[randomIndex];
}

// Display the player data including image and question
function displayPlayer(player) {
  document.getElementById('playerName').textContent = player.name;
  document.getElementById('playerQuestion').textContent = `Where did ${player.name} go to college?`;
  const playerImageElement = document.getElementById('playerImage');
  playerImageElement.src = player.image_url || 'placeholder.png'; // Fallback to placeholder if no image available
  playerImageElement.onerror = function() {
    playerImageElement.src = 'placeholder.png'; // Set placeholder if image fails to load
  };
}

// Display a player from a specific decade selected from dropdown
function displayPlayerFromDecade(decade) {
  const filteredPlayers = playersData.filter(player => player.decade === decade);
  if (filteredPlayers.length > 0) {
    const randomPlayer = filteredPlayers[Math.floor(Math.random() * filteredPlayers.length)];
    displayPlayer(randomPlayer);
  } else {
    document.getElementById('playerQuestion').textContent = `No players found from the ${decade}`;
  }
}

// Update the UI based on game data
function updateGameUI(gameData) {
  currentPlayer = gameData.currentTurn;
  document.getElementById('player1Progress').textContent = `Player 1: ${gameData.player1.progress}`;
  document.getElementById('player2Progress').textContent = `Player 2: ${gameData.player2.progress}`;
  document.getElementById('playerQuestion').textContent = `Where did ${gameData.currentQuestion} go to college?`;

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

// Reset the game
function resetGame() {
  db.collection("games").doc(gameID).delete().then(() => {
    window.location.reload();
  });
}
