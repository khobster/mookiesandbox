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

// Firebase: Get Today's Top Scores Function
async function getTodaysTopScores() {
    try {
        const now = new Date();

        // Get the start and end of the day in UTC, but as Firestore Timestamp objects
        const startOfDay = firebase.firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
        const endOfDay = firebase.firestore.Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));

        console.log(`Querying scores between ${startOfDay.toDate()} and ${endOfDay.toDate()} in UTC`);

        // Query the database filtering by today's timestamp
        const querySnapshot = await db.collection("scores")
            .where("timestamp", ">=", startOfDay)
            .where("timestamp", "<=", endOfDay)
            .get();

        const scores = [];
        querySnapshot.forEach((doc) => {
            const scoreData = doc.data();
            if (scoreData.score > 0) { // Ignore scores of 0
                scores.push(scoreData);
            }
        });

        console.log(`Retrieved ${scores.length} scores for today.`);
        return scores;
    } catch (error) {
        console.error("Error retrieving today's scores: ", error);
        return [];
    }
}

// Function to Update Rank Display
async function updateRankDisplay(playerScore) {
    const rankTextElement = document.getElementById('highScore');
    const loadingElement = document.getElementById('loadingRank');

    // Show loading animation
    loadingElement.style.display = 'inline';

    // Get today's top scores and determine the rank
    let topScores = await getTodaysTopScores();

    // Add the current player's score to the list
    topScores.push({ score: playerScore });

    // Sort the scores in descending order
    topScores.sort((a, b) => b.score - a.score);

    // Find the rank of the user's score
    let rank = topScores.findIndex(score => score.score === playerScore) + 1;

    // Hide loading animation
    loadingElement.style.display = 'none';

    // If no scores, inform the player
    if (topScores.length === 0) {
        rankTextElement.textContent = `No scores for today yet. Be the first!`;
    } else {
        // Update the rankText with the rank and trophy emoji
        rankTextElement.textContent = `🏆 =${Math.round(playerScore)} (#${rank} best today)`;
    }

    rankTextElement.classList.add('animated-rank');
}

// Function to start polling for rank updates
function startPollingForRankUpdates() {
    setInterval(async () => {
        await updateRankDisplay(highScore);
    }, 30000); // Poll every 30 seconds
}

// Function to initialize the game and start polling
document.addEventListener('DOMContentLoaded', () => {
    loadPlayersData(); // Load player data and initialize the game

    startPollingForRankUpdates(); // Start polling for rank updates

    // Other event listeners...
    const collegeGuess = document.getElementById('collegeGuess');
    if (collegeGuess) {
        collegeGuess.addEventListener('input', (e) => {
            showSuggestions(e.target.value);
        });
    }

    const splitItBtn = document.getElementById('splitItBtn');
    if (splitItBtn) {
        splitItBtn.addEventListener('click', () => {
            if (isTwoForOneActive) {
                return;
            }
            const playingTwoForOne = document.getElementById('playingTwoForOne');
            if (playingTwoForOne) {
                playingTwoForOne.style.display = 'inline';
                playingTwoForOne.textContent = 'playing 2 for 1 now';
            }
            isTwoForOneActive = true;
            twoForOneCounter = 0;
            splitItBtn.disabled = true;
            splitItBtn.classList.add('disabled');
            const goFishBtn = document.getElementById('goFishBtn');
            if (goFishBtn) {
                goFishBtn.disabled = true;
                goFishBtn.classList.add('disabled');
            }
            displayRandomPlayer();
        });
    }

    const goFishBtn = document.getElementById('goFishBtn');
    if (goFishBtn) {
        goFishBtn.addEventListener('click', () => {
            if (isTwoForOneActive) {
                return;
            }
            const decadeDropdownContainer = document.getElementById('decadeDropdownContainer');
            if (decadeDropdownContainer) {
                decadeDropdownContainer.style.display = 'block';
            }
            goFishBtn.disabled = true;
            goFishBtn.classList.add('disabled');
        });
    }

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

    const copyButton = document.getElementById('copyButton');
    if (copyButton) {
        copyButton.addEventListener('click', copyToClipboard);
    }

    const popupCopyButton = document.getElementById('popupCopyButton');
    if (popupCopyButton) {
        popupCopyButton.addEventListener('click', copyToClipboard);
    }

    const proofButton = document.getElementById('proofButton');
    if (proofButton) {
        proofButton.addEventListener('click', copyToClipboard);
    }

    const returnButton = document.getElementById('returnButton');
    if (returnButton) {
        returnButton.addEventListener('click', () => {
            window.location.href = 'https://www.mookie.click';
        });
    }

    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
        tooltip.addEventListener('click', (e) => {
            e.stopPropagation();
            tooltip.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!tooltip.contains(e.target)) {
                tooltip.classList.remove('active');
            }
        });
    }

    const popupContinueButton = document.getElementById('popupContinueButton');
    if (popupContinueButton) {
        popupContinueButton.addEventListener('click', function () {
            closeMookiePopup();
            if (popupContinueButton.classList.contains('standard-mode')) {
                correctStreakStandard = 0;
                lastThreeCorrectStandard = [];
                startStandardPlay();
            } else {
                window.location.href = 'https://www.mookie.click';
            }
        });
    }

    const closePopup = document.getElementById('closePopup');
    if (closePopup) {
        closePopup.addEventListener('click', function () {
            closeMookiePopup();
        });
    }

    const popupProofButton = document.getElementById('proofButtonPopup');
    if (popupProofButton) {
        popupProofButton.addEventListener('click', () => {
            const correctCount = lastThreeCorrectURL.length;
            const proofText = generateShareText(true, correctCount, lastThreeCorrectURL.length);
            navigator.clipboard.writeText(proofText).then(() => {
                popupProofButton.textContent = 'Receipt Copied!';
                setTimeout(() => popupProofButton.textContent = 'Grab Your Receipt!', 2000);
            });
        });
    }
});

// Utility functions and game logic...

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
    ];

    if (noCollegePhrases.includes(normalizedGuess) && simpleAnswer === '') {
        return true;
    }

    if (simpleAnswer === 'unc' && (simpleGuess === 'north carolina' || simpleGuess === 'carolina')) {
        return true;
    }

    return simpleAnswer.includes(simpleGuess);
}

function generateShareText(isChallengeMode, correctCount, totalPlayers) {
    const score = Math.round(cumulativeRarityScore);
    const correctEmojis = new Array(correctCount).fill('🟢').join(' ');
    const incorrectEmojis = new Array(totalPlayers - correctCount).fill('🔴').join(' ');

    // Format the basic share text
    let shareText = `🔌 MOOKIE! 🔌\n\n${correctEmojis} ${incorrectEmojis}\n\n🏆 ${score}\nPlay at:\n`;

    // Dynamically get the current players for the challenge
    let currentPlayers = isChallengeMode ? lastThreeCorrectURL : lastThreeCorrectStandard;
    
    // Encode the players into the URL
    const encodedPlayers = encodeURIComponent(currentPlayers.join(','));

    // Update the URL to use the dynamically encoded players
    shareText += `https://www.mookie.click/?players=${encodedPlayers}`;

    // Optional: Add any extra social tagging if needed
    shareText += `\nBluesky: @mookieGame`;

    return shareText;
}

