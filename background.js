chrome.runtime.onInstalled.addListener(() => {
  loadWords(); // Load words on installation
  createAlarms(); // Create alarms for daily times
  createContextMenu(); // Create context menu on installation
});

// Create alarms for 9 AM and 6 PM
function createAlarms() {
  chrome.alarms.create("morningWord", { when: getNextAlarmTime(9, 0) });
  chrome.alarms.create("eveningWord", { when: getNextAlarmTime(18, 0) });
}

function getNextAlarmTime(hour, minute) {
  const now = new Date();
  const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (now > alarmTime) {
    alarmTime.setDate(alarmTime.getDate() + 1); // Set alarm for next day if time has passed
  }
  return alarmTime.getTime();
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "morningWord" || alarm.name === "eveningWord") {
    incrementWordIndex(); // Trigger word change
  }
});

// Load words from the file or storage
function loadWords() {
  fetch(chrome.runtime.getURL("words.json")) // Use words.json as the single file
    .then((response) => response.json())
    .then((words) => {
      chrome.storage.local.set({ words, currentIndex: 0 });
    })
    .catch((error) => {
      console.error("Failed to load words:", error);
    });
}

// Handle saving the selected word
function saveSelectedWord(selectedWord) {
  chrome.storage.local.get("words", (data) => {
    const words = data.words || [];
    const existingWord = words.find(word => word.word === selectedWord);
    if (!existingWord) {
      words.push({ word: selectedWord, sentence: `Sentence for ${selectedWord}` });
      chrome.storage.local.set({ words }, () => {
        console.log(`${selectedWord} saved successfully.`);
      });
    } else {
      console.log(`${selectedWord} already exists.`);
    }
  });
}

// Create context menu on installation
function createContextMenu() {
  chrome.contextMenus.create({
    id: "saveWord",
    title: "Save Word",
    contexts: ["selection"], // Triggered by text selection
  });
}

// Listen for right-click menu item selection
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveWord" && info.selectionText) {
    saveSelectedWord(info.selectionText); // Save selected word directly
  }
});

// Handle the word index incrementing
function incrementWordIndex() {
  chrome.storage.local.get(["words", "currentIndex"], (data) => {
    const words = data.words || [];
    let currentIndex = data.currentIndex || 0;

    currentIndex = (currentIndex + 1) % words.length; // Wrap around to the beginning
    chrome.storage.local.set({ currentIndex });
  });
}