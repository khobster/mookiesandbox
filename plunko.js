let playersData = [];
let correctStreakStandard = 0;
let lastThreeCorrectStandard = [];
let correctStreakURL = 0;
let lastThreeCorrectURL = [];
let currentDifficultyLevel = 1;
let cumulativeRarityScore = 0;

const correctSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/bing-bong.mp3');
const wrongSound = new Audio('https://vanillafrosting.agency/wp-content/uploads/2023/11/incorrect-answer-for-plunko.mp3');

function simplifyString(str) {
    return str.trim().toLowerCase().replace(/university|college|the| /g, '');
}

function isCloseMatch(guess, answer) {
    if (!guess.trim()) {
        return false;
    }

    let simpleGuess = guess.trim().toLowerCase();
    let simpleAnswer = answer.trim().toLowerCase();

    let normalizedGuess = simpleGuess.replace(/[^a-zA-Z0-9]/g, '');

    const noCollegePhrases = [
        "didntgotocollege",
        "didnotgotocollege",
        "hedidntgotocollege",
        "hedidnotgotocollege",
        "nocollege",
        "didntgotocollege",
        "didnotgotocollege",
        "hedidntgotocollege",
        "hedidnotgotocollege"
    ];

    if (noCollegePhrases.includes(normalizedGuess) && simpleAnswer === '') {
        return true;
    }

    if (simpleAnswer === 'unc' && (simpleGuess === 'north carolina' || simpleGuess === 'carolina')) {
        return true;
    }

    return simpleAnswer.includes(simpleGuess);
}

function updateStreakAndGenerateSnippetStandard(isCorrect, playerName, resultElement, nextPlayerCallback) {
    const player = playersData.find(p => p.name === playerName);

    if (isCorrect && player) {
        correctStreakStandard++;
        lastThreeCorrectStandard.push(playerName);
        cumulativeRarityScore += player.rarity_score;

        if (lastThreeCorrectStandard.length > 3) {
            lastThreeCorrectStandard.shift();
        }
        if (correctStreakStandard === 1) {
            resultElement.innerHTML = "That's <span style='color: yellow;'>CORRECT!</span> Now you need to get just two more to get a <span class='kaboom'>PLUNKO!</span>";
        } else if (correctStreakStandard === 2) {
            resultElement.innerHTML = "That's <span style='color: yellow;'>CORRECT!</span> Now you need to get just one more to get a <span class='kaboom'>PLUNKO!</span>";
        } else if (correctStreakStandard === 3) {
            resultElement.innerHTML = "<span class='kaboom'>PLUNKO!</span>";
            const encodedPlayers = encodeURIComponent(lastThreeCorrectStandard.join(','));
            const shareLink = `https://khobster.github.io/plunkosandbox?players=${encodedPlayers}`;
            let shareText = `I challenge you to this PLUNK🏀:\n${shareLink}`;
            document.getElementById('shareSnippet').innerHTML = shareText;
            document.getElementById('snippetMessage').innerHTML = 'Challenge friends with this PLUNK🏀:';
            document.getElementById('snippetMessage').style.display = 'block'; // Show the message
            document.getElementById('shareSnippet').style.display = 'block'; // Show the share snippet
            document.getElementById('copyButton').setAttribute('data-snippet', shareText); // Set the share snippet as data-snippet
            document.getElementById('copyButton').style.display = 'inline-block';
            increaseDifficulty();
            correctStreakStandard = 0; // Reset the correct streak after achieving PLUNKO
            lastThreeCorrectStandard = []; // Clear the list of last three correct players after achieving PLUNKO
        }
        document.getElementById('plunkosCount').textContent = `${Math.round(cumulativeRarityScore)}`;
        resultElement.className = 'correct';
        correctSound.play();
    } else {
        correctStreakStandard = 0;
        lastThreeCorrectStandard = [];
        cumulativeRarityScore = 0; // Reset the cumulative rarity score when the streak is broken
        document.getElementById('plunkosCount').textContent = '0'; // Update the display
        resultElement.textContent = 'Wrong answer. Try again!';
        resultElement.className = 'incorrect';
        document.getElementById('snippetMessage').style.display = 'none';
        document.getElementById('shareSnippet').style.display = 'none';
        document.getElementById('copyButton').style.display = 'none';
        wrongSound.play();
    }
    setTimeout(nextPlayerCallback, 3000); // Show next player after a delay
}

function increaseDifficulty() {
    currentDifficultyLevel += 0.1; // Increment by a smaller step for more gradual difficulty increase
    playersData = playersData.filter(player => player.rarity_score <= currentDifficultyLevel || (player.games_played > 500 && player.retirement_year < 2000));
}