function updateStreakAndGenerateSnippetStandard(isCorrect, playerName, resultElement, nextPlayerCallback) {
    const bucketScoreElement = document.getElementById('plunkosCounter');

    if (bucketScoreElement) {
        bucketScoreElement.style.display = 'none';
    }

    const player = playersData.find(p => p.name === playerName);

    if (isCorrect && player) {
        if (isTwoForOneActive) {
            isCorrect = handleTwoForOne(true);
        }

        if (!isTwoForOneActive || isCorrect) {
            correctStreakStandard++;
            lastThreeCorrectStandard.push(playerName);
            cumulativeRarityScore += player.rarity_score;

            if (cumulativeRarityScore > highScore) {
                highScore = cumulativeRarityScore;  // Update high score
                document.getElementById('highScore').textContent = `🏆 =${Math.round(highScore)}`;
                submitScore('PlayerName', highScore); // Submit the score
            }

            if (lastThreeCorrectStandard.length > 3) {
                lastThreeCorrectStandard.shift();
            }

            if (correctStreakStandard === 1) {
                resultElement.innerHTML = "That's <span style='color: yellow;'>CORRECT!</span> Now you need to get just two more to get this <span class='kaboom'>MOOoooOOKIE!</span>";
            } else if (correctStreakStandard === 2) {
                resultElement.innerHTML = "That's <span style='color: yellow;'>CORRECT!</span> Now you need to get just one more to get a <span class='kaboom'>MOOoooOOKIE!</span>";
            } else if (correctStreakStandard === 3) {
                resultElement.innerHTML = "<span class='kaboom'>MOOoooooOOOOKIE!</span>";
                const shareText = generateShareText(false, correctStreakStandard, 3); // Standard mode

                showMookiePopup(shareText, false); // Pass false to indicate standard mode

                correctStreakStandard = 0;
                lastThreeCorrectStandard = [];
                resetButtons();
            }
            document.getElementById('plunkosCount').textContent = `${Math.round(cumulativeRarityScore)}`;
            resultElement.className = 'correct';
            correctSound.play();
        }
    } else {
        if (isTwoForOneActive) {
            isCorrect = handleTwoForOne(false);
        }

        if (!isTwoForOneActive || !isCorrect) {
            correctStreakStandard = 0;
            lastThreeCorrectStandard = [];
            cumulativeRarityScore = 0;  // Reset only the cumulative rarity score
            document.getElementById('plunkosCount').textContent = '0';
            resultElement.textContent = 'Wrong answer. Try again!';
            resultElement.className = 'incorrect';
            wrongSound.play();
            resetButtons();

            // Ensure rank display remains after a wrong answer
            updateRankDisplay(highScore);
        }
    }

    setTimeout(() => {
        if (bucketScoreElement) {
            bucketScoreElement.style.display = 'block';
        }
        nextPlayerCallback();
    }, 3000);
}

function resetGameForNextChallenge() {
    correctStreakURL = 0;
    lastThreeCorrectURL = [];
    cumulativeRarityScore = 0; // Reset only cumulative score
    resetButtons();
}

function updateStreakAndGenerateSnippetURL(isCorrect, playerName, resultElement, nextPlayerCallback, playerIndex, totalPlayers) {
    const player = playersData.find(p => p.name === playerName);

    if (isCorrect && player) {
        correctStreakURL++;
        lastThreeCorrectURL.push(playerName);
        cumulativeRarityScore += player.rarity_score;

        console.log(`Challenge mode: cumulativeRarityScore updated to ${cumulativeRarityScore}, correctStreakURL: ${correctStreakURL}, totalPlayers: ${totalPlayers}`);

        if (lastThreeCorrectURL.length > totalPlayers) {
            lastThreeCorrectURL.shift();
        }

        if (correctStreakURL === totalPlayers) {
            resultElement.textContent = 'YES! MOOOOooooooKIE!!';
            resultElement.className = 'correct';

            const shareText = generateShareText(true, correctStreakURL, totalPlayers);
            showMookiePopup(shareText, true);

            correctSound.play();
            resetGameForNextChallenge();

            if (cumulativeRarityScore > highScore) {
                highScore = cumulativeRarityScore; // Update high score
                document.getElementById('highScore').textContent = `🏆 =${Math.round(highScore)}`;
                submitScore('PlayerName', highScore); // Submit the score
            }
        } else {
            resultElement.innerHTML = "That's correct! Keep going!";
            resultElement.className = 'correct';
            setTimeout(() => {
                nextPlayerCallback(playerIndex + 1);
            }, 1000);
        }
        correctSound.play();
    } else {
        console.log('Incorrect answer detected.');
        const shareText = generateShareText(true, correctStreakURL, totalPlayers);
        resultElement.textContent = 'Wrong answer. Try again!';
        resultElement.className = 'incorrect';
        showNopePopup(shareText);
        correctStreakURL = 0;
        lastThreeCorrectURL = [];
        cumulativeRarityScore = 0;
        resetButtons();
        endURLChallenge(false);
    }

    setTimeout(() => {
        nextPlayerCallback(playerIndex + 1);
    }, 3000);
}

function resetButtons() {
    const goFishBtn = document.getElementById('goFishBtn');
    const splitItBtn = document.getElementById('splitItBtn');

    if (goFishBtn) {
        goFishBtn.disabled = false;
        goFishBtn.classList.remove('disabled');
    }

    if (splitItBtn) {
        splitItBtn.disabled = false;
        splitItBtn.classList.remove('disabled');
    }
}

