document.getElementById("next").addEventListener("click", () => {
  incrementWordIndex();
});

document.getElementById("previous").addEventListener("click", () => {
  decrementWordIndex();
});

document.getElementById("remove").addEventListener("click", () => {
  removeCurrentWord();
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
    document.getElementById("message").textContent = ""; // Clear message when displaying a word
  });
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