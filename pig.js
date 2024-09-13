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
        playersData.sort((a, b) => a.rarity_score - b.rarity_score);
    })
    .catch(error => console.error('Error loading players data:', error));

function createNewGame() {
    const player1Id = generatePlayerId();
    db.collection('pigGames').add({
        currentPlayer: 1,
        player1Progress: '',
        player2Progress: '',
        currentQuestion: '',
        correctAnswer: '',
        player1Answered: false,
        player2Answered: false,
        player1Guess: '',
        player2Guess: '',
        gameStatus: 'waiting',
        player1Id: player1Id,
        player2Id: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(docRef => {
        gameId = docRef.id;
        playerId = player1Id;
        localStorage.setItem('playerId', playerId);
        const shareableUrl = `${window.location.origin}/pig.html?gameId=${gameId}`;
        
        gameUrlInput.value = shareableUrl;
        shareLinkDiv.style.display = 'block';
        
        newGameBtn.style.display = 'none';
        
        const startGameBtn = document.createElement('button');
        startGameBtn.textContent = 'Start Game';
        startGameBtn.addEventListener('click', () => {
            setupGame(gameId);
        });
        setupArea.appendChild(startGameBtn);
    }).catch(error => console.error("Error creating game:", error));
}

function setupGame(id) {
    gameId = id;
    playerId = localStorage.getItem('playerId');
    
    if (!playerId) {
        playerId = generatePlayerId();
        localStorage.setItem('playerId', playerId);
    }

    db.collection('pigGames').doc(gameId).get().then(doc => {
        if (doc.exists) {
            const gameData = doc.data();
            if (!gameData.player2Id && gameData.player1Id !== playerId) {
                // This is player 2 joining
                db.collection('pigGames').doc(gameId).update({
                    player2Id: playerId,
                    gameStatus: 'active'
                });
            }
            startGameListener();
        } else {
            console.error("Game not found");
            alert("Game not found. Returning to the main page.");
            window.location.href = 'index.html';
        }
    }).catch(error => {
        console.error("Error setting up game:", error);
    });
}

function startGameListener() {
    setupArea.style.display = 'none';
    gameArea.style.display = 'block';

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
    
    startNewRound();
}

function updateGameState(gameData) {
    currentPlayer = gameData.currentPlayer;
    document.getElementById('currentPlayer').textContent = `Current Turn: Player ${currentPlayer}`;
    document.getElementById('player1Progress').textContent = gameData.player1Progress;
    document.getElementById('player2Progress').textContent = gameData.player2Progress;
    document.getElementById('currentQuestion').textContent = gameData.currentQuestion || "Waiting for question...";
    
    currentQuestion = gameData.currentQuestion;
    currentAnswer = gameData.correctAnswer;

    const isPlayer1 = playerId === gameData.player1Id;
    const isCurrentPlayer = (isPlayer1 && currentPlayer === 1) || (!isPlayer1 && currentPlayer === 2);

    const player1Input = document.getElementById('player1Input');
    const player2Input = document.getElementById('player2Input');
    const player1Container = player1Input.closest('.player');
    const player2Container = player2Input.closest('.player');

    player1Input.disabled = !isPlayer1 || !isCurrentPlayer || gameData.player1Answered;
    player2Input.disabled = isPlayer1 || !isCurrentPlayer || gameData.player2Answered;
    player1SubmitBtn.disabled = !isPlayer1 || !isCurrentPlayer || gameData.player1Answered;
    player2SubmitBtn.disabled = isPlayer1 || !isCurrentPlayer || gameData.player2Answered;

    player1Container.classList.toggle('active-player', currentPlayer === 1);
    player2Container.classList.toggle('active-player', currentPlayer === 2);

    if (gameData.player1Answered && gameData.player2Answered) {
        setTimeout(startNewRound, 2000);
    }

    if (gameData.gameStatus === 'ended') {
        alert(`Game Over! Player ${gameData.winner} wins!`);
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

player1SubmitBtn.addEventListener('click', () => submitGuess(1));
player2SubmitBtn.addEventListener('click', () => submitGuess(2));

function submitGuess(playerNum) {
    const guessInput = document.getElementById(`player${playerNum}Input`);
    const guess = guessInput.value.trim().toLowerCase();

    db.collection('pigGames').doc(gameId).get().then(doc => {
        const gameData = doc.data();
        updateGameAfterGuess(playerNum, guess, gameData);
        guessInput.value = '';
    });
}

function updateGameAfterGuess(playerNum, guess, gameData) {
    let updates = {
        [`player${playerNum}Answered`]: true,
        [`player${playerNum}Guess`]: guess,
        currentPlayer: playerNum === 1 ? 2 : 1
    };

    if (gameData.player1Answered && playerNum === 2) {
        const player1Correct = isCloseMatch(gameData.player1Guess, gameData.correctAnswer);
        const player2Correct = isCloseMatch(guess, gameData.correctAnswer);

        if (!player1Correct && player2Correct) {
            updates.player1Progress = getNextLetter(gameData.player1Progress);
        } else if (player1Correct && !player2Correct) {
            updates.player2Progress = getNextLetter(gameData.player2Progress);
        }

        if (player1Correct || player2Correct) {
            currentDifficultyLevel += 0.1;
        } else {
            currentDifficultyLevel = Math.max(1, currentDifficultyLevel - 0.05);
        }

        if (updates.player1Progress === 'HORSE' || updates.player2Progress === 'HORSE') {
            updates.gameStatus = 'ended';
            updates.winner = updates.player1Progress === 'HORSE' ? 2 : 1;
        }
    }

    db.collection('pigGames').doc(gameId).update(updates).then(() => {
        if (updates.gameStatus === 'ended') {
            alert(`Game Over! Player ${updates.winner} wins!`);
        }
    });
}

function isCloseMatch(guess, answer) {
    if (!guess.trim()) {
        return false;
    }

    let simpleGuess = guess.trim().toLowerCase();
    let simpleAnswer = answer.trim().toLowerCase();

    let normalizedGuess = simpleGuess.replace(/[^a-zA-Z0-9]/g, '');

    const noCollegePhrases = [
        "didntgotocollege",
        "didnotgotocollege",
        "hedidntgotocollege",
        "hedidnotgotocollege",
        "nocollege",
    ];

    if (noCollegePhrases.includes(normalizedGuess) && simpleAnswer === '') {
        return true;
    }

    if (simpleAnswer === 'unc' && (simpleGuess === 'north carolina' || simpleGuess === 'carolina')) {
        return true;
    }

    return simpleAnswer.includes(simpleGuess);
}

function getNextLetter(progress) {
    if (!progress.includes('H')) return 'H';
    if (!progress.includes('O')) return progress + 'O';
    if (!progress.includes('R')) return progress + 'R';
    if (!progress.includes('S')) return progress + 'S';
    if (!progress.includes('E')) return progress + 'E';
    return progress;
}

function copyGameUrl() {
    gameUrlInput.select();
    document.execCommand('copy');
    alert('Game URL copied to clipboard!');
}

function showSuggestions(input, playerNum) {
    const suggestionsContainer = document.getElementById(`suggestions${playerNum}`);
    if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
        if (input.length === 0) {
            return;
        }
        const suggestions = Array.from(new Set(playersData
            .map(player => player.college)
            .filter(college => college && college.toLowerCase().includes(input.toLowerCase()))))
            .slice(0, 5);
        if (suggestions.length > 0) {
            suggestionsContainer.style.display = 'block';
            suggestions.forEach(suggestion => {
                const suggestionItem = document.createElement('div');
                suggestionItem.textContent = suggestion;
                suggestionItem.classList.add('suggestion-item');
                suggestionItem.addEventListener('click', () => {
                    document.getElementById(`player${playerNum}Input`).value = suggestion;
                    suggestionsContainer.style.display = 'none';
                });
                suggestionsContainer.appendChild(suggestionItem);
            });
        }
    }
}

function resetInputs() {
    const player1Input = document.getElementById('player1Input');
    const player2Input = document.getElementById('player2Input');
    player1Input.value = '';
    player2Input.value = '';
}

function generatePlayerId() {
    return Math.random().toString(36).substr(2, 9);
}

document.addEventListener('DOMContentLoaded', () => {
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
});

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdFromUrl = urlParams.get('gameId');
    if (gameIdFromUrl) {
        setupGame(gameIdFromUrl);
    } else {
        newGameBtn.style.display = 'block';
    }
};
