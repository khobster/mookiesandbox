let playersData = [];
let currentDifficultyLevel = 1;

document.addEventListener('DOMContentLoaded', () => {
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
});

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
    }
    
    setTimeout(() => {
        nextPlayerCallback();
    }, 2000);
}