function showNopePopup(shareText) {
    console.log(`Showing Nope popup with share text: ${shareText}`);
    const overlay = document.createElement('div');
    overlay.id = 'popupOverlay';
    document.body.appendChild(overlay);

    const popup = document.getElementById('mookiePopup');
    if (popup) {
        const popupLogo = document.querySelector('.popup-logo');
        popupLogo.src = 'nopewordlogo.png';

        const popupProofButton = document.getElementById('proofButtonPopup');
        const popupContinueButton = document.getElementById('popupContinueButton');
        const popupCopyButton = document.getElementById('popupCopyButton');

        if (popupCopyButton) {
            popupCopyButton.style.display = 'none';
        }

        if (popupProofButton) {
            popupProofButton.setAttribute('data-snippet', shareText);
            popupProofButton.style.display = 'inline-block';
            popupProofButton.onclick = () => {
                navigator.clipboard.writeText(shareText).then(() => {
                    popupProofButton.textContent = 'Receipt Copied!';
                    setTimeout(() => popupProofButton.textContent = 'Grab Your Receipt!', 2000);
                });
            };
        }

        popupContinueButton.textContent = 'Start a New Game';
        popupContinueButton.onclick = function () {
            window.location.href = 'https://www.mookie.click';
        };

        popup.style.display = 'block';
    }
}

function showMookiePopup(shareText, isChallengeMode) {
    console.log(`Showing Mookie popup with share text: ${shareText}`);
    const overlay = document.createElement('div');
    overlay.id = 'popupOverlay';
    document.body.appendChild(overlay);

    const popup = document.getElementById('mookiePopup');
    if (popup) {
        const popupCopyButton = document.getElementById('popupCopyButton');
        const popupContinueButton = document.getElementById('popupContinueButton');
        const popupProofButton = document.getElementById('proofButtonPopup');

        if (isChallengeMode) {
            if (popupCopyButton) {
                popupCopyButton.style.display = 'none';
            }

            if (popupProofButton) {
                popupProofButton.style.display = 'inline-block';
                popupProofButton.style.width = '100%';
                popupProofButton.style.marginRight = '0';
                popupProofButton.onclick = () => {
                    navigator.clipboard.writeText(shareText).then(() => {
                        popupProofButton.textContent = 'Receipt Copied!';
                        setTimeout(() => popupProofButton.textContent = 'Grab Your Receipt!', 2000);
                    });
                };
            }

            popupContinueButton.style.width = '100%';
            popupContinueButton.style.fontSize = '1.5em';
            popupContinueButton.style.padding = '1em';

            popupContinueButton.classList.remove('standard-mode');
            popupContinueButton.onclick = function () {
                window.location.href = 'https://www.mookie.click';
            };
        } else {
            if (popupProofButton) {
                popupProofButton.style.display = 'none';
            }

            if (popupCopyButton) {
                popupCopyButton.setAttribute('data-snippet', shareText);
                popupCopyButton.onclick = () => {
                    navigator.clipboard.writeText(shareText).then(() => {
                        popupCopyButton.textContent = 'Copied!';
                        setTimeout(() => popupCopyButton.textContent = 'Copy the URL', 2000);
                    });
                };
            }

            popupContinueButton.style.width = '100%';
            popupContinueButton.style.fontSize = '1.5em';
            popupContinueButton.style.padding = '1em';

            popupContinueButton.classList.add('standard-mode');
            popupContinueButton.onclick = function () {
                closeMookiePopup();
                correctStreakStandard = 0;
                lastThreeCorrectStandard = [];
                startStandardPlay();
            };
        }

        popup.style.display = 'block';
    }
}

function closeMookiePopup() {
    const popup = document.getElementById('mookiePopup');
    const overlay = document.getElementById('popupOverlay');
    if (popup) {
        popup.style.display = 'none';
    }
    if (overlay) {
        overlay.remove();
    }
}

function copyToClipboard(event) {
    const button = event.target;
    const snippetText = button.getAttribute('data-snippet');
    const textToCopy = snippetText || window.location.href;

    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => button.textContent = originalText, 2000);
    });
}

