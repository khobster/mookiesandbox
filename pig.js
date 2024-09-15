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
let currentQuestionElement, playerImageElement;
let correctSound, wrongSound;

function showPowAnimation(message) {
  const powElement = document.createElement('div');
  powElement.className = 'pow-animation';
  powElement.textContent = message;
  document.body.appendChild(powElement);
  
  setTimeout(() => {
    document.body.removeChild(powElement);
  }, 1500);
}

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

  updateUI(gameData);

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

function updateUI(gameData) {
  // Update traffic light
  const lights = document.querySelectorAll('.light');
  lights.forEach(light => light.classList.remove('active'));
  if (gameData.currentPlayer === 1) {
    document.querySelector('.green').classList.add('active');
  } else {
    document.querySelector('.red').classList.add('active');
  }

  // Update HORSE wheel
  const letters = ['H', 'O', 'R', 'S', 'E'];
  letters.forEach(letter => {
    const tile = document.getElementById(letter);
    if (tile) {
      if (gameData.player1Progress.includes(letter) || gameData.player2Progress.includes(letter)) {
        tile.classList.add('hidden');
      } else {
        tile.classList.remove('hidden');
      }
    }
  });

  // Show/hide input area based on turn
  const inputArea = document.getElementById('inputArea');
  const isPlayer1 = playerId === gameData.player1Id;
  const isCurrentPlayer = (isPlayer1 && gameData.currentPlayer === 1) || (!isPlayer1 && gameData.currentPlayer === 2);
  if (inputArea) {
    inputArea.style.display = isCurrentPlayer ? 'flex' : 'none';
  }

  // Update scores
  updateUIForBothPlayers(gameData);
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

function submitGuess() {
  const guessInput = document.getElementById('collegeGuess');
  const guess = guessInput ? guessInput.value.trim() : '';
  if (!guess) return;

  db.collection('pigGames').doc(gameId).get()
    .then(doc => {
      if (doc.exists) {
        const gameData = doc.data();
        const playerNum = playerId === gameData.player1Id ? 1 : 2;
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

  // If both players have answered, determine if a letter should be added
  if (gameData.player1Answered && gameData.player2Answered) {
    const player1Correct = isCloseMatch(gameData.player1Guess, currentAnswer);
    const player2Correct = isCloseMatch(gameData.player2Guess, currentAnswer);

    if (!player1Correct && player2Correct) {
      const nextLetter = getNextLetter(gameData.player1Progress);
      if (nextLetter) {
        gameData.player1Progress += nextLetter;
      }
    } else if (!player2Correct && player1Correct) {
      const nextLetter = getNextLetter(gameData.player2Progress);
      if (nextLetter) {
        gameData.player2Progress += nextLetter;
      }
    }
  }

  // Check for game end
  if (gameData.player1Progress.length === 5 || gameData.player2Progress.length === 5) {
    gameData.gameStatus = 'ended';
    gameData.winner = gameData.player1Progress.length === 5 ? 2 : 1;
  }

  // Update the internal scoreboard
  scoreboard.player1 = gameData.player1Progress;
  scoreboard.player2 = gameData.player2Progress;

  if (gameData.player1Answered && gameData.player2Answered && gameData.gameStatus !== 'ended') {
    setTimeout(startNewRound, 2000);
  } else if (gameData.gameStatus !== 'ended') {
    gameData.currentPlayer = 3 - playerNum; // Switch to the other player
  }

  db.collection('pigGames').doc(gameId).update(gameData)
    .then(() => {
      updateUI(gameData);
      if (isCorrect) {
        showPowAnimation("YES!");
        correctSound.play();
      } else {
        showPowAnimation("NO!");
        wrongSound.play();
      }
    })
    .catch(error => console.error("Error updating game after guess:", error));
}

function updateUIForBothPlayers(gameData) {
  const player1Score = document.getElementById('player1Score');
  const player2Score = document.getElementById('player2Score');

  if (player1Score) player1Score.textContent = formatScore(gameData.player1Progress);
  if (player2Score) player2Score.textContent = formatScore(gameData.player2Progress);
}

function formatScore(progress) {
  const fullWord = 'HORSE';
  return fullWord.split('').map(letter => 
    progress.includes(letter) ? '_' : letter
  ).join(' ');
}

function isCloseMatch(guess, answer) {
    if (!guess.trim()) {
        return false;
    }

    let simpleGuess = simplifyString(guess);
    let simpleAnswer = simplifyString(answer);

    // Handle "no college" case
    if (simpleAnswer === '') {
        const noCollegeResponses = ['no', 'nocollege', 'didntgotocollege', 'didnotgotocollege'];
        return noCollegeResponses.includes(simpleGuess);
    }

    // Handle multiple colleges
    const answerColleges = simpleAnswer.split(',').map(college => simplifyString(college));

    // Check if the guess matches any of the colleges
    return answerColleges.some(college => college.includes(simpleGuess) || simpleGuess.includes(college));
}

function simplifyString(str) {
    return str.trim().toLowerCase().replace(/university|college|the| /g, '');
}

function getNextLetter(progress) {
  const letters = ['H', 'O', 'R', 'S', 'E'];
  return letters[progress.length] || null;
}

function resetInputs() {
  const collegeGuess = document.getElementById('collegeGuess');
  if (collegeGuess) collegeGuess.value = '';
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

function showSuggestions(input) {
  const suggestionsContainer = document.getElementById('suggestions');
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
        const collegeGuess = document.getElementById('collegeGuess');
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

  const collegeGuess = document.getElementById('collegeGuess');
  const submitGuessBtn = document.getElementById('submitGuess');
  
  if (collegeGuess) {
    collegeGuess.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        submitGuess();
      }
    });
    collegeGuess.addEventListener('input', (e) => {
      showSuggestions(e.target.value);
    });
  }
  
  if (submitGuessBtn) {
    submitGuessBtn.addEventListener('click', submitGuess);
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
