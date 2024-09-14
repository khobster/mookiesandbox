const firebaseConfig = {
  apiKey: "AIzaSyDicI1nKcrMDaaYkL_8q70yj1mM05tW5Ak",
  authDomain: "mookie-pig-challenge.firebaseapp.com",
  projectId: "mookie-pig-challenge",
  storageBucket: "mookie-pig-challenge.appspot.com",
  messagingSenderId: "96530997300",
  appId: "1:96530997300:web:96400cf87b98c8e19eaa61",
  measurementId: "G-NJQ84VFPYK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let gameId;
let currentPlayer;
let playersData = [];
let currentQuestion;
let currentAnswer;
let playerId;
let scoreboard = { player1: '', player2: '' }; // Internal scoreboard

let newGameBtn, setupArea, gameArea, gameUrlInput, shareLinkDiv, startGameBtn;
let player1SubmitBtn, player2SubmitBtn;
let currentQuestionElement, playerImageElement;
let correctSound, wrongSound;

// Load players data
fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
  .then(response => response.json())
  .then(data => {
    playersData = data;
    playersData.sort((a, b) => a.rarity_score - b.rarity_score);
  })
  .catch(error => console.error('Error loading players data:', error));

function createNewGame() {
  playerId = generatePlayerId();
  const selectedPlayer = selectPlayerByDifficulty();

  db.collection('pigGames').add({
    player1Id: playerId,
    player2Id: null,
    currentQuestion: selectedPlayer.name,
    correctAnswer: selectedPlayer.college,
    player1Progress: '',
    player2Progress: '',
    player1Answered: false,
    player2Answered: false,
    player1Guess: '',
    player2Guess: '',
    currentPlayer: 1,
    gameStatus: 'waiting',
    winner: null
  })
  .then(docRef => {
    gameId = docRef.id;
    const gameUrl = `${window.location.origin}${window.location.pathname}?gameId=${gameId}`;
    if (gameUrlInput) gameUrlInput.value = gameUrl;
    if (shareLinkDiv) shareLinkDiv.style.display = 'block';

    if (startGameBtn) {
      startGameBtn.style.display = 'block';
    }

    if (newGameBtn) {
      newGameBtn.style.display = 'none';
    }

  })
  .catch(error => console.error("Error creating new game:", error));
}

function setupGame(id) {
  gameId = id;
  playerId = playerId || generatePlayerId();

  db.collection('pigGames').doc(gameId).get()
    .then(doc => {
      if (doc.exists) {
        const gameData = doc.data();
        if (!gameData.player2Id && playerId !== gameData.player1Id) {
          db.collection('pigGames').doc(gameId).update({
            player2Id: playerId,
            gameStatus: 'started'
          }).then(() => {
            startGameListener();
          });
        } else {
          startGameListener();
        }
      } else {
        alert("Game not found.");
      }
    })
    .catch(error => console.error("Error setting up game:", error));
}

function startGameListener() {
  if (setupArea) setupArea.style.display = 'none';
  if (gameArea) gameArea.style.display = 'block';

  db.collection('pigGames').doc(gameId)
    .onSnapshot(doc => {
      if (doc.exists) {
        updateGameState(doc.data());
      } else {
        alert("Game not found.");
      }
    }, error => {
      console.error("Error listening to game updates:", error);
    });
}

function updateGameState(gameData) {
  currentPlayer = gameData.currentPlayer;
  const isPlayer1 = playerId === gameData.player1Id;

  // Determine the labels for "You" and "Opponent"
  const isCurrentPlayer = (isPlayer1 && currentPlayer === 1) || (!isPlayer1 && currentPlayer === 2);

  let currentPlayerText = isPlayer1
    ? (currentPlayer === 1 ? "Your Turn" : "Your Opponent's Turn")
    : (currentPlayer === 2 ? "Your Turn" : "Your Opponent's Turn");

  const currentPlayerElement = document.getElementById('currentPlayer');
  if (currentPlayerElement) {
    currentPlayerElement.textContent = currentPlayerText;
  }

  // Display the appropriate input field for the current player
  const player1Input = document.getElementById('player1Input');
  const player1Submit = document.getElementById('player1Submit');
  const player2Input = document.getElementById('player2Input');
  const player2Submit = document.getElementById('player2Submit');
  const player1Label = document.getElementById('player1Label');
  const player2Label = document.getElementById('player2Label');

  if (isCurrentPlayer) {
    if (isPlayer1) {
      player1Input.style.display = 'block';
      player1Submit.style.display = 'block';
      player1Input.disabled = false;
      player1Submit.disabled = false;
      player2Input.style.display = 'none';
      player2Submit.style.display = 'none';

      player1Label.textContent = "You"; 
      player2Label.textContent = "Your Opponent";
    } else {
      player2Input.style.display = 'block';
      player2Submit.style.display = 'block';
      player2Input.disabled = false;
      player2Submit.disabled = false;
      player1Input.style.display = 'none';
      player1Submit.style.display = 'none';

      player1Label.textContent = "Your Opponent"; 
      player2Label.textContent = "You";
    }
  } else {
    player1Input.style.display = 'none';
    player1Submit.style.display = 'none';
    player2Input.style.display = 'none';
    player2Submit.style.display = 'none';
  }

  // Display the correct progress based on perspective
  const player1Progress = document.getElementById('player1Progress');
  const player2Progress = document.getElementById('player2Progress');

  // Show the internal scoreboard dynamically based on the player's perspective
  if (isPlayer1) {
    if (player1Progress) player1Progress.textContent = scoreboard.player1; // You (Player 1)
    if (player2Progress) player2Progress.textContent = scoreboard.player2; // Opponent (Player 2)
  } else {
    if (player1Progress) player1Progress.textContent = scoreboard.player2; // Opponent (Player 1)
    if (player2Progress) player2Progress.textContent = scoreboard.player1; // You (Player 2)
  }

  currentQuestionElement = document.getElementById('currentQuestion');
  playerImageElement = document.getElementById('playerImage');

  if (currentQuestionElement) currentQuestionElement.textContent = gameData.currentQuestion || "Waiting for question...";

  currentQuestion = gameData.currentQuestion;
  currentAnswer = gameData.correctAnswer;

  displayPlayerImage(currentQuestion);

  if (gameData.player1Answered && gameData.player2Answered) {
    setTimeout(startNewRound, 2000);
  }

  if (gameData.gameStatus === 'ended') {
    const winnerText = gameData.winner === (isPlayer1 ? 1 : 2) ? "You win!" : "Your opponent wins!";
    showFeedbackMessage(`Game Over! ${winnerText}`);
  }
}

function startNewRound() {
  const selectedPlayer = selectPlayerByDifficulty();
  
  resetInputs();

  db.collection('pigGames').doc(gameId).update({
    currentQuestion: selectedPlayer.name,
    correctAnswer: selectedPlayer.college,
    player1Answered: false,
    player2Answered: false,
    player1Guess: '',
    player2Guess: '',
    currentPlayer: 1
  }).catch(error => console.error("Error starting new round:", error));

  displayPlayerImage(selectedPlayer.name);
}

function selectPlayerByDifficulty() {
  const eligiblePlayers = playersData.filter(player => 
    player.rarity_score <= currentDifficultyLevel || 
    (player.games_played > 500 && player.retirement_year < 2000)
  );

  if (eligiblePlayers.length === 0) {
    return playersData[Math.floor(Math.random() * playersData.length)];
  }

  return eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
}

function displayPlayerImage(playerName) {
  const player = playersData.find(p => p.name === playerName);
  if (player && playerImageElement) {
    const defaultImage = 'stilllife.png';

    playerImageElement.src = defaultImage;

    if (player.image_url) {
      playerImageElement.src = player.image_url;

      playerImageElement.onerror = function() {
        playerImageElement.onerror = null;
        playerImageElement.src = defaultImage;
      };
    }
  }
}

function submitGuess(playerNum) {
  const guessInput = document.getElementById(`player${playerNum}Input`);
  const guess = guessInput ? guessInput.value.trim() : '';
  if (!guess) return;

  db.collection('pigGames').doc(gameId).get()
    .then(doc => {
      if (doc.exists) {
        const gameData = doc.data();
        updateGameAfterGuess(playerNum, guess, gameData);
      }
    })
    .catch(error => console.error("Error submitting guess:", error));
}

function updateGameAfterGuess(playerNum, guess, gameData) {
  const isCorrect = isCloseMatch(guess, currentAnswer);

  let progressField = playerNum === 1 ? 'player1Progress' : 'player2Progress';
  let answeredField = playerNum === 1 ? 'player1Answered' : 'player2Answered';
  let guessField = playerNum === 1 ? 'player1Guess' : 'player2Guess';

  let otherPlayerAnsweredField = playerNum === 1 ? 'player2Answered' : 'player1Answered';
  let otherPlayerGuessField = playerNum === 1 ? 'player2Guess' : 'player1Guess';

  // Player will get a letter if they answer incorrectly and the other player answers correctly
  if (!isCorrect && gameData[otherPlayerAnsweredField] && isCloseMatch(gameData[otherPlayerGuessField], currentAnswer)) {
    const currentProgress = gameData[progressField];
    const nextLetter = getNextLetter(currentProgress);
    if (nextLetter) {
      gameData[progressField] = currentProgress + nextLetter;

      // Update internal scoreboard based on player
      if (playerNum === 1) {
        scoreboard.player1 = gameData.player1Progress;
      } else {
        scoreboard.player2 = gameData.player2Progress;
      }
    } else {
      gameData.gameStatus = 'ended';
      gameData.winner = playerNum === 1 ? 2 : 1;
    }
  }

  gameData[answeredField] = true;
  gameData[guessField] = guess;

  if (gameData.player1Answered && gameData.player2Answered) {
    setTimeout(startNewRound, 2000);
  } else {
    gameData.currentPlayer = playerNum === 1 ? 2 : 1;
  }

  db.collection('pigGames').doc(gameId).update(gameData)
    .catch(error => console.error("Error updating game after guess:", error));

  if (isCorrect) {
    correctSound.play();
  } else {
    wrongSound.play();
  }
}

function isCloseMatch(guess, answer) {
  return guess.trim().toLowerCase() === answer.trim().toLowerCase();
}

function getNextLetter(progress) {
  const letters = ['H', 'O', 'R', 'S', 'E'];
  return letters[progress.length] || null;
}

function resetInputs() {
  const player1Input = document.getElementById('player1Input');
  const player2Input = document.getElementById('player2Input');
  if (player1Input) player1Input.value = '';
  if (player2Input) player2Input.value = '';
}

function generatePlayerId() {
  return Math.random().toString(36).substr(2, 9);
}

function showFeedbackMessage(message) {
  const feedbackMessage = document.getElementById('feedbackMessage');
  if (feedbackMessage) {
    feedbackMessage.textContent = message;
    feedbackMessage.classList.add('show');
    setTimeout(() => {
      feedbackMessage.classList.remove('show');
    }, 3000);
  }
}
