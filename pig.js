let playersData = [];
let correctStreakStandard = 0;
let lastThreeCorrectStandard = [];
let currentDifficultyLevel = 1;
let isTwoForOneActive = false;
let twoForOneCounter = 0;
let playerTurn = 1;  // Track whose turn it is (Player 1 or Player 2)
let playerProgress = { 1: "", 2: "" };  // Track progress (P, I, G) for each player
let maxLetters = 3;  // P-I-G has 3 letters

// Load player data from JSON and initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData(); // Load player data
    startStandardPlay(); // Start the standard gameplay
    setupGuessHandler(); // Handle guesses from the input
    setupGoFishHandler(); // Handle GO 🐟 button functionality
    setupAutoComplete(); // Set up autocomplete functionality
});

// Load player data from JSON
function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            playersData.sort((a, b) => a.rarity_score - b.rarity_score); // Sort by rarity
            displayRandomPlayer(); // Show the first player
        })
        .catch(error => console.error('Error loading player data:', error));
}

// Display a random player
function displayRandomPlayer() {
    if (playersData.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        const player = playersData[randomIndex];
        displayPlayer(player);
    }
}

// Display player info (image, name)
function displayPlayer(player) {
    const playerNameElement = document.getElementById('playerName');
    const playerImageElement = document.getElementById('playerImage');
    if (playerNameElement && playerImageElement) {
        playerNameElement.textContent = player.name;
        playerImageElement.src = player.image_url || 'stilllife.png';
    }
}

// Handle user guesses and update game state
function setupGuessHandler() {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const userGuess = document.getElementById('collegeGuess').value.trim().toLowerCase();
            const playerName = document.getElementById('playerName').textContent;
            const player = playersData.find(p => p.name === playerName);
            let isCorrect = player && isCloseMatch(userGuess, player.college || 'No College');
            handleGuess(isCorrect, playerName);
        });
    }
}

// Handle correct and incorrect guesses
function handleGuess(isCorrect, playerName) {
    const resultElement = document.getElementById('result');
    if (isCorrect) {
        resultElement.textContent = 'Correct!';
        resultElement.classList.add('correct');
        resultElement.classList.remove('incorrect');
        correctStreakStandard++; // Increment streak
    } else {
        resultElement.textContent = 'Wrong! You get a letter.';
        resultElement.classList.add('incorrect');
        resultElement.classList.remove('correct');
        addLetterToCurrentPlayer();  // Add a letter (P, I, or G) to the current player
    }
    updatePlayerTurn();  // Switch to the next player's turn
    displayRandomPlayer();  // Show the next player
}

// Add a letter (P, I, or G) to the current player
function addLetterToCurrentPlayer() {
    const currentPlayer = playerTurn;
    const currentProgress = playerProgress[currentPlayer];
    if (currentProgress.length < maxLetters) {
        const newProgress = currentProgress + "PIG"[currentProgress.length];
        playerProgress[currentPlayer] = newProgress;
        updatePlayerProgressDisplay();
        if (newProgress === "PIG") {
            endGame(currentPlayer);  // End game if the player has spelled PIG
        }
    }
}

// Update the progress display for both players
function updatePlayerProgressDisplay() {
    document.getElementById('player1Progress').textContent = `Player 1: ${playerProgress[1]}`;
    document.getElementById('player2Progress').textContent = `Player 2: ${playerProgress[2]}`;
}

// Switch to the next player's turn
function updatePlayerTurn() {
    playerTurn = playerTurn === 1 ? 2 : 1;
    document.getElementById('turnIndicator').textContent = `Player ${playerTurn}'s turn`;
}

// Handle "GO 🐟" functionality
function setupGoFishHandler() {
    const goFishBtn = document.getElementById('goFishBtn');
    if (goFishBtn) {
        goFishBtn.addEventListener('click', () => {
            const decadeDropdownContainer = document.getElementById('decadeDropdownContainer');
            decadeDropdownContainer.style.display = 'block';
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
}

// Display player from a selected decade
function displayPlayerFromDecade(decade) {
    const playersFromDecade = playersData.filter(player => {
        let playerDecade = Math.floor(player.retirement_year / 10) * 10 + "s";
        return playerDecade === decade;
    });
    if (playersFromDecade.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersFromDecade.length);
        const player = playersFromDecade[randomIndex];
        displayPlayer(player);
    }
}

// Set up autocomplete suggestions for college names
function setupAutoComplete() {
    const collegeGuess = document.getElementById('collegeGuess');
    const suggestionsContainer = document.getElementById('suggestions');
    collegeGuess.addEventListener('input', () => {
        const inputValue = collegeGuess.value.toLowerCase();
        const suggestions = Array.from(new Set(playersData
            .map(player => player.college)
            .filter(college => college && college.toLowerCase().includes(inputValue))))
            .slice(0, 5);
        suggestionsContainer.innerHTML = '';
        suggestions.forEach(suggestion => {
            const suggestionItem = document.createElement('div');
            suggestionItem.textContent = suggestion;
            suggestionItem.classList.add('suggestion-item');
            suggestionItem.addEventListener('click', () => {
                collegeGuess.value = suggestion;
                suggestionsContainer.innerHTML = ''; // Clear suggestions once selected
            });
            suggestionsContainer.appendChild(suggestionItem);
        });
    });
}

// End the game if a player spells "PIG"
function endGame(player) {
    alert(`Player ${player} has spelled P-I-G and lost the game!`);
    playerProgress = { 1: "", 2: "" };  // Reset game state
    updatePlayerProgressDisplay();
    playerTurn = 1;  // Reset to Player 1's turn
    updatePlayerTurn();
}