function updateStreakAndGenerateSnippetURL(isCorrect, playerName, resultElement, nextPlayerCallback, playerIndex, totalPlayers) {
    console.log('updateStreakAndGenerateSnippetURL called with:', {
        isCorrect,
        playerIndex,
        playerName,
        totalPlayers
    });

    const player = playersData.find(p => p.name === playerName);

    if (isCorrect && player) {
        correctStreakURL++;
        lastThreeCorrectURL.push(playerName);
        cumulativeRarityScore += player.rarity_score;

        if (lastThreeCorrectURL.length > 3) {
            lastThreeCorrectURL.shift();
        }
        if (correctStreakURL === totalPlayers) {
            console.log('User got all 3 correct in URL play.');

            // Display PLUNKO! message
            resultElement.textContent = ''; // Clear previous content
            const messageElement = document.createElement('span');
            messageElement.className = 'kaboom';
            messageElement.innerHTML = 'YES! PLUNKO!!';
            resultElement.appendChild(messageElement);
            resultElement.className = 'correct';
            console.log('Appended message element to resultElement:', resultElement.innerHTML);

            // Add share snippet and buttons
            setTimeout(() => {
                const shareText = `I got all 3 correct in PLUNKO! Check it out: ${window.location.href}`;
                document.getElementById('copyButton').setAttribute('data-snippet', shareText); // Set the share snippet as data-snippet
                document.getElementById('copyButton').style.display = 'inline-block';

                const proofText = `Proof I nailed the PLUNK🏀 challenge: ${window.location.href}`;
                document.getElementById('proofButton').setAttribute('data-snippet', proofText); // Set proof text as data-snippet
                document.getElementById('proofButton').style.display = 'inline-block'; // Show proof button

                document.getElementById('returnButton').style.display = 'inline-block';
                document.getElementById('returnButton').textContent = 'Start a Fresh PLUNK🏀';
                document.getElementById('submitBtn').style.display = 'none';
                document.getElementById('plunkosCount').textContent = `${Math.round(cumulativeRarityScore)}`;
                increaseDifficulty();
                correctStreakURL = 0; // Reset the correct streak after achieving PLUNKO
                lastThreeCorrectURL = []; // Clear the list of last three correct players after achieving PLUNKO
                endURLChallenge(true); // call the function right away on PLUNKO
            }, 1000);

            correctSound.play();
        } else {
            resultElement.innerHTML = "That's <span style='color: yellow;'>CORRECT!</span> Keep going!";
            resultElement.className = 'correct';
            setTimeout(() => {
                nextPlayerCallback(playerIndex + 1);
            }, 1000);
        }
        correctSound.play();
    } else {
        correctStreakURL = 0;
        lastThreeCorrectURL = [];
        cumulativeRarityScore = 0; // Reset the cumulative rarity score when the streak is broken
        document.getElementById('plunkosCount').textContent = '0'; // Update the display
        resultElement.textContent = 'Wrong answer. Try again!';
        resultElement.className = 'incorrect';
        document.getElementById('copyButton').style.display = 'none';
        document.getElementById('proofButton').style.display = 'none'; // Hide proof button on incorrect
        document.getElementById('returnButton').style.display = 'inline-block';
        document.getElementById('returnButton').textContent = 'Start a Fresh PLUNK🏀';
        wrongSound.play();
        endURLChallenge(false); // call the function right away on incorrect answer
    }
}

function copyToClipboard() {
    const snippetText = this.getAttribute('data-snippet');
    const textToCopy = snippetText || window.location.href;

    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = this.textContent;
        this.textContent = 'Copied!';
        setTimeout(() => this.textContent = originalText, 2000);
    });
}

function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/plunkosandbox/main/updated_test_data_with_rarity.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            playersData.sort((a, b) => a.rarity_score - b.rarity_score); // Sort by rarity score
            playersData = playersData.filter(player => player.rarity_score <= currentDifficultyLevel || (player.games_played > 500 && player.retirement_year < 2000)); // Filter initial players
            const urlPlayers = getPlayersFromURL();
            if (urlPlayers.length > 0) {
                startURLChallenge(urlPlayers);
            } else {
                startStandardPlay();
            }
        })
        .catch(error => {
            console.error('Error loading JSON:', error);
            document.getElementById('playerQuestion').textContent = 'Error loading player data.';
        });
}

function startStandardPlay() {
    displayRandomPlayer();

    // Hide the return button at the start of standard play
    document.getElementById('returnButton').style.display = 'none';

    document.getElementById('submitBtn').onclick = function() {
        // Hide the snippet and copy button on the next question attempt
        document.getElementById('snippetMessage').style.display = 'none';
        document.getElementById('shareSnippet').style.display = 'none';
        document.getElementById('copyButton').style.display = 'none';
        document.getElementById('proofButton').style.display = 'none'; // Hide proof button in standard play

        const userGuess = document.getElementById('collegeGuess').value.trim().toLowerCase();
        const playerName = document.getElementById('playerName').textContent;
        const player = playersData.find(p => p.name === playerName);
        let isCorrect = player && isCloseMatch(userGuess, player.college || 'No College');
        updateStreakAndGenerateSnippetStandard(isCorrect, playerName, document.getElementById('result'), displayRandomPlayer);
    };
}

