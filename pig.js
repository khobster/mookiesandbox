let playersData = [];
let correctStreakStandard = 0;
let lastThreeCorrectStandard = [];
let correctStreakURL = 0;
let lastThreeCorrectURL = [];
let currentDifficultyLevel = 1;
let cumulativeRarityScore = 0;
let isTwoForOneActive = false;
let twoForOneCounter = 0;
let highScore = 0; // High score variable

const correctSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const wrongSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

// Firebase: Submit Score Function
async function submitScore(player, score) {
    try {
        await db.collection("scores").add({
            player: player,
            score: score,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Score submitted successfully!");
    } catch (error) {
        console.error("Error submitting score: ", error);
    }
}

// Function to initialize the game and start polling
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData(); // Load player data and initialize the game

    // Event listener for the input field and autocomplete
    const collegeGuess = document.getElementById('collegeGuess');
    if (collegeGuess) {
        collegeGuess.addEventListener('input', (e) => {
            showSuggestions(e.target.value);
        });
    }

    // Event listener for the "Let's see if you're right" button
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.onclick = handleGuess;
    }

    // Event listener for the "GO 🐟" button
    const goFishBtn = document.getElementById('goFishBtn');
    if (goFishBtn) {
        goFishBtn.addEventListener('click', () => {
            if (isTwoForOneActive) return;
            const decadeDropdownContainer = document.getElementById('decadeDropdownContainer');
            if (decadeDropdownContainer) {
                decadeDropdownContainer.style.display = 'block';
            }
            goFishBtn.disabled = true;
            goFishBtn.classList.add('disabled');
        });
    }

    // Event listener for the decade dropdown
    const decadeDropdown = document.getElementById('decadeDropdown');
    if (decadeDropdown) {
        decadeDropdown.addEventListener('change', (e) => {
            const selectedDecade = e.target.value;
            if (selectedDecade) {
                displayPlayerFromDecade(selectedDecade);
                const decadeDropdownContainer = document.getElementById('decadeDropdownContainer');
                if (decadeDropdownContainer) {
                    decadeDropdownContainer.style.display = 'none';
                }
            }
        });
    }
});

// Function to handle guessing and check if it's correct
function handleGuess() {
    console.log('Checking the guess...');
    const userGuess = document.getElementById('collegeGuess').value.trim().toLowerCase();
    const playerName = document.getElementById('playerName').textContent;
    const player = playersData.find(p => p.name === playerName);

    if (!player) {
        console.error("No player found!");
        return;
    }

    let isCorrect = player && isCloseMatch(userGuess, player.college || 'No College');
    updateStreakAndGenerateSnippetStandard(isCorrect, playerName, document.getElementById('result'), displayRandomPlayer);
}

// Function to display suggestions based on user input
function showSuggestions(input) {
    const suggestionsContainer = document.getElementById('suggestions');
    if (!suggestionsContainer) return;

    suggestionsContainer.innerHTML = '';
    if (input.length === 0) return;

    const suggestions = Array.from(new Set(playersData
        .map(player => player.college)
        .filter(college => college && college.toLowerCase().includes(input.toLowerCase()))))
        .slice(0, 5); // Show top 5 suggestions

    suggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.textContent = suggestion;
        suggestionItem.classList.add('suggestion-item');
        suggestionItem.addEventListener('click', () => {
            const collegeGuess = document.getElementById('collegeGuess');
            if (collegeGuess) {
                collegeGuess.value = suggestion;
            }
            suggestionsContainer.innerHTML = ''; // Clear suggestions after selection
        });
        suggestionsContainer.appendChild(suggestionItem);
    });
}

// Utility functions and game logic...

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

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.onclick = handleGuess;
    }
}

function displayRandomPlayer() {
    if (playersData.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        const player = playersData[randomIndex];
        displayPlayer(player);
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

        document.getElementById('collegeGuess').value = '';
        document.getElementById('result').textContent = '';
        document.getElementById('result').className = '';
    } else {
        console.error("Player name or image element not found");
    }
}

function displayPlayerFromDecade(decade) {
    const playersFromDecade = playersData.filter(player => {
        let playerYear = player.retirement_year;
        let playerDecade = '';

        if (playerYear >= 50 && playerYear <= 59) {
            playerDecade = '1950s';
        } else if (playerYear >= 60 && playerYear <= 69) {
            playerDecade = '1960s';
        } else if (playerYear >= 70 && playerYear <= 79) {
            playerDecade = '1970s';
        } else if (playerYear >= 80 && playerYear <= 89) {
            playerDecade = '1980s';
        } else if (playerYear >= 90 && playerYear <= 99) {
            playerDecade = '1990s';
        } else if (playerYear >= 0 && playerYear <= 9) {
            playerDecade = '2000s';
        } else if (playerYear >= 10 && playerYear <= 19) {
            playerDecade = '2010s';
        } else if (playerYear >= 20 && playerYear <= 29) {
            playerDecade = '2020s';
        }

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
