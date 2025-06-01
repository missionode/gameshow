let gameData = {
    gameName: '',
    tagline: '',
    team1Name: 'Champions',
    team2Name: 'Royals',
    questions: [],
    team1Score: 0,
    team2Score: 0,
    currentQuestionIndex: 0,
    selectedAnswer: null,
    answerLocked: false,
    numRounds: 3,
};

let roundNumber = 1;
let usedQuestionIndices = [];
let team1RoundWins = 0;
let team2RoundWins = 0;

if (window.location.pathname.includes('index.html')) {
    document.getElementById('questionFile').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            parseCSV(file);
        }
    });
}


function handleSetup(event) {
    event.preventDefault();
    const gameName = document.getElementById('gameName').value;
    const tagline = document.getElementById('tagline').value;
    const team1Name = document.getElementById('team1Name').value;
    const team2Name = document.getElementById('team2Name').value;

    gameData = {
        gameName: gameName,
        tagline: tagline,
        team1Name: team1Name,
        team2Name: team2Name,
        questions: gameData.questions,
        team1Score: 0,
        team2Score: 0,
        currentQuestionIndex: 0,
        selectedAnswer: null,
        answerLocked: false,
        numRounds: parseInt(document.getElementById('numRounds').value),
    };

    localStorage.setItem('originalQuestions', JSON.stringify(gameData.questions));
    storeGameData(gameData);
    window.location.href = 'game.html';
}


function parseCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (event) {
            const csv = event.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',');
            const questions = [];

            for (let i = 1; i < lines.length; i++) {
                const data = lines[i].split(',');
                if (data.length === headers.length) {
                    const question = {
                        question: data[0],
                        answers: [data[1], data[2], data[3], data[4]],
                        correctAnswer: data[5].trim(),
                    };
                    questions.push(question);
                }
            }
            if (questions.length > 0) {
                // Populate round select box:
                populateRoundSelect(questions.length);
                gameData.questions = questions;
                resolve(questions);
            } else {
                reject('Invalid CSV file format.');
            }
        };
        reader.onerror = function () {
            reject('Error reading CSV file.');
        };
        reader.readAsText(file);
    });
}

function populateRoundSelect(numQuestions) {
    const roundSelect = document.getElementById('numRounds');
    roundSelect.innerHTML = '';

    const maxRounds = Math.floor(numQuestions / 5);
    for (let i = 1; i <= maxRounds; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        roundSelect.appendChild(option);
    }
    if (maxRounds > 0) {
        roundSelect.value = 1;
        gameData.numRounds = 1;
    }
}

function storeGameData(data) {
    localStorage.setItem('gameData', JSON.stringify(data));
}

function loadGameData() {
    const storedData = localStorage.getItem('gameData');
    if (storedData) {
        gameData = JSON.parse(storedData);
        // Check if we are on index.html before populating fields:
        if (window.location.pathname.includes('index.html')) {
            document.getElementById('gameName').value = gameData.gameName;
            document.getElementById('tagline').value = gameData.tagline;
            document.getElementById('team1Name').value = gameData.team1Name;
            document.getElementById('team2Name').value = gameData.team2Name;
            document.getElementById('numRounds').value = gameData.numRounds;
        }
    }
}

function startGame() {
    loadGameData();
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameTitle').textContent = gameData.gameName;
    document.getElementById('tagline').textContent = gameData.tagline;

    let originalQuestions = JSON.parse(localStorage.getItem('originalQuestions'));

    // Add this check:
    if (!originalQuestions) {
        // Redirect to setup page or display error
        window.location.href = 'index.html'; // Or display an error message
        return;
    }

    let roundQuestions = selectUniqueQuestions(originalQuestions, 5);
    gameData.questions = roundQuestions;

    if (gameData.questions.length === 0) {
        document.getElementById('questionScreen').style.display = 'none';
        document.getElementById('resultsScreen').style.display = 'block';
        document.getElementById('winner').textContent = "No more questions available.";
        return;
    }

    gameData.currentQuestionIndex = 0;
    displayQuestion(gameData.questions[gameData.currentQuestionIndex]);
    document.getElementById('questionScreen').style.display = 'block';
    updateScoreDisplay();
    document.getElementById('team1Button').textContent = gameData.team1Name;
    document.getElementById('team2Button').textContent = gameData.team2Name;
    document.getElementById('team1Button').addEventListener('click', () => teamButtonClicked('team1Score'));
    document.getElementById('team2Button').addEventListener('click', () => teamButtonClicked('team2Score'));
}

