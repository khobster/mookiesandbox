let playersData = [];
let playerTurn = 1; // To alternate between Player 1 and Player 2
let playerProgress = { 1: "", 2: "" }; // Track P-I-G progress for both players
let maxLetters = 3; // For P-I-G game
let gameId = 'unique_game_id'; // Replace this with a dynamic value for each game

document.addEventListener('DOMContentLoaded', () => {
    initializeGame(); // Initialize the game, including Firestore syncing

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleGuess);
    }

    const goFishBtn = document.getElementById('goFishBtn');
    if (goFishBtn) {
        goFishBtn.addEventListener('click', () => {
            document.getElementById('decadeDropdownContainer').style.display = 'block';
        });
    }

    const decadeDropdown = document.getElementById('decadeDropdown');
    if (decadeDropdown) {
        decadeDropdown.addEventListener('change', (e) => {
            const selectedDecade = e.target.value;
            if (selectedDecade) {
                displayPlayerFromDecade(selectedDecade);
                document.getElementById('decadeDropdownContainer').style.display = 'none';
            }
        });
    }

    setupAutoComplete(); // Setup autocomplete for college names
});

function initializeGame() {
    loadPlayersData(); // Load player data and start the game
    listenToGameUpdates(); // Listen to Firestore updates for syncing players
}

// Load players data from JSON or an API and start the game
function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            playersData.sort((a, b) => a.rarity_score - b.rarity_score); // Sort players by rarity
            startStandardPlay(); // Begin the standard game once data is loaded
        })
        .catch(error => {
            console.error('Error loading player data:', error);
        });
}

function startStandardPlay() {
    displayRandomPlayer(); // Show the first random player when the game starts
}

// Display a random player from the filtered player list
function displayRandomPlayer() {
    if (playersData.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        const player = playersData[randomIndex];
        displayPlayer(player);
    } else {
        console.log("No player data available.");
    }
}

// Display player info and their headshot
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

        document.getElementById('collegeGuess1').value = '';
        document.getElementById('collegeGuess2').value = '';
        document.getElementById('result').textContent = '';
        document.getElementById('result').className = '';
    }

    // Update Firestore with the current player question for syncing
    db.collection('games').doc(gameId).update({
        currentPlayerQuestion: player
    });
}

// Listen to Firestore updates to sync game state between players
function listenToGameUpdates() {
    db.collection('games').doc(gameId).onSnapshot((doc) => {
        const gameData = doc.data();
        
        // Sync the current player progress and turn
        playerProgress = gameData.playerProgress || { 1: "", 2: "" };
        playerTurn = gameData.playerTurn || 1;
        updatePlayerProgressDisplay();
        updatePlayerTurn();

        // Sync the current question
        if (gameData.currentPlayerQuestion) {
            displayPlayer(gameData.currentPlayerQuestion);
        }
    });
}

// Handle player guesses
function handleGuess() {
    const userGuess1 = document.getElementById('collegeGuess1').value.trim().toLowerCase();
    const userGuess2 = document.getElementById('collegeGuess2').value.trim().toLowerCase();
    const playerName = document.getElementById('playerName').textContent;
    const player = playersData.find(p => p.name === playerName);

    const isCorrect1 = player && isCloseMatch(userGuess1, player.college || 'No College');
    const isCorrect2 = player && isCloseMatch(userGuess2, player.college || 'No College');
    
    updateGameLogic(isCorrect1, isCorrect2, playerName);
}

// Check if the guess is close enough to the correct answer
function isCloseMatch(guess, answer) {
    return guess === answer.toLowerCase().trim();
}

// Handle the game logic for correct/incorrect guesses
function updateGameLogic(isCorrect1, isCorrect2, playerName) {
    const resultElement = document.getElementById('result');

    if (isCorrect1 !== isCorrect2) {
        if (isCorrect1) {
            playerProgress[2] += "PIG"[playerProgress[2].length];
            resultElement.textContent = "Player 2 gets a letter!";
            resultElement.className = 'incorrect';
        } else {
            playerProgress[1] += "PIG"[playerProgress[1].length];
            resultElement.textContent = "Player 1 gets a letter!";
            resultElement.className = 'incorrect';
        }
        updatePlayerProgressDisplay();
    } else {
        resultElement.textContent = "No letters given. Next question!";
        resultElement.className = 'correct';
    }

    setTimeout(() => {
        displayRandomPlayer();
    }, 2000);
}

// Update the progress display for both players
function updatePlayerProgressDisplay() {
    document.getElementById('player1Progress').textContent = `Player 1: ${playerProgress[1]}`;
    document.getElementById('player2Progress').textContent = `Player 2: ${playerProgress[2]}`;
}

// Set up autocomplete for college names
function setupAutoComplete() {
    const collegeGuess1 = document.getElementById('collegeGuess1');
    const collegeGuess2 = document.getElementById('collegeGuess2');
    const suggestionsContainer = document.getElementById('suggestions');

    const handleAutoComplete = (inputElement) => {
        const inputValue = inputElement.value.toLowerCase();
        const suggestions = Array.from(new Set(playersData
            .map(player => player.college)
            .filter(college => college && college.toLowerCase().includes(inputValue))))
            .slice(0, 5); // Show up to 5 suggestions

        suggestionsContainer.innerHTML = '';
        suggestions.forEach(suggestion => {
            const suggestionItem = document.createElement('div');
            suggestionItem.textContent = suggestion;
            suggestionItem.classList.add('suggestion-item');
            suggestionItem.addEventListener('click', () => {
                inputElement.value = suggestion;
                suggestionsContainer.innerHTML = ''; // Clear suggestions once selected
            });
            suggestionsContainer.appendChild(suggestionItem);
        });
    };

    collegeGuess1.addEventListener('input', () => handleAutoComplete(collegeGuess1));
    collegeGuess2.addEventListener('input', () => handleAutoComplete(collegeGuess2));
}
