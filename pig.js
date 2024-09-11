let playersData = [];
let currentPlayer = null;
let correctStreak1 = 0;
let correctStreak2 = 0;
let player1HasGuessed = false;
let player2HasGuessed = false;
let currentTurn = 1;  // Track current turn

const correctSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const wrongSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

// Firebase reference to the game data
const gameRef = db.collection("games").doc("currentGame");

document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();

    const submitBtn1 = document.getElementById('submitBtn1');
    const submitBtn2 = document.getElementById('submitBtn2');

    submitBtn1.addEventListener('click', () => handlePlayerGuess(1));
    submitBtn2.addEventListener('click', () => handlePlayerGuess(2));

    // Listen for changes in the game data in Firebase (sync both player and turn)
    gameRef.onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if (data.currentPlayerID) {
                const storedPlayerID = data.currentPlayerID;
                const storedTurn = data.currentTurn;

                // Sync turn between players
                updateTurnIndicator(storedTurn);

                // Ensure that playersData is loaded before trying to find the player
                if (playersData.length > 0) {
                    currentPlayer = playersData.find(player => player.id === storedPlayerID);
                    if (currentPlayer) {
                        displayPlayer(currentPlayer);
                    } else {
                        console.error("Player with stored ID not found. Starting a new round.");
                        startNewRound();
                    }
                }
            }
        }
    });

    // Wire up autocomplete suggestions
    const collegeGuess1 = document.getElementById('collegeGuess1');
    const collegeGuess2 = document.getElementById('collegeGuess2');

    collegeGuess1.addEventListener('input', (e) => showSuggestions(e.target.value, 1));
    collegeGuess2.addEventListener('input', (e) => showSuggestions(e.target.value, 2));
});

function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            playersData.sort((a, b) => a.rarity_score - b.rarity_score);  // Sort players by rarity score
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

        // Store the current player's ID and reset the turn to Player 1
        gameRef.set({ currentPlayerID: currentPlayer.id, currentTurn: 1 });

        displayPlayer(currentPlayer);
        updateTurnIndicator(1);  // Start with Player 1
    } else {
        console.log("No data available");
    }
}

function displayPlayer(player) {
    const playerNameElement = document.getElementById('playerName');
    const playerImageElement = document.getElementById('playerImage');

    if (playerNameElement && playerImageElement) {
        playerNameElement.textContent = player.name;

        playerImageElement.src = 'stilllife.png';
        if (player.image_url) {
            playerImageElement.src = player.image_url;
            playerImageElement.onerror = function () {
                this.onerror = null;
                this.src = 'stilllife.png';
            };
        }

        document.getElementById('result').textContent = '';
        document.getElementById('result').className = '';
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
    guessInput.value = '';

    if (playerNumber === 1) {
        player1HasGuessed = true;
        currentTurn = 2;
    } else {
        player2HasGuessed = true;
        currentTurn = 1;
    }

    // Sync turn to Firebase
    gameRef.update({ currentTurn: currentTurn });

    // If both players have guessed, start a new round
    if (player1HasGuessed && player2HasGuessed) {
        setTimeout(() => {
            startNewRound();  // Start a new round after both players have guessed
        }, 2000);
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

function isCloseMatch(guess, answer) {
    let simpleGuess = guess.trim().toLowerCase();
    let simpleAnswer = answer.trim().toLowerCase();
    return simpleAnswer.includes(simpleGuess);
}

// Update the turn indicator
function updateTurnIndicator(turn) {
    const turnIndicator = document.getElementById('turnIndicator');
    if (turn === 1) {
        turnIndicator.textContent = "Player 1's turn";
    } else {
        turnIndicator.textContent = "Player 2's turn";
    }
}

// Autocomplete suggestions
function showSuggestions(input, playerNumber) {
    const suggestionsContainer = document.getElementById(`suggestions${playerNumber}`);
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
                const collegeGuess = document.getElementById(`collegeGuess${playerNumber}`);
                if (collegeGuess) {
                    collegeGuess.value = suggestion;
                }
                suggestionsContainer.innerHTML = '';
            });
            suggestionsContainer.appendChild(suggestionItem);
        });
    }
}