function selectUniqueQuestions(allQuestions, numQuestions) {
    let availableQuestions = allQuestions.filter((_, index) => !usedQuestionIndices.includes(index));
    let selectedQuestions = [];
    if (availableQuestions.length < numQuestions) {
        return availableQuestions;
    }
    for (let i = 0; i < numQuestions; i++) {
        let randomIndex = Math.floor(Math.random() * availableQuestions.length);
        let selectedQuestion = availableQuestions.splice(randomIndex, 1)[0];
        let originalIndex = allQuestions.indexOf(selectedQuestion);
        usedQuestionIndices.push(originalIndex);
        selectedQuestions.push(selectedQuestion);
    }
    return selectedQuestions;
}

function handleNextQuestion() {
    document.getElementById('feedbackScreen').style.display = 'none';
    gameData.currentQuestionIndex++;
    storeGameData(gameData);

    if (gameData.currentQuestionIndex < gameData.questions.length) {
        displayQuestion(gameData.questions[gameData.currentQuestionIndex]);
        document.getElementById('questionScreen').style.display = 'block';
    } else {
        displayResults();
    }

    // Remove the event listener to prevent multiple clicks:
    document.getElementById('nextQuestionButton').removeEventListener('click', handleNextQuestion);
}

function teamButtonClicked(teamScoreKey) {
    if (!gameData.selectedAnswer) return;
    if (gameData.answerLocked) return;
    gameData.answerLocked = true;

    const currentQuestion = gameData.questions[gameData.currentQuestionIndex];
    let isCorrect = gameData.selectedAnswer === currentQuestion.correctAnswer;

    // Play suspense audio:
    playAudio('suspenseSound');

    // Add delay:
    setTimeout(() => {
        // Stop suspense audio:
        document.getElementById('suspenseSound').pause();
        document.getElementById('suspenseSound').currentTime = 0;

        if (isCorrect) {
            playAudio('correctSound');
            document.getElementById('feedbackMessage').textContent = 'Correct!';
            document.getElementById('feedbackImage').src = 'images/correct.png';
            gameData[teamScoreKey]++;
        } else {
            playAudio('incorrectSound');
            document.getElementById('feedbackMessage').textContent = 'Incorrect!';
            document.getElementById('feedbackImage').src = 'images/incorrect.png';
        }

        updateScoreDisplay();
        document.getElementById('questionScreen').style.display = 'none';
        document.getElementById('feedbackScreen').style.display = 'block';

        // Add event listener to the button:
        document.getElementById('nextQuestionButton').addEventListener('click', handleNextQuestion);
    }, 5000); // 2-second delay (adjust as needed)
}

function displayQuestion(question) {
    if (!question) {
        console.error("Question is undefined!");
        return;
    }
    document.getElementById('questionText').textContent = question.question;
    const answerList = document.getElementById('answerList');
    answerList.innerHTML = '';

    question.answers.forEach((answer, index) => {
        const li = document.createElement('li');
        li.textContent = answer;
        li.addEventListener('click', () => selectAnswer(answer));
        answerList.appendChild(li);
    });
    gameData.selectedAnswer = null;
    gameData.answerLocked = false;
}

function selectAnswer(answer) {
    if (gameData.answerLocked) return;

    gameData.selectedAnswer = answer;
    const answerListItems = document.querySelectorAll('#answerList li');
    answerListItems.forEach(li => {
        li.classList.remove('selected');
        if (li.textContent === answer) {
            li.classList.add('selected');
        }
    });
}

