let playersData = [];
let gameRef;
let gameId;
let currentPlayer = null;
let player1Progress = '';
let player2Progress = '';
let player1HasGuessed = false;
let player2HasGuessed = false;

const correctSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const wrongSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

let maxRetries = 3;
let retryCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    gameId = urlParams.get('gameId');

    if (gameId) {
        gameRef = db.collection('games').doc(gameId);
        loadGameData();
        setupRealtimeListeners();
    } else {
        console.error("No gameId found in the URL!");
        alert("No game ID found. Returning to the main page.");
        window.location.href = 'index.html';
    }

    const submitBtn1 = document.getElementById('submitBtn1');
    const submitBtn2 = document.getElementById('submitBtn2');

    if (submitBtn1 && submitBtn2) {
        submitBtn1.addEventListener('click', () => handlePlayerGuess(1));
        submitBtn2.addEventListener('click', () => handlePlayerGuess(2));
    } else {
        console.error("Submit buttons not found in the DOM");
    }

    loadPlayersData();
});

function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
        })
        .catch(error => {
            console.error('Error loading JSON:', error);
            document.getElementById('playerQuestion').textContent = 'Error loading player data.';
        });
}

function loadGameData() {
    console.log("Attempting to load game with gameId:", gameId);

    gameRef.get().then((doc) => {
        if (doc.exists) {
            const gameData = doc.data();
            console.log("Game data loaded successfully:", gameData);

            updateGameDisplay(gameData);

            if (!gameData.currentPlayer) {
                selectAndUpdateCurrentPlayer();
            }
        } else {
            console.error(`No such game found with gameId: ${gameId}`);
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying... Attempt ${retryCount} of ${maxRetries}`);
                setTimeout(loadGameData, 1000); // Wait 1 second before retrying
            } else {
                alert("Unable to load the game. Returning to the main page.");
                window.location.href = 'index.html';
            }
        }
    }).catch((error) => {
        console.error("Error loading game:", error);
        alert("An error occurred while loading the game. Please try again.");
        window.location.href = 'index.html';
    });
}

function updateGameDisplay(gameData) {
    document.getElementById('playerQuestion').textContent = gameData.currentQuestion || 'Where did the player go to college?';
    document.getElementById('turnIndicator').textContent = gameData.currentTurn === 'player1' ? "Player 1's turn" : "Player 2's turn";
    
    player1Progress = gameData.player1.progress || '';
    player2Progress = gameData.player2.progress || '';
    updateProgressDisplay();

    if (gameData.currentPlayer) {
        displayPlayer(gameData.currentPlayer);
    }
}

function setupRealtimeListeners() {
    gameRef.onSnapshot((doc) => {
        if (doc.exists) {
            const gameData = doc.data();
            updateGameDisplay(gameData);
        } else {
            console.error("Game document no longer exists!");
        }
    });
}

function selectAndUpdateCurrentPlayer() {
    if (playersData.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        currentPlayer = playersData[randomIndex];
        gameRef.update({
            currentPlayer: currentPlayer,
            currentQuestion: `Where did ${currentPlayer.name} go to college?`
        }).catch(error => {
            console.error("Error updating current player:", error);
        });
    } else {
        console.error("No player data available");
    }
}

function handlePlayerGuess(playerNumber) {
    const guessInput = document.getElementById(`collegeGuess${playerNumber}`);
    const guess = guessInput.value.trim().toLowerCase();
    const resultElement = document.getElementById('result');

    if (currentPlayer) {
        const isCorrect = isCloseMatch(guess, currentPlayer.college || 'No College');
        updateResult(isCorrect, playerNumber, resultElement);

        guessInput.value = '';

        if (playerNumber === 1) {
            player1HasGuessed = true;
        } else {
            player2HasGuessed = true;
        }

        if (player1HasGuessed && player2HasGuessed) {
            setTimeout(() => {
                startNewRound();
            }, 2000);
        }

        gameRef.update({
            [`player${playerNumber}.lastAnswer`]: guess,
            currentTurn: playerNumber === 1 ? 'player2' : 'player1'
        }).catch(error => {
            console.error("Error updating game state:", error);
        });
    } else {
        console.error("No current player data available");
    }
}

function updateResult(isCorrect, playerNumber, resultElement) {
    if (isCorrect) {
        resultElement.textContent = `Player ${playerNumber}: Correct!`;
        resultElement.className = 'correct';
        correctSound.play();
    } else {
        resultElement.textContent = `Player ${playerNumber}: Wrong answer.`;
        resultElement.className = 'incorrect';
        wrongSound.play();
        
        if (playerNumber === 1) {
            player1Progress += getNextLetter(player1Progress);
        } else {
            player2Progress += getNextLetter(player2Progress);
        }
        
        updateProgressDisplay();
        
        gameRef.update({
            [`player${playerNumber}.progress`]: playerNumber === 1 ? player1Progress : player2Progress
        }).catch(error => {
            console.error("Error updating game state:", error);
            alert("An error occurred while updating the game. The game state may be inconsistent.");
        });

        if (player1Progress === 'PIG' || player2Progress === 'PIG') {
            endGame();
        }
    }
}

function isCloseMatch(guess, answer) {
    if (!guess.trim()) return false;

    let simpleGuess = guess.trim().toLowerCase();
    let simpleAnswer = answer.trim().toLowerCase();

    const noCollegePhrases = ["didntgotocollege", "didnotgotocollege", "nocollege"];

    if (noCollegePhrases.includes(simpleGuess.replace(/\s/g, '')) && simpleAnswer === '') {
        return true;
    }

    if (simpleAnswer === 'unc' && (simpleGuess === 'north carolina' || simpleGuess === 'carolina')) {
        return true;
    }

    return simpleAnswer.includes(simpleGuess);
}

function getNextLetter(progress) {
    if (!progress.includes('P')) return 'P';
    if (!progress.includes('I')) return 'I';
    return 'G';
}

function updateProgressDisplay() {
    document.getElementById('player1Progress').textContent = `Player 1: ${player1Progress}`;
    document.getElementById('player2Progress').textContent = `Player 2: ${player2Progress}`;
}

function startNewRound() {
    player1HasGuessed = false;
    player2HasGuessed = false;
    document.getElementById('result').textContent = '';
    document.getElementById('turnIndicator').textContent = "Player 1's turn";
    selectAndUpdateCurrentPlayer();
}

function displayPlayer(player) {
    document.getElementById('playerName').textContent = player.name;
    const playerImage = document.getElementById('playerImage');
    playerImage.src = player.image_url || 'stilllife.png';
    playerImage.onerror = function() {
        this.onerror = null;
        this.src = 'stilllife.png';
    };
    document.getElementById('collegeGuess1').value = '';
    document.getElementById('collegeGuess2').value = '';
    document.getElementById('result').textContent = '';
    document.getElementById('result').className = '';
}

function endGame() {
    const winner = player1Progress === 'PIG' ? 'Player 2' : 'Player 1';
    document.getElementById('result').textContent = `Game Over! ${winner} wins!`;
    document.getElementById('submitBtn1').disabled = true;
    document.getElementById('submitBtn2').disabled = true;
    
    gameRef.update({
        gameEnded: true,
        winner: winner
    }).catch(error => {
        console.error("Error updating game end state:", error);
    });
}

// Add event listeners for college guess inputs
document.getElementById('collegeGuess1').addEventListener('input', (e) => {
    showSuggestions(e.target.value, 'suggestions1');
});

document.getElementById('collegeGuess2').addEventListener('input', (e) => {
    showSuggestions(e.target.value, 'suggestions2');
});

function showSuggestions(input, containerId) {
    const suggestionsContainer = document.getElementById(containerId);
    suggestionsContainer.innerHTML = '';
    
    if (input.length === 0) return;
    
    const suggestions = Array.from(new Set(playersData
        .map(player => player.college)
        .filter(college => college && college.toLowerCase().indexOf(input.toLowerCase()) !== -1)))
        .slice(0, 5);
        
    suggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.textContent = suggestion;
        suggestionItem.classList.add('suggestion-item');
        suggestionItem.addEventListener('click', () => {
            document.getElementById(containerId.replace('suggestions', 'collegeGuess')).value = suggestion;
            suggestionsContainer.innerHTML = '';
        });
        suggestionsContainer.appendChild(suggestionItem);
    });
}
