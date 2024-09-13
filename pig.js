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
let currentQuestion;
let currentAnswer;
let currentDifficultyLevel = 1;
let playerId;

let newGameBtn, setupArea, gameArea, gameUrlInput, shareLinkDiv, startGameBtn;
let player1SubmitBtn, player2SubmitBtn;
let currentQuestionElement, playerImageElement;
let correctSound, wrongSound; // Sound effects

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

    // Display the Start Game button
    if (startGameBtn) {
      startGameBtn.style.display = 'block';
    }

    // Hide the New Game button
    if (newGameBtn) {
      newGameBtn.style.display = 'none';
    }

  })
  .catch(error => console.error("Error creating new game:", error));
}

function setupGame(id) {
  gameId = id;
  // Use existing playerId if set, otherwise generate a new one
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

  let currentPlayerText = isPlayer1 ? 
      (currentPlayer === 1 ? "Your Turn" : "Your Opponent's Turn") :
      (currentPlayer === 2 ? "Your Turn" : "Your Opponent's Turn");
  
  const currentPlayerElement = document.getElementById('currentPlayer');
  if (currentPlayerElement) {
    currentPlayerElement.textContent = currentPlayerText;
  }

  const player1Label = isPlayer1 ? "You" : "Your Opponent";
  const player2Label = isPlayer1 ? "Your Opponent" : "You";
  
  const player1LabelElement = document.getElementById('player1Label');
  const player2LabelElement = document.getElementById('player2Label');
  const player1ProgressElement = document.getElementById('player1Progress');
  const player2ProgressElement = document.getElementById('player2Progress');
  currentQuestionElement = document.getElementById('currentQuestion');
  playerImageElement = document.getElementById('playerImage');

  if (player1LabelElement) player1LabelElement.textContent = player1Label;
  if (player2LabelElement) player2LabelElement.textContent = player2Label;
  if (player1ProgressElement) player1ProgressElement.textContent = gameData.player1Progress;
  if (player2ProgressElement) player2ProgressElement.textContent = gameData.player2Progress;
  
  if (currentQuestionElement) currentQuestionElement.textContent = gameData.currentQuestion || "Waiting for question...";
  
  currentQuestion = gameData.currentQuestion;
  currentAnswer = gameData.correctAnswer;

  // Display the player's image
  displayPlayerImage(currentQuestion);

  const isCurrentPlayer = (isPlayer1 && currentPlayer === 1) || (!isPlayer1 && currentPlayer === 2);

  const player1Input = document.getElementById('player1Input');
  const player2Input = document.getElementById('player2Input');
  
  if (player1Input && player2Input) {
    const player1Container = player1Input.closest('.player');
    const player2Container = player2Input.closest('.player');

    player1Input.disabled = !isPlayer1 || !isCurrentPlayer || gameData.player1Answered;
    player2Input.disabled = isPlayer1 || !isCurrentPlayer || gameData.player2Answered;
    
    if (player1SubmitBtn) player1SubmitBtn.disabled = !isPlayer1 || !isCurrentPlayer || gameData.player1Answered;
    if (player2SubmitBtn) player2SubmitBtn.disabled = isPlayer1 || !isCurrentPlayer || gameData.player2Answered;

    if (player1Container) player1Container.classList.toggle('active-player', currentPlayer === 1);
    if (player2Container) player2Container.classList.toggle('active-player', currentPlayer === 2);
  }

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

  // Display the new player's image
  displayPlayerImage(selectedPlayer.name);
}

function selectPlayerByDifficulty() {
  const eligiblePlayers = playersData.filter(player => 
    player.rarity_score <= currentDifficultyLevel || 
    (player.games_played > 500 && player.retirement_year < 2000)
  );

  if (eligiblePlayers.length === 0) {
    console.error("No eligible players found for the current difficulty level");
    return playersData[Math.floor(Math.random() * playersData.length)];
  }

  return eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
}

function displayPlayerImage(playerName) {
  const player = playersData.find(p => p.name === playerName);
  if (player && playerImageElement) {
    const defaultImage = 'stilllife.png'; // Path to your placeholder image

    playerImageElement.src = defaultImage; // Set default initially

    if (player.image_url) {
      playerImageElement.src = player.image_url;

      // Handle image loading error
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

  // Player will only get a letter if they answer incorrectly and the other player answers correctly
  if (!isCorrect && gameData[otherPlayerAnsweredField] && isCloseMatch(gameData[otherPlayerGuessField], currentAnswer)) {
    const currentProgress = gameData[progressField];
    const nextLetter = getNextLetter(currentProgress);
    if (nextLetter) {
      gameData[progressField] = currentProgress + nextLetter;
    } else {
      // Game over
      gameData.gameStatus = 'ended';
      gameData.winner = playerNum === 1 ? 2 : 1;
    }
  }

  gameData[answeredField] = true;
  gameData[guessField] = guess;
  gameData.currentPlayer = playerNum === 1 ? 2 : 1;

  db.collection('pigGames').doc(gameId).update(gameData)
    .catch(error => console.error("Error updating game after guess:", error));

  // Play sound effects
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
  const letters = ['P', 'I', 'G'];
  return letters[progress.length] || null;
}

// Function to copy the game URL to the clipboard
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
    }, 3000); // Hide after 3 seconds
  }
}

// Initialize sound effects and event listeners
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

  // Event listener for the Copy Link button
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

  // Game initialization
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
