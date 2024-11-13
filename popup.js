
let typingMode = false;
let streakCount = 0;
const CORRECT_STREAK_THRESHOLD = 3; // Number of correct words needed for a "streak"

document.addEventListener("DOMContentLoaded", () => {
  loadWords();

  // Language Selector and Pronounce Icon
  const languageSelector = document.getElementById('languageSelector');
  const pronounceIcon = document.getElementById('pronounce-icon');

  // Add new button for typing practice mode
  const typingButton = document.createElement('button');
  typingButton.id = 'toggleTyping';
  typingButton.innerHTML = '<i class="fas fa-keyboard"></i>';
  typingButton.title = 'Toggle Typing Practice';
  document.getElementById('navigation').appendChild(typingButton);

  // Add stats display
  const statsDiv = document.createElement('div');
  statsDiv.id = 'stats';
  statsDiv.className = 'stats-container';
  statsDiv.innerHTML = `
    <div class="stat-item">
      <i class="fas fa-fire"></i>
      <span id="streak">Streak: 0</span>
    </div>
    <div class="stat-item">
      <i class="fas fa-check"></i>
      <span id="accuracy">Accuracy: 0%</span>
    </div>
  `;
  document.getElementById('wordContainer').insertBefore(statsDiv, document.getElementById('navigation'));



  pronounceIcon.addEventListener("click", () => {
    pronounceWord(languageSelector.value);
  });

  // Other event listeners
  document.getElementById("next").addEventListener("click", () => {
    incrementWordIndex();
  });

  document.getElementById("previous").addEventListener("click", () => {
    decrementWordIndex();
  });

  document.getElementById("remove").addEventListener("click", () => {
    removeCurrentWord();
  });

  // Enable editing on double-click
  document.getElementById("word").addEventListener("dblclick", enableEditing);
  document.getElementById("sentence").addEventListener("dblclick", enableEditing);

  // Save changes on blur (click outside)
  document.getElementById("word").addEventListener("blur", saveChanges);
  document.getElementById("sentence").addEventListener("blur", saveChanges);

    // Add typing practice container
    const typingContainer = document.createElement('div');
    typingContainer.id = 'typingContainer';
    typingContainer.className = 'typing-container hidden';
    typingContainer.innerHTML = `
      <input type="text" id="typingInput" placeholder="Type the word here..." autocomplete="off">
      <div id="feedback"></div>
    `;
    document.getElementById('wordContainer').insertBefore(typingContainer, document.getElementById('navigation'));
  
    // Add event listeners for new features
    document.getElementById('toggleTyping').addEventListener('click', toggleTypingMode);
    document.getElementById('typingInput').addEventListener('input', checkTyping);
    document.addEventListener('keydown', handleKeyPress);
});

