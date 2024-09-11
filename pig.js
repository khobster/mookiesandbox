let playersData = [];
let currentPlayer = null;
let correctStreak1 = 0;
let correctStreak2 = 0;
let player1HasGuessed = false;
let player2HasGuessed = false;

// Firebase reference to the game data
const gameRef = db.collection("games").doc("currentGame");

document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();
    const submitBtn1 = document.getElementById('submitBtn1');
    const submitBtn2 = document.getElementById('submitBtn2');

    submitBtn1.addEventListener('click', () => handlePlayerGuess(1));
    submitBtn2.addEventListener('click', () => handlePlayerGuess(2));

    const guessInput1 = document.getElementById('collegeGuess1');
    const guessInput2 = document.getElementById('collegeGuess2');

    guessInput1.addEventListener('input', (e) => showSuggestions(e.target.value, 1));
    guessInput2.addEventListener('input', (e) => showSuggestions(e.target.value, 2));

    // Listen for changes in the game data in Firebase
    gameRef.onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if (data.currentPlayerID) {
                const storedPlayerID = data.currentPlayerID;
                currentPlayer = playersData.find(player => player.id === storedPlayerID);

                if (currentPlayer) {
                    displayPlayer(currentPlayer);
                    syncTurnDisplay(data.currentTurn);  // Sync turn
                } else {
                    console.error("Player with stored ID not found. Starting a new round.");
                    startNewRound();
                }
            }
        }
    });
});

function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            playersData.sort((a, b) => a.id - b.id);
            startNewRound();  
        })
        .catch(error => {
            console.error('Error loading JSON:', error);
            document.getElementById('playerQuestion').textContent = 'Error loading player data.';
        });
}

function startNewRound() {
    player1HasGuessed = false;
    player2HasGuessed = false;
    gameRef.get().then((doc) => {
        if (doc.exists && doc.data().currentPlayerID) {
            const storedPlayerID = doc.data().currentPlayerID;
            currentPlayer = playersData.find(player => player.id === storedPlayerID);
            if (currentPlayer) {
                displayPlayer(currentPlayer);
            } else {
                displayRandomPlayer();
            }
        } else {
            displayRandomPlayer();
        }
    }).catch((error) => {
        console.error("Error getting game data from Firebase: ", error);
    });
}

function displayRandomPlayer() {
    if (playersData.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        currentPlayer = playersData[randomIndex];
        gameRef.set({ currentPlayerID: currentPlayer.id, currentTurn: 1 });
        displayPlayer(currentPlayer);
    } else {
        console.log("No data available");
    }
}

function displayPlayer(player) {
    const playerNameElement = document.getElementById('playerName');
    const playerImageElement = document.getElementById('playerImage');

    if (playerNameElement && playerImageElement) {
        playerNameElement.textContent = player.name;
        playerImageElement.src = player.image_url || 'stilllife.png';
        playerImageElement.onerror = function () {
            this.onerror = null;
            this.src = 'stilllife.png';
        };
        document.getElementById('result').textContent = '';
        document.getElementById('turnIndicator').textContent = "Player 1's turn";
    } else {
        console.error("Player name or image element not found");
    }
}

function handlePlayerGuess(playerNumber) {
    const guessInput = document.getElementById(`collegeGuess${playerNumber}`);
    const guess = guessInput.value.trim().toLowerCase();
    const resultElement = document.getElementById('result');
    let isCorrect = false;

    if (currentPlayer) {
        isCorrect = isCloseMatch(guess, currentPlayer.college || 'No College');
    }

    updateStreakAndDisplayResult(isCorrect, playerNumber, resultElement);
    guessInput.value = '';  // Clear the input field

    if (playerNumber === 1) {
        player1HasGuessed = true;
        gameRef.update({ currentTurn: 2 });  // Switch turn to Player 2
    } else {
        player2HasGuessed = true;
    }

    if (player1HasGuessed && player2HasGuessed) {
        if (!isCorrect) {
            setTimeout(() => {
                startNewRound();  // Start new question if both players are wrong
            }, 2000);
        }
    }
}

function syncTurnDisplay(currentTurn) {
    if (currentTurn === 1) {
        document.getElementById('turnIndicator').textContent = "Player 1's turn";
    } else {
        document.getElementById('turnIndicator').textContent = "Player 2's turn";
    }
}

function updateStreakAndDisplayResult(isCorrect, playerNumber, resultElement) {
    if (isCorrect) {
        if (playerNumber === 1) {
            correctStreak1++;
            document.getElementById('player1Progress').textContent = `Player 1: Correct!`;
        } else {
            correctStreak2++;
            document.getElementById('player2Progress').textContent = `Player 2: Correct!`;
        }
        resultElement.textContent = "Correct!";
        resultElement.className = 'correct';
        correctSound.play();
    } else {
        resultElement.textContent = "Wrong answer. Try again!";
        resultElement.className = 'incorrect';
        wrongSound.play();
    }
}

function showSuggestions(input, playerNumber) {
    const suggestionsContainer = document.getElementById('suggestions');
    suggestionsContainer.innerHTML = '';
    if (input.length === 0) return;

    const suggestions = Array.from(new Set(playersData
        .map(player => player.college)
        .filter(college => college && college.toLowerCase().includes(input.toLowerCase()))))
        .slice(0, 5);  // Limit to 5 suggestions

    suggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.textContent = suggestion;
        suggestionItem.classList.add('suggestion-item');
        suggestionItem.addEventListener('click', () => {
            const guessInput = document.getElementById(`collegeGuess${playerNumber}`);
            guessInput.value = suggestion;
            suggestionsContainer.innerHTML = '';  // Clear suggestions after selection
        });
        suggestionsContainer.appendChild(suggestionItem);
    });
}

function isCloseMatch(guess, answer) {
    let simpleGuess = guess.trim().toLowerCase();
    let simpleAnswer = answer.trim().toLowerCase();
    return simpleAnswer.includes(simpleGuess);
}