function checkAnswer(answer) {
    const currentQuestion = gameData.questions[gameData.currentQuestionIndex];
    let isCorrect = answer === currentQuestion.correctAnswer;
    let teamToScore = null;

    if (isCorrect) {
        playAudio('correctSound');
        document.getElementById('feedbackMessage').textContent = 'Correct!';
        document.getElementById('feedbackImage').src = 'images/correct.png';
        teamToScore = gameData.currentQuestionIndex % 2 === 0 ? 'team1Score' : 'team2Score';
        gameData[teamToScore]++;
    } else {
        playAudio('incorrectSound');
        document.getElementById('feedbackMessage').textContent = 'Incorrect!';
        document.getElementById('feedbackImage').src = 'images/incorrect.png';
    }

    updateScoreDisplay();
    document.getElementById('questionScreen').style.display = 'none';
    document.getElementById('feedbackScreen').style.display = 'block';

    // Remove setTimeout and add event listener to the button:
    document.getElementById('nextQuestionButton').addEventListener('click', handleNextQuestion);
}

function updateScoreDisplay() {
    document.getElementById('team1Score').textContent = `${gameData.team1Name}: ${gameData.team1Score}`;
    document.getElementById('team2Score').textContent = `${gameData.team2Name}: ${gameData.team2Score}`;
}

function displayResults() {
    let winner = gameData.team1Score > gameData.team2Score ? gameData.team1Name : gameData.team2Name;
    if (gameData.team1Score === gameData.team2Score) {
        winner = 'It\'s a tie!';
    }
    document.getElementById('winner').textContent = `Winner: ${winner}`;

    // Update round wins:
    if (gameData.team1Score > gameData.team2Score) {
        team1RoundWins++;
    } else if (gameData.team2Score > gameData.team1Score) {
        team2RoundWins++;
    }

    // Display round wins:
    let roundWinsDisplay = `Round Wins: ${gameData.team1Name}: ${team1RoundWins}, ${gameData.team2Name}: ${team2RoundWins}`;
    document.getElementById('winner').innerHTML += `<br>${roundWinsDisplay}`;

    document.getElementById('resultsScreen').style.display = 'block';

    if (roundNumber < 3) {
        document.getElementById('nextRoundButton').style.display = 'block';
        document.getElementById('finalGameMessage').style.display = 'none';
        document.getElementById('nextRoundButton').addEventListener('click', nextRound);
    } else {
        document.getElementById('nextRoundButton').style.display = 'none';
        document.getElementById('finalGameMessage').style.display = 'block';
        localStorage.removeItem('gameData');
        localStorage.removeItem('originalQuestions');
    }
    if (roundNumber < gameData.numRounds) { // Use selected rounds
        document.getElementById('nextRoundButton').style.display = 'block';
        document.getElementById('finalGameMessage').style.display = 'none';
        document.getElementById('nextRoundButton').addEventListener('click', nextRound);
    } else {
        document.getElementById('nextRoundButton').style.display = 'none';
        document.getElementById('finalGameMessage').style.display = 'block';
        localStorage.removeItem('gameData');
        localStorage.removeItem('originalQuestions');
    }
}

function playAudio(soundId) {
    const sound = document.getElementById(soundId);
    if (sound) {
        sound.currentTime = 0;
        sound.play();
    }
}

function resetGame() {
    localStorage.removeItem('gameData');
    localStorage.removeItem('originalQuestions');
    location.reload();
}

function nextRound() {
    roundNumber++;
    gameData.team1Score = 0;
    gameData.team2Score = 0;
    gameData.selectedAnswer = null;
    gameData.answerLocked = false;
    usedQuestionIndices = [];
    storeGameData(gameData);
    document.getElementById('resultsScreen').style.display = 'none';
    startGame();
}