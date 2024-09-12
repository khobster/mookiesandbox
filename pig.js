let playersData = [];
let currentPlayer = null;
let correctStreak1 = 0;
let correctStreak2 = 0;
let player1HasGuessed = false;
let player2HasGuessed = false;

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

    // Listen for changes in the game data in Firebase
    gameRef.onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const turn = data.turn;
            const player1Guesses = data.player1Guesses;
            const player2Guesses = data.player2Guesses;

            // Update player turns and UI
            document.getElementById('turnIndicator').textContent = turn === 1 ? "Player 1's turn" : "Player 2's turn";

            // Load guesses
            if (player1Guesses) document.getElementById('collegeGuess1').value = player1Guesses;
            if (player2Guesses) document.getElementById('collegeGuess2').value = player2Guesses;
        }
    });
});

function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
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
                displayRandomPlayerByRarity();
            }
        } else {
            displayRandomPlayerByRarity();
        }
    }).catch((error) => {
        console.error("Error getting game data from Firebase: ", error);
    });
}

function displayRandomPlayerByRarity() {
    const weightedPlayers = playersData.filter(player => player.rarity_score <= 5);
    const randomIndex = Math.floor(Math.random() * weightedPlayers.length);
    currentPlayer = weightedPlayers[randomIndex];

    gameRef.set({ currentPlayerID: currentPlayer.id });

    displayPlayer(currentPlayer);
}

function displayPlayer(player) {
    const playerNameElement = document.getElementById('playerName');
    const playerImageElement = document.getElementById('playerImage');

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
    document.getElementById('turnIndicator').textContent = "Player 1's turn";
}

function handlePlayerGuess(playerNumber) {
    const guessInput = document.getElementById(`collegeGuess${playerNumber}`);
    const guess = guessInput.value.trim().toLowerCase();
  
    gameRef.get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const currentTurn = data.turn;

            if (currentTurn === playerNumber) {
                const isCorrect = isCloseMatch(guess, currentPlayer.college || 'No College');

                const updateData = {
                    [`player${playerNumber}Guesses`]: guess,
                    turn: currentTurn === 1 ? 2 : 1
                };

                gameRef.update(updateData).then(() => {
                    if (isCorrect) {
                        updateStreakAndDisplayResult(true, playerNumber);
                    } else {
                        updateStreakAndDisplayResult(false, playerNumber);
                    }

                    guessInput.value = '';
                });
            }
        }
    });
}

function updateStreakAndDisplayResult(isCorrect, playerNumber) {
    const resultElement = document.getElementById('result');

    if (isCorrect) {
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
    return answer.toLowerCase().includes(guess.toLowerCase());
}

function showSuggestions(input, playerNumber) {
    const suggestionsContainer = document.getElementById(`suggestions${playerNumber}`);
    suggestionsContainer.innerHTML = '';

    if (input.length === 0) return;

    const suggestions = Array.from(new Set(playersData
        .map(player => player.college)
        .filter(college => college.toLowerCase().includes(input.toLowerCase()))
    )).slice(0, 5);

    suggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.textContent = suggestion;
        suggestionItem.classList.add('suggestion-item');
        suggestionItem.addEventListener('click', () => {
            document.getElementById(`collegeGuess${playerNumber}`).value = suggestion;
            suggestionsContainer.innerHTML = '';
        });
        suggestionsContainer.appendChild(suggestionItem);
    });
}

document.getElementById('collegeGuess1').addEventListener('input', (e) => {
    showSuggestions(e.target.value, 1);
});

document.getElementById('collegeGuess2').addEventListener('input', (e) => {
    showSuggestions(e.target.value, 2);
});
