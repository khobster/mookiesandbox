let playersData = [];
let currentPlayer = null;
let correctStreak1 = 0;
let correctStreak2 = 0;
let player1HasGuessed = false;
let player2HasGuessed = false;
let currentDifficultyLevel = 1; // This can be used to control difficulty based on rarity scores

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
            if (data.currentPlayerID) {
                const storedPlayerID = data.currentPlayerID;

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

            // Sync the turn state across both players' screens
            const turnIndicator = document.getElementById('turnIndicator');
            if (turnIndicator) {
                turnIndicator.textContent = data.currentTurn === 1 ? "Player 1's turn" : "Player 2's turn";
            }
        }
    });
});

function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;

            // Use Plunko's method to sort players by rarity score and filter based on difficulty
            playersData.sort((a, b) => a.rarity_score - b.rarity_score);
            playersData = playersData.filter(player => 
                player.rarity_score <= currentDifficultyLevel || 
                (player.games_played > 500 && player.retirement_year < 2000)
            );

            // Start a new round or sync with existing data
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

    displayRandomPlayerWithRarity(); // Use the Plunko player selection technique
}

// Using Plunko's method to display a player based on rarity score
function displayRandomPlayerWithRarity() {
    if (playersData.length > 0) {
        const eligiblePlayers = playersData.filter(player => player.rarity_score <= currentDifficultyLevel);
        const randomIndex = Math.floor(Math.random() * eligiblePlayers.length);
        currentPlayer = eligiblePlayers[randomIndex];

        // Store the current player's ID in Firebase so both players get the same question
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

    // Clear the input field
    guessInput.value = '';

    // Mark the player's guess as completed
    if (playerNumber === 1) {
        player1HasGuessed = true;
        gameRef.update({ currentTurn: 2 });
    } else {
        player2HasGuessed = true;
    }

    // If both players have guessed, start a new round
    if (player1HasGuessed && player2HasGuessed) {
        setTimeout(() => {
            startNewRound();  // Start a new round after both players have guessed
        }, 2000);  // Wait 2 seconds before showing the next player
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