function loadPlayersData() {
    fetch('https://raw.githubusercontent.com/khobster/mookiesandbox/main/updated_test_data_with_rarity.json')
        .then(response => response.json())
        .then(data => {
            playersData = data;
            playersData.sort((a, b) => a.rarity_score - b.rarity_score);
            playersData = playersData.filter(player => player.rarity_score <= currentDifficultyLevel || (player.games_played > 500 && player.retirement_year < 2000));
            const urlPlayers = getPlayersFromURL();
            if (urlPlayers.length > 0) {
                startURLChallenge(urlPlayers);
            } else {
                startStandardPlay();
            }
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

    const returnButton = document.getElementById('returnButton');
    const bottomContainer = document.querySelector('.bottom-container');
    const plunkosCounter = document.getElementById('plunkosCounter');
    const buttonRow = document.getElementById('buttonRow');

    if (returnButton) {
        returnButton.style.display = 'none';
    }

    if (bottomContainer) {
        bottomContainer.style.display = 'flex';
    }

    if (plunkosCounter) {
        plunkosCounter.style.display = 'block';
    }

    if (buttonRow) {
        buttonRow.style.display = 'flex';
    }

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.onclick = function () {
            const snippetContainer = document.getElementById('snippetContainer');
            const proofButton = document.getElementById('proofButton');

            if (snippetContainer) {
                snippetContainer.classList.remove('show');
            }
            if (proofButton) {
                proofButton.style.display = 'none';
            }

            const userGuess = document.getElementById('collegeGuess').value.trim().toLowerCase();
            const playerName = document.getElementById('playerName').textContent;
            const player = playersData.find(p => p.name === playerName);
            let isCorrect = player && isCloseMatch(userGuess, player.college || 'No College');
            updateStreakAndGenerateSnippetStandard(isCorrect, playerName, document.getElementById('result'), displayRandomPlayer);
        };
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

        playerImageElement.src = 'stilllife.png';

        if (player.image_url) {
            playerImageElement.src = player.image_url;

            playerImageElement.onerror = function () {
                this.onerror = null;
                this.src = 'stilllife.png';
            };
        }

        document.getElementById('collegeGuess').value = '';
        document.getElementById('result').textContent = '';
        document.getElementById('result').className = '';
    } else {
        console.error("Player name or image element not found");
    }
}

function startURLChallenge(playerNames) {
    let playerIndex = 0;
    correctStreakURL = 0;
    lastThreeCorrectURL = [];

    const buttonRow = document.getElementById('buttonRow');
    const bottomContainer = document.querySelector('.bottom-container');
    const plunkosCounter = document.getElementById('plunkosCounter');

    if (buttonRow) {
        buttonRow.style.display = 'none';
    }

    if (bottomContainer) {
        bottomContainer.style.display = 'none';
    }

    if (plunkosCounter) {
        plunkosCounter.style.display = 'none';
        
    }
    // Show the "CHALLENGE MODE" message
    const challengeModeMessage = document.getElementById('challengeModeMessage');
    if (challengeModeMessage) {
        challengeModeMessage.style.display = 'block'; // Show the message
    }

    function nextPlayer(index) {
        if (index < playerNames.length) {
            const playerName = playerNames[index];
            const player = playersData.find(p => p.name === playerName);
            if (player) {
                displayPlayer(player);
                const submitBtn = document.getElementById('submitBtn');
                if (submitBtn) {
                    submitBtn.onclick = function () {
                        const snippetContainer = document.getElementById('snippetContainer');
                        const proofButton = document.getElementById('proofButton');

                        if (snippetContainer) {
                            snippetContainer.classList.remove('show');
                        }
                        if (proofButton) {
                            proofButton.style.display = 'none';
                        }

                        const userGuess = document.getElementById('collegeGuess').value.trim().toLowerCase();
                        let isCorrect = player && isCloseMatch(userGuess, player.college || 'No College');
                        updateStreakAndGenerateSnippetURL(isCorrect, player.name, document.getElementById('result'), nextPlayer, index, playerNames.length);
                    };
                }
            } else {
                nextPlayer(index + 1);
            }
        } else {
            endURLChallenge(true);
        }
    }
    nextPlayer(playerIndex);
}

function endURLChallenge(success) {
    // Hide the "CHALLENGE MODE" message when challenge ends
    const challengeModeMessage = document.getElementById('challengeModeMessage');
    if (challengeModeMessage) {
        challengeModeMessage.style.display = 'none'; // Hide the message
    }
    
    const resultElement = document.getElementById('result');
    const copyButton = document.getElementById('copyButton');
    const proofButton = document.getElementById('proofButton');

    if (success) {
        resultElement.innerHTML += "<span class='kaboom'><br>Hit Copy & Challenge a Pal!<br>Or Grab Your Receipt!</span>";
        resultElement.className = 'correct';
    } else {
        resultElement.innerHTML = "You didn't get all correct. Better luck next time!";
        resultElement.className = 'incorrect';
    }

    if (copyButton) {
        copyButton.style.display = 'none'; // Remove in challenge mode
    }

    if (proofButton) {
        const correctCount = lastThreeCorrectURL.length;
        const totalPlayers = getPlayersFromURL().length; // Get the actual number of players from the URL
        const shareText = generateShareText(true, correctCount, totalPlayers); // Pass totalPlayers to generateShareText

        proofButton.setAttribute('data-snippet', shareText);
        proofButton.style.display = 'inline-block';
        proofButton.onclick = () => {
            navigator.clipboard.writeText(shareText).then(() => {
                proofButton.textContent = 'Receipt Copied!';
                setTimeout(() => proofButton.textContent = 'Grab Your Receipt!', 2000);
            });
        };
    }

    const returnButton = document.getElementById('returnButton');
    if (returnButton) {
        returnButton.style.display = 'inline-block';
        returnButton.textContent = 'Play again';
    }

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.style.display = 'none';
    }

    resetButtons();
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
                const collegeGuess = document.getElementById('collegeGuess');
                if (collegeGuess) {
                    collegeGuess.value = suggestion;
                }
                suggestionsContainer.innerHTML = '';
            });
            suggestionsContainer.appendChild(suggestionItem);
        });
    }
}