document.getElementById("download").addEventListener("click", () => {
  chrome.storage.local.get("words", (data) => {
    const words = data.words || [];
    const blob = new Blob([JSON.stringify(words, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "words.json"; // Download file will be named words.json
    link.click();
  });
});

// New function: pronounceWord
function pronounceWord(language) {
  const word = document.getElementById("word").textContent;
  // Web Speech API - SpeechSynthesisUtterance
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = language;
  utterance.rate = 1; // Speed of the speech
  utterance.pitch = 1; // Pitch of the speech
  utterance.volume = 1; // Volume of the speech

  // Speak the word
  window.speechSynthesis.speak(utterance);
}

function enableEditing(event) {
  const target = event.target;
  target.contentEditable = "true";
  target.classList.add("editing"); // Visual feedback for editing state
  target.focus();
}

function saveChanges(event) {
  const target = event.target;
  target.contentEditable = "false";
  target.classList.remove("editing"); // Remove visual feedback

  // Save the updated text to storage
  if (target.id === "word") {
    chrome.storage.local.get(["words", "currentIndex"], (data) => {
      const words = data.words || [];
      const currentIndex = data.currentIndex || 0;
      words[currentIndex].word = target.innerText;
      chrome.storage.local.set({ words });
    });
  } else if (target.id === "sentence") {
    chrome.storage.local.get(["words", "currentIndex"], (data) => {
      const words = data.words || [];
      const currentIndex = data.currentIndex || 0;
      words[currentIndex].sentence = target.innerText;
      chrome.storage.local.set({ words });
    });
  }
}

function loadWords() {
  chrome.storage.local.get("words", (data) => {
    if (!data.words) {
      fetch(chrome.runtime.getURL("words.json"))
        .then(response => response.json())
        .then(words => {
          chrome.storage.local.set({ words, currentIndex: 0 });
          updateWordDisplay();  // Display the first word when the extension loads
        })
        .catch(error => console.error("Failed to load words:", error));
    } else {
      updateWordDisplay();
    }
  });
}

// Typing practice functions
function toggleTypingMode() {
  typingMode = !typingMode;
  const typingContainer = document.getElementById('typingContainer');
  const typingButton = document.getElementById('toggleTyping');
  
  if (typingMode) {
    typingContainer.classList.remove('hidden');
    typingButton.classList.add('active');
    document.getElementById('typingInput').focus();
    document.getElementById('word').classList.add('highlight');
  } else {
    typingContainer.classList.add('hidden');
    typingButton.classList.remove('active');
    document.getElementById('word').classList.remove('highlight');
  }
}

function checkTyping(event) {
  const input = event.target;
  const currentWord = document.getElementById('word').textContent;
  const feedback = document.getElementById('feedback');
  
  if (input.value === currentWord) {
    handleCorrectWord(input);
  } else if (currentWord.startsWith(input.value)) {
    feedback.textContent = "Keep going...";
    feedback.className = 'neutral';
    input.className = '';
  } else {
    feedback.textContent = "Try again!";
    feedback.className = 'incorrect';
    input.className = 'incorrect';
  }
}

function handleCorrectWord(input) {
  streakCount++;
  updateStats();
  
  const feedback = document.getElementById('feedback');
  feedback.textContent = "Correct!";
  feedback.className = 'correct';
  input.className = 'correct';
  
  // Clear input and move to next word after a brief delay
  setTimeout(() => {
    input.value = '';
    input.className = '';
    feedback.textContent = '';
    incrementWordIndex();
    
    if (streakCount % CORRECT_STREAK_THRESHOLD === 0) {
      showStreakAnimation();
    }
  }, 1000);
}

function updateStats() {
  const streakElement = document.getElementById('streak');
  streakElement.textContent = `Streak: ${streakCount}`;
  
  // Calculate and update accuracy
  chrome.storage.local.get(['totalAttempts', 'correctAttempts'], (data) => {
    const totalAttempts = (data.totalAttempts || 0) + 1;
    const correctAttempts = (data.correctAttempts || 0) + 1;
    const accuracy = Math.round((correctAttempts / totalAttempts) * 100);
    
    document.getElementById('accuracy').textContent = `Accuracy: ${accuracy}%`;
    chrome.storage.local.set({ totalAttempts, correctAttempts });
  });
}

function showStreakAnimation() {
  const streakOverlay = document.createElement('div');
  streakOverlay.className = 'streak-overlay';
  streakOverlay.textContent = `${streakCount} Words Streak!`;
  document.body.appendChild(streakOverlay);
  
  setTimeout(() => {
    streakOverlay.remove();
  }, 2000);
}

function handleKeyPress(event) {
  if (!typingMode) return;
  
  if (event.key === 'Enter') {
    const input = document.getElementById('typingInput');
    if (input.value === document.getElementById('word').textContent) {
      handleCorrectWord(input);
    }
  }
}


// Modify your existing updateWordDisplay function to include these additional features:
function updateWordDisplay() {
  chrome.storage.local.get(["words", "currentIndex"], (data) => {
    const words = data.words || [];
    const currentIndex = data.currentIndex || 0;

    if (words.length === 0) {
      document.getElementById("word").textContent = "No word available";
      document.getElementById("sentence").textContent = "";
      document.getElementById("message").textContent = "No words left. Please add more words.";
      return;
    }

    const word = words[currentIndex];
    document.getElementById("word").textContent = word ? word.word : "No word available";
    document.getElementById("sentence").textContent = word ? word.sentence : "";
    document.getElementById("message").textContent = "";

    // Reset typing input if in typing mode
    if (typingMode) {
      const typingInput = document.getElementById('typingInput');
      typingInput.value = '';
      typingInput.className = '';
      document.getElementById('feedback').textContent = '';
      typingInput.focus();
    }

    // Add word progress indicator
    updateProgressIndicator(currentIndex, words.length);
  });
}

function updateProgressIndicator(currentIndex, totalWords) {
  const progress = document.createElement('div');
  progress.id = 'wordProgress';
  progress.className = 'word-progress';
  progress.textContent = `${currentIndex + 1}/${totalWords}`;
  
  const existingProgress = document.getElementById('wordProgress');
  if (existingProgress) {
    existingProgress.remove();
  }
  
  document.getElementById('wordContainer').insertBefore(
    progress,
    document.getElementById('navigation')
  );
}

function incrementWordIndex() {
  chrome.storage.local.get(["words", "currentIndex"], (data) => {
    const words = data.words || [];
    let currentIndex = data.currentIndex || 0;

    if (words.length > 0) {
      const wordToSave = words[currentIndex]; // Get the word to save
      saveWord(wordToSave.word); // Save the word before changing index

      currentIndex = (currentIndex + 1) % words.length; // Wrap around to the beginning
      chrome.storage.local.set({ currentIndex }, updateWordDisplay);
    }
  });
}

function decrementWordIndex() {
  chrome.storage.local.get(["words", "currentIndex"], (data) => {
    const words = data.words || [];
    let currentIndex = data.currentIndex || 0;

    if (words.length > 0) {
      currentIndex = (currentIndex - 1 + words.length) % words.length; // Wrap around to the end
      chrome.storage.local.set({ currentIndex }, updateWordDisplay);
    }
  });
}

function removeCurrentWord() {
  chrome.storage.local.get(["words", "currentIndex"], (data) => {
    let words = data.words || [];
    let currentIndex = data.currentIndex || 0;

    if (words.length > 0) {
      // Remove the current word from the list
      words.splice(currentIndex, 1);

      // Adjust currentIndex if it was the last item in the list
      if (currentIndex >= words.length) {
        currentIndex = 0;
      }

      // Save updated list and index
      chrome.storage.local.set({ words, currentIndex }, updateWordDisplay);

      // Display a notification when a word is removed
      document.getElementById("message").textContent = "Word removed successfully.";
    }
  });
}

function saveWord(wordToSave) {
  chrome.runtime.sendMessage({ action: "saveWord", word: wordToSave }, (response) => {
    if (response.status === "success") {
      document.getElementById("message").textContent = response.message;
    } else {
      document.getElementById("message").textContent = "Failed to save word.";
    }
  });
}

// Load words when the popup loads
document.addEventListener("DOMContentLoaded", loadWords);