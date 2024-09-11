let playersData = [];
let currentDifficultyLevel = 1;
let playerTurn = 1; // To alternate between Player 1 and Player 2
let playerProgress = { 1: "", 2: "" }; // Track P-I-G progress for both players
let maxLetters = 3; // For P-I-G game
let gameId; // Unique game session ID
let db; // Firebase Database Reference

document.addEventListener('DOMContentLoaded', () => {
    initFirebase(); // Initialize Firebase
    loadPlayersData();

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

function initFirebase() {
    // Firebase config
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
    };

    firebase.initializeApp(firebaseConfig);
    db = firebase.database();

    // Check if there's an existing gameId in the URL
    const urlParams = new URLSearchParams(window.location.search);
    gameId = urlParams.get('gameId');

    if (!gameId) {
        // Create a new game session if one doesn't exist
        createNewGame();
    } else {
        // Load the existing game state
        loadGameFromFirebase(gameId);
    }
}

function createNewGame() {
    // Generate a new unique game ID using Firebase push()
    const newGameRef = db.ref('games').push();
    gameId = newGameRef.key;

    // Update the URL to share with other players
    window.history.replaceState(null, null, `?gameId=${gameId}`);

    // Initialize game data in Firebase
    newGameRef.set({
        playerTurn: 1,
        playerProgress: { 1: "", 2: "" }
    });

    alert(`Share this URL with Player 2: ${window.location.href}`);
}

function loadGameFromFirebase(gameId) {
    const gameRef = db.ref(`games/${gameId}`);

    // Listen for game state changes
    gameRef.on('value', (snapshot) => {
        const gameState = snapshot.val();
        if (gameState) {
            playerTurn = gameState.playerTurn;
            playerProgress = gameState.playerProgress;
            updatePlayerProgressDisplay();
            updatePlayerTurn();
        }
    });
}

function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_ids.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            playersData.sort((a, b) => a.rarity_score - b.rarity_score);
            playersData = playersData.filter(player => player.rarity_score <= currentDifficultyLevel || (player.games_played > 500 && player.retirement_year < 2000));
            startStandardPlay();
        })
        .catch(error => {
            console.error('Error loading JSON:', error);
            const playerQuestionElement = document.getElementById('playerQuestion');
            if (playerQuestionElement) {
                playerQuestionElement.textContent = 'Error loading player data.';
            }
        });
}

function startStandardPlay() {
    displayRandomPlayer();
}

function displayRandomPlayer() {
    if (playersData.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        const player = playersData[randomIndex];
        displayPlayer(player);
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

        document.getElementById('collegeGuess').value = '';
        document.getElementById('result').textContent = '';
        document.getElementById('result').className = '';
    }
}

function displayPlayerFromDecade(decade) {
    const playersFromDecade = playersData.filter(player => {
        let playerYear = player.retirement_year;
        let playerDecade;
        
        if (playerYear >= 50 && playerYear <= 59) playerDecade = '1950s';
        else if (playerYear >= 60 && playerYear <= 69) playerDecade = '1960s';
        else if (playerYear >= 70 && playerYear <= 79) playerDecade = '1970s';
        else if (playerYear >= 80 && playerYear <= 89) playerDecade = '1980s';
        else if (playerYear >= 90 && playerYear <= 99) playerDecade = '1990s';
        else if (playerYear >= 0 && playerYear <= 9) playerDecade = '2000s';
        else if (playerYear >= 10 && playerYear <= 19) playerDecade = '2010s';
        else if (playerYear >= 20 && playerYear <= 29) playerDecade = '2020s';

        return playerDecade === decade;
    });

    if (playersFromDecade.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersFromDecade.length);
        const player = playersFromDecade[randomIndex];
        displayPlayer(player);
    } else {
        const playerQuestionElement = document.getElementById('playerQuestion');
        if (playerQuestionElement) {
            playerQuestionElement.textContent = `No players found for the ${decade}`;
        }
    }
}

function handleGuess() {
    console.log("Checking the guess...");

    const userGuess = document.getElementById('collegeGuess').value.trim().toLowerCase();
    const playerName = document.getElementById('playerName').textContent;
    const player = playersData.find(p => p.name === playerName);

    let isCorrect = player && isCloseMatch(userGuess, player.college || 'No College');
    updateStreakAndGenerateSnippetStandard(isCorrect, playerName, document.getElementById('result'), displayRandomPlayer);
}

function isCloseMatch(guess, answer) {
    return guess === answer.toLowerCase().trim();
}

function updateStreakAndGenerateSnippetStandard(isCorrect, playerName, resultElement, nextPlayerCallback) {
    if (isCorrect) {
        resultElement.textContent = "That's CORRECT!";
        resultElement.className = 'correct';
    } else {
        resultElement.textContent = "That's WRONG!";
        resultElement.className = 'incorrect';
        addLetterToPlayer(); // Add letter when wrong guess
    }

    setTimeout(() => {
        nextPlayerCallback();
    }, 2000);
}

// Add a letter (P-I-G logic) to the current player
function addLetterToPlayer() {
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
    updatePlayerTurn();  // Switch turns
}

// Update the progress display for both players
function updatePlayerProgressDisplay() {
    document.getElementById('player1Progress').textContent = `Player 1: ${playerProgress[1]}`;
    document.getElementById('player2Progress').textContent = `Player 2: ${playerProgress[2]}`;

    // Update Firebase
    db.ref(`games/${gameId}`).update({
        playerProgress: playerProgress
    });
}

// Switch to the next player's turn
function updatePlayerTurn() {
    playerTurn = playerTurn === 1 ? 2 : 1;
    document.getElementById('turnIndicator').textContent = `Player ${playerTurn}'s turn`;

    // Update Firebase
    db.ref(`games/${gameId}`).update({
        playerTurn: playerTurn
    });
}

// Set up autocomplete for college names
function setupAutoComplete() {
    const collegeGuess = document.getElementById('collegeGuess');
    const suggestionsContainer = document.getElementById('suggestions');

    collegeGuess.addEventListener('input', () => {
        const inputValue = collegeGuess.value.toLowerCase();
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
                collegeGuess.value = suggestion;
                suggestionsContainer.innerHTML = ''; // Clear suggestions once selected
            });
            suggestionsContainer.appendChild(suggestionItem);
        });
    });
}

function endGame(player) {
    alert(`Player ${player} has spelled P-I-G and lost the game!`);
    playerProgress = { 1: "", 2: "" };  // Reset progress
    updatePlayerProgressDisplay();
    playerTurn = 1;  // Reset to Player 1's turn
    updatePlayerTurn();
}
