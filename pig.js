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
let currentDifficultyLevel = 1;
let scoreboard = { player1: '', player2: '' };

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

  updateCurrentPlayerDisplay(gameData);

  const player1Input = document.getElementById('player1Input');
  const player1Submit = document.getElementById('player1Submit');
  const player2Input = document.getElementById('player2Input');
  const player2Submit = document.getElementById('player2Submit');
  const player1Label = document.getElementById('player1Label');
  const player2Label = document.getElementById('player2Label');

  const isCurrentPlayer = (isPlayer1 && currentPlayer === 1) || (!isPlayer1 && currentPlayer === 2);

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

  updateUIForBothPlayers(gameData);

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

  let currentPlayerProgressField = `player${playerNum}Progress`;
  let otherPlayerProgressField = `player${3-playerNum}Progress`;
  let currentPlayerAnsweredField = `player${playerNum}Answered`;
  let otherPlayerAnsweredField = `player${3-playerNum}Answered`;
  let currentPlayerGuessField = `player${playerNum}Guess`;
  let otherPlayerGuessField = `player${3-playerNum}Guess`;

  gameData[currentPlayerAnsweredField] = true;
  gameData[currentPlayerGuessField] = guess;

  // If the current player is incorrect and the other player is correct, add a letter to the current player's progress
  if (!isCorrect && gameData[otherPlayerAnsweredField] && isCloseMatch(gameData[otherPlayerGuessField], currentAnswer)) {
    const currentProgress = gameData[currentPlayerProgressField];
    const nextLetter = getNextLetter(currentProgress);
    if (nextLetter) {
      gameData[currentPlayerProgressField] = currentProgress + nextLetter;
    }
  }

  // Update the internal scoreboard
  scoreboard.player1 = gameData.player1Progress;
  scoreboard.player2 = gameData.player2Progress;

  if (gameData.player1Answered && gameData.player2Answered) {
    setTimeout(startNewRound, 2000);
  } else {
    gameData.currentPlayer = 3 - playerNum; // Switch to the other player
  }

  db.collection('pigGames').doc(gameId).update(gameData)
    .then(() => {
      // After updating the database, update the UI for both players
      updateUIForBothPlayers(gameData);
    })
    .catch(error => console.error("Error updating game after guess:", error));

  if (isCorrect) {
    correctSound.play();
  } else {
    wrongSound.play();
  }
}

function updateUIForBothPlayers(gameData) {
  const player1Progress = document.getElementById('player1Progress');
  const player2Progress = document.getElementById('player2Progress');

  if (player1Progress) player1Progress.textContent = gameData.player1Progress;
  if (player2Progress) player2Progress.textContent = gameData.player2Progress;

  // Update other UI elements as needed
  updateCurrentPlayerDisplay(gameData);
}

function updateCurrentPlayerDisplay(gameData) {
  const currentPlayerElement = document.getElementById('currentPlayer');
  if (currentPlayerElement) {
    const isPlayer1 = playerId === gameData.player1Id;
    const currentPlayerText = isPlayer1
      ? (gameData.currentPlayer === 1 ? "Your Turn" : "Your Opponent's Turn")
      : (gameData.currentPlayer === 2 ? "Your Turn" : "Your Opponent's Turn");
    currentPlayerElement.textContent = currentPlayerText;
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

function copyGameUrl() {
  if (gameUrlInput) {
    gameUrlInput.select();
    gameUrlInput.setSelectionRange(0, 99999); // For mobile devices

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert("Game URL copied to clipboard!");
      } else {
        alert("Failed to copy the URL. Please copy it manually.");
      }
    } catch (err) {
      alert("Your browser does not support copying to clipboard. Please copy the link manually.");
    }
  }
}

function showSuggestions(input, playerNum) {
  const suggestionsContainer = document.getElementById(`suggestions${playerNum}`);
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
        const collegeGuess = document.getElementById(`player${playerNum}Input`);
        if (collegeGuess) {
          collegeGuess.value = suggestion;
        }
        suggestionsContainer.innerHTML = '';
      });
      suggestionsContainer.appendChild(suggestionItem);
    });
  }
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

document.addEventListener('DOMContentLoaded', () => {
  correctSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
  wrongSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

  newGameBtn = document.getElementById('newGameBtn');
  setupArea = document.getElementById('setupArea');
  gameArea = document.getElementById('gameArea');
  gameUrlInput = document.getElementById('gameUrlInput');
  shareLinkDiv = document.getElementById('shareLink');
  startGameBtn = document.getElementById('startGameBtn');
  player1SubmitBtn = document.getElementById('player1Submit');
  player2SubmitBtn = document.getElementById('player2Submit');
  playerImageElement = document.getElementById('playerImage');

  if (newGameBtn) {
    newGameBtn.addEventListener('click', createNewGame);
  }

  if (startGameBtn) {
    startGameBtn.addEventListener('click', () => {
      setupGame(gameId);
    });
  }

  const copyGameUrlBtn = document.getElementById('copyGameUrl');
  if (copyGameUrlBtn) {
    copyGameUrlBtn.addEventListener('click', copyGameUrl);
  }

  const player1Input = document.getElementById('player1Input');
  const player2Input = document.getElementById('player2Input');
  
  if (player1Input) {
    player1Input.addEventListener('input', (e) => {
      showSuggestions(e.target.value, 1);
    });
  }
  
  if (player2Input) {
    player2Input.addEventListener('input', (e) => {
      showSuggestions(e.target.value, 2);
    });
  }

  if (player1SubmitBtn) {
    player1SubmitBtn.addEventListener('click', () => submitGuess(1));
  }

  if (player2SubmitBtn) {
    player2SubmitBtn.addEventListener('click', () => submitGuess(2));
  }

  const urlParams = new URLSearchParams(window.location.search);
  const gameIdFromUrl = urlParams.get('gameId');
  if (gameIdFromUrl) {
    setupGame(gameIdFromUrl);
  } else {
    if (newGameBtn) {
      newGameBtn.style.display = 'block';
    }
  }
});
