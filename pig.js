let playersData = [];
let currentDifficultyLevel = 1;
let player1Answer = null;
let player2Answer = null;
let player1Ready = false;
let player2Ready = false;
let currentDecade = null;
let player1Progress = ""; // Track P-I-G progress for player 1
let player2Progress = ""; // Track P-I-G progress for player 2
let currentPlayerPickingDecade = 1; // Player 1 picks the decade first
let gameId = 'unique_game_id'; // Replace this with a dynamic value for each game

document.addEventListener('DOMContentLoaded', () => {
    initializeGame();

    const submitBtn1 = document.getElementById('submitBtn1');
    const submitBtn2 = document.getElementById('submitBtn2');
    
    submitBtn1.addEventListener('click', () => handleGuess(1));
    submitBtn2.addEventListener('click', () => handleGuess(2));

    const goFishBtn = document.getElementById('goFishBtn');
    goFishBtn.addEventListener('click', handleDecadeSelection);

    const decadeDropdown = document.getElementById('decadeDropdown');
    decadeDropdown.addEventListener('change', (e) => {
        const selectedDecade = e.target.value;
        if (selectedDecade) {
            currentDecade = selectedDecade;
            displayQuestionFromDecade(currentDecade);
        }
    });

    setupAutoComplete();
});

function initializeGame() {
    loadPlayersData();
    listenToGameUpdates(); // Sync with Firestore if necessary
}

function handleGuess(playerNumber) {
    const userGuess = document.getElementById(`collegeGuess${playerNumber}`).value.trim().toLowerCase();
    const playerName = document.getElementById('playerName').textContent;
    const player = playersData.find(p => p.name === playerName);

    let isCorrect = player && isCloseMatch(userGuess, player.college || 'No College');
    
    if (playerNumber === 1) {
        player1Answer = isCorrect;
        player1Ready = true;
    } else {
        player2Answer = isCorrect;
        player2Ready = true;
    }

    // Check if both players have submitted their answers
    if (player1Ready && player2Ready) {
        compareAnswers();
    }
}

function compareAnswers() {
    if (player1Answer && !player2Answer) {
        addLetterToPlayer(2); // Player 2 gets a letter
    } else if (!player1Answer && player2Answer) {
        addLetterToPlayer(1); // Player 1 gets a letter
    }

    // Reset answers and move to the next question
    player1Ready = false;
    player2Ready = false;
    player1Answer = null;
    player2Answer = null;

    passTurnToNextDecadeSelection();
}

function addLetterToPlayer(playerNumber) {
    let progress = playerNumber === 1 ? player1Progress : player2Progress;

    if (progress.length < 3) {
        const newProgress = progress + "PIG"[progress.length];
        if (playerNumber === 1) {
            player1Progress = newProgress;
        } else {
            player2Progress = newProgress;
        }
        updatePlayerProgressDisplay();

        if (newProgress === "PIG") {
            endGame(playerNumber); // End game if a player reaches "PIG"
        }
    }
}

function updatePlayerProgressDisplay() {
    document.getElementById('player1Progress').textContent = `Player 1: ${player1Progress}`;
    document.getElementById('player2Progress').textContent = `Player 2: ${player2Progress}`;
}

function handleDecadeSelection() {
    const selectedDecade = document.getElementById('decadeDropdown').value;
    if (selectedDecade) {
        currentDecade = selectedDecade;
        displayQuestionFromDecade(currentDecade);
        passTurnToNextDecadeSelection();
    }
}

function passTurnToNextDecadeSelection() {
    currentPlayerPickingDecade = currentPlayerPickingDecade === 1 ? 2 : 1;
    document.getElementById('turnIndicator').textContent = `Player ${currentPlayerPickingDecade} picks the decade for the next question.`;
}

function displayQuestionFromDecade(decade) {
    const playersFromDecade = playersData.filter(player => {
        let playerYear = player.retirement_year;

        let playerDecade;
        if (playerYear >= 1950 && playerYear <= 1959) {
            playerDecade = '1950s';
        } else if (playerYear >= 1960 && playerYear <= 1969) {
            playerDecade = '1960s';
        } else if (playerYear >= 1970 && playerYear <= 1979) {
            playerDecade = '1970s';
        } else if (playerYear >= 1980 && playerYear <= 1989) {
            playerDecade = '1980s';
        } else if (playerYear >= 1990 && playerYear <= 1999) {
            playerDecade = '1990s';
        } else if (playerYear >= 2000 && playerYear <= 2009) {
            playerDecade = '2000s';
        } else if (playerYear >= 2010 && playerYear <= 2019) {
            playerDecade = '2010s';
        } else if (playerYear >= 2020 && playerYear <= 2029) {
            playerDecade = '2020s';
        }

        return playerDecade === decade;
    });

    if (playersFromDecade.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersFromDecade.length);
        const player = playersFromDecade[randomIndex];
        displayPlayer(player);
    } else {
        document.getElementById('playerQuestion').textContent = `No players found for the ${decade}`;
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

        document.getElementById('collegeGuess1').value = '';
        document.getElementById('collegeGuess2').value = '';
        document.getElementById('result').textContent = '';
    }
}