function displayRandomPlayer() {
    if (playersData.length > 0) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        const player = playersData[randomIndex];
        document.getElementById('playerName').textContent = player.name;
        document.getElementById('collegeGuess').value = '';
        document.getElementById('result').textContent = '';
        document.getElementById('result').className = '';
    } else {
        console.log("No data available");
    }
}

function displayPlayer(player) {
    document.getElementById('playerName').textContent = player.name;
    document.getElementById('collegeGuess').value = '';
    document.getElementById('result').textContent = '';
    document.getElementById('result').className = '';
}

function startURLChallenge(playerNames) {
    let playerIndex = 0;
    correctStreakURL = 0; // Reset correct streak when starting a shared link sequence
    lastThreeCorrectURL = []; // Clear last three correct players

    function nextPlayer(index) {
        if (index < playerNames.length) {
            const playerName = playerNames[index];
            const player = playersData.find(p => p.name === playerName);
            if (player) {
                displayPlayer(player);
                document.getElementById('submitBtn').onclick = function() {
                    // Hide the snippet and copy button on the next question attempt
                    document.getElementById('snippetMessage').style.display = 'none';
                    document.getElementById('shareSnippet').style.display = 'none';
                    document.getElementById('copyButton').style.display = 'none';
                    document.getElementById('proofButton').style.display = 'none'; // Hide proof button in URL play until needed

                    const userGuess = document.getElementById('collegeGuess').value.trim().toLowerCase();
                    let isCorrect = player && isCloseMatch(userGuess, player.college || 'No College');
                    updateStreakAndGenerateSnippetURL(isCorrect, player.name, document.getElementById('result'), nextPlayer, index, playerNames.length);
                };
            } else {
                nextPlayer(index + 1); // Skip to the next player if not found
            }
        } else {
            endURLChallenge(true);
        }
    }
    nextPlayer(playerIndex);
}

function endURLChallenge(success) {
    const resultElement = document.getElementById('result');
    if (success) {
        resultElement.innerHTML += "<span class='kaboom'><br>Hit Copy & Challenge a Pal!<br>Or Grab Your Receipt!</span>";
        resultElement.className = 'correct';
    } else {
        resultElement.innerHTML = "You didn't get all 3 correct. Better luck next time!";
        resultElement.className = 'incorrect';
    }
    const shareText = `Can you match my PLUNK🏀 score? ${Math.round(cumulativeRarityScore)}! ${window.location.href}`;
    document.getElementById('copyButton').setAttribute('data-snippet', shareText); // Set the current snippet as data-snippet
    document.getElementById('copyButton').style.display = 'inline-block';

    if (success) {
        const proofText = `PROOF I nailed your PLUNK🏀 challenge!🧾 ${window.location.href}`;
        document.getElementById('proofButton').setAttribute('data-snippet', proofText); // Set proof text as data-snippet
        document.getElementById('proofButton').style.display = 'inline-block'; // Show proof button
    }

    document.getElementById('returnButton').style.display = 'inline-block';
    document.getElementById('returnButton').textContent = 'Play again';
    document.getElementById('submitBtn').style.display = 'none';
}

function getPlayersFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const playersParam = urlParams.get('players');
    if (playersParam) {
        return playersParam.split(',');
    }
    return [];
}

function showSuggestions(input) {
    const suggestionsContainer = document.getElementById('suggestions');
    suggestionsContainer.innerHTML = '';
    if (input.length === 0) {
        return;
    }
    const suggestions = Array.from(new Set(playersData
        .map(player => player.college)
        .filter(college => college && college.toLowerCase().includes(input.toLowerCase()))))
        .slice(0, 5); // Show up to 5 unique suggestions
    suggestions.forEach(suggestion => {
        const suggestionItem = document.createElement('div');
        suggestionItem.textContent = suggestion;
        suggestionItem.classList.add('suggestion-item');
        suggestionItem.addEventListener('click', () => {
            document.getElementById('collegeGuess').value = suggestion;
            suggestionsContainer.innerHTML = '';
        });
        suggestionsContainer.appendChild(suggestionItem);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData();

    document.getElementById('collegeGuess').addEventListener('input', (e) => {
        showSuggestions(e.target.value);
    });

    document.getElementById('copyButton').addEventListener('click', copyToClipboard);
    document.getElementById('proofButton').addEventListener('click', copyToClipboard); // Add event listener for proof button
    document.getElementById('returnButton').addEventListener('click', () => {
        window.location.href = 'https://khobster.github.io/plunkosandbox';
    });

    // Tooltip handling for mobile
    const tooltip = document.querySelector('.tooltip');
    tooltip.addEventListener('click', (e) => {
        e.stopPropagation();
        tooltip.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!tooltip.contains(e.target)) {
            tooltip.classList.remove('active');
        }
    });
});