function displayPlayerFromDecade(decade) {
    const playersFromDecade = playersData.filter(player => {
        let playerYear = player.retirement_year;

        let playerDecade;
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

function handleTwoForOne(isCorrect) {
    if (isCorrect) {
        twoForOneCounter++;
        if (twoForOneCounter === 1) {
            const resultElement = document.getElementById('result');
            if (resultElement) {
                resultElement.textContent = "Got it!";
                resultElement.className = 'correct';
            }
            correctSound.play();
            setTimeout(() => {
                if (resultElement) {
                    resultElement.textContent = '';
                }
                displayRandomPlayer();
            }, 2000);
            return false;
        } else if (twoForOneCounter >= 2) {
            isTwoForOneActive = false;
            const playingTwoForOne = document.getElementById('playingTwoForOne');
            if (playingTwoForOne) {
                playingTwoForOne.style.display = 'none';
            }
            const splitItBtn = document.getElementById('splitItBtn');
            if (splitItBtn) {
                splitItBtn.disabled = false;
                splitItBtn.classList.remove('disabled');
            }
            const goFishBtn = document.getElementById('goFishBtn');
            if (goFishBtn) {
                goFishBtn.disabled = false;
                goFishBtn.classList.remove('disabled');
            }
            return true;
        }
    } else {
        isTwoForOneActive = false;
        twoForOneCounter = 0;
        const playingTwoForOne = document.getElementById('playingTwoForOne');
        if (playingTwoForOne) {
            playingTwoForOne.style.display = 'none';
        }
        const splitItBtn = document.getElementById('splitItBtn');
        if (splitItBtn) {
            splitItBtn.disabled = false;
            splitItBtn.classList.remove('disabled');
        }
        const goFishBtn = document.getElementById('goFishBtn');
        if (goFishBtn) {
            goFishBtn.disabled = false;
            goFishBtn.classList.remove('disabled');
        }
    }
    return false;
}

// Add basketball bouncing animation while fetching rank
document.addEventListener('DOMContentLoaded', () => {
    const highScoreContainer = document.querySelector('.bottom-container');
    const loadingElement = document.createElement('span');
    loadingElement.id = 'loadingRank';
    loadingElement.textContent = '🏀';
    loadingElement.style.display = 'none';
    loadingElement.classList.add('bounce');
    highScoreContainer.insertBefore(loadingElement, highScoreContainer.firstChild);
});
