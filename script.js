const STORAGE_KEY = "typing-speed-test-personal-best";

const app = document.querySelector(".app");
const passageEl = document.querySelector("#passage");
const typingInput = document.querySelector("#typingInput");
const startOverlay = document.querySelector("#startOverlay");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const againButton = document.querySelector("#againButton");
const results = document.querySelector("#results");

const wpmValue = document.querySelector("#wpmValue");
const accuracyValue = document.querySelector("#accuracyValue");
const timeValue = document.querySelector("#timeValue");
const personalBestEl = document.querySelector("#personalBest");

const resultTitle = document.querySelector("#resultTitle");
const resultMessage = document.querySelector("#resultMessage");
const resultWpm = document.querySelector("#resultWpm");
const resultAccuracy = document.querySelector("#resultAccuracy");
const resultCorrect = document.querySelector("#resultCorrect");
const resultIncorrect = document.querySelector("#resultIncorrect");

let passages = { easy: [], medium: [], hard: [] };
let language = "en";
let difficulty = "hard";
let mode = "timed";
let currentPassage = "";
let typedValue = "";
let timerId = null;
let startedAt = null;
let elapsedSeconds = 0;
let remainingSeconds = 60;
let totalErrors = 0;
let personalBest = Number(localStorage.getItem(STORAGE_KEY)) || null;
let hasPickedInitialPassage = false;

const fallbackPassages = {
  en: {
    easy: [
      { id: "easy-fallback", text: "The sun rose over the quiet town. Birds sang in the trees as people woke up and started their day." }
    ],
    medium: [
      { id: "medium-fallback", text: "Learning a new skill takes patience and consistent practice. Small improvements compound over time." }
    ],
    hard: [
      { id: "hard-fallback", text: "The archaeological expedition unearthed artifacts that complicated prevailing theories about Bronze Age trade networks." }
    ]
  },
  uk: {
    easy: [
      { id: "uk-easy-1", text: "Сонце повільно піднялося над містом. Люди відчиняли вікна, пили чай і готувалися до нового дня." },
      { id: "uk-easy-2", text: "У парку діти гралися біля фонтану. Теплий вітер рухав листя, а на лавці хтось читав цікаву книжку." },
      { id: "uk-easy-3", text: "Кіт сидів на підвіконні та дивився на дощ. У кімнаті було тепло, тихо і дуже затишно." }
    ],
    medium: [
      { id: "uk-medium-1", text: "Навчання нової навички потребує терпіння і регулярної практики. Маленькі кроки здаються непомітними, але з часом вони складаються у впевнений результат." },
      { id: "uk-medium-2", text: "Міські сади змінюють звичний вигляд районів. Люди висаджують зелень на дахах, балконах і подвір'ях, створюючи простір для відпочинку та спілкування." },
      { id: "uk-medium-3", text: "Подорож потягом відкриває країну поступово. За вікном змінюються поля, ліси, маленькі станції та великі міста, і кожна зупинка має свій настрій." }
    ],
    hard: [
      { id: "uk-hard-1", text: "Археологічна експедиція знайшла артефакти, які ускладнили попередні уявлення про торгівлю бронзової доби. Обсидіан, лазурит і бурштин свідчили про значно ширші зв'язки, ніж вважалося раніше." },
      { id: "uk-hard-2", text: "Дослідники мікропластику дедалі частіше говорять про невидимий масштаб проблеми: дрібні частинки потрапляють у воду, ґрунт, харчові ланцюги та навіть у тканини живих організмів." },
      { id: "uk-hard-3", text: "Філософська суперечка почалася з парадоксального твердження: абсолютна свобода без жодних обмежень може створити умови, у яких сильніші пригнічують слабших, знищуючи свободу більшості." }
    ]
  }
};

function normalizeText(text) {
  return text
    .replaceAll("вЂ”", "—")
    .replaceAll("вЂњ", "\"")
    .replaceAll("вЂќ", "\"")
    .replaceAll("вЂ™", "'")
    .replaceAll("вЂ¦", "...");
}

async function init() {
  try {
    const response = await fetch("./data.json");
    if (!response.ok) throw new Error("Unable to load data");
    passages = await response.json();
  } catch {
    passages = fallbackPassages.en;
  }

  updatePersonalBest();
  choosePassage();
  renderPassage();
  updateControls();
  updateStats();
}

function choosePassage() {
  const passageSet = getPassageSet();
  const pool = passageSet[difficulty]?.length ? passageSet[difficulty] : fallbackPassages[language][difficulty];
  const preferredInitial = language === "en" && difficulty === "hard" && !hasPickedInitialPassage
    ? pool.find((passage) => passage.id === "hard-10")
    : null;
  const next = preferredInitial || pool[Math.floor(Math.random() * pool.length)];

  hasPickedInitialPassage = true;
  currentPassage = normalizeText(next.text);
}

function getPassageSet() {
  if (language === "uk") {
    return passages.uk || fallbackPassages.uk;
  }

  return passages.en || passages;
}

function renderPassage() {
  passageEl.innerHTML = "";

  [...currentPassage].forEach((char, index) => {
    const span = document.createElement("span");
    span.className = "char";
    span.dataset.index = index;
    span.textContent = char;
    passageEl.append(span);
  });

  updateCharacterStates();
}

function startTest() {
  if (app.dataset.state === "running") return;

  app.dataset.state = "running";
  startedAt = Date.now();
  startOverlay.classList.add("is-hidden");
  typingInput.disabled = false;
  typingInput.focus();
  timeValue.classList.add("is-running");

  timerId = window.setInterval(tick, 250);
  tick();
}

function tick() {
  if (!startedAt) return;

  elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);

  if (mode === "timed") {
    remainingSeconds = Math.max(60 - elapsedSeconds, 0);
    if (remainingSeconds === 0) {
      finishTest();
      return;
    }
  }

  updateStats();
}

function restartTest() {
  window.clearInterval(timerId);
  timerId = null;
  startedAt = null;
  elapsedSeconds = 0;
  remainingSeconds = 60;
  totalErrors = 0;
  typedValue = "";
  typingInput.value = "";
  typingInput.disabled = false;
  app.dataset.state = "idle";
  results.hidden = true;
  results.removeAttribute("data-result");
  startOverlay.classList.remove("is-hidden");
  timeValue.classList.remove("is-running");

  choosePassage();
  renderPassage();
  updateStats();
}

function finishTest() {
  if (app.dataset.state === "finished") return;

  window.clearInterval(timerId);
  timerId = null;
  app.dataset.state = "finished";
  typingInput.blur();
  typingInput.disabled = true;
  timeValue.classList.remove("is-running");

  const stats = calculateStats();
  const previousBest = personalBest;
  const isFirstTest = previousBest === null;
  const isNewBest = !isFirstTest && stats.wpm > previousBest;

  if (isFirstTest || isNewBest) {
    personalBest = stats.wpm;
    localStorage.setItem(STORAGE_KEY, String(personalBest));
    updatePersonalBest();
  }

  showResults(stats, isFirstTest, isNewBest);
}

function showResults(stats, isFirstTest, isNewBest) {
  results.hidden = false;
  resultWpm.textContent = stats.wpm;
  resultAccuracy.textContent = `${stats.accuracy}%`;
  resultAccuracy.classList.toggle("is-warning", stats.accuracy < 95);
  resultAccuracy.classList.toggle("is-good", stats.accuracy >= 95);
  resultCorrect.textContent = stats.correct;
  resultIncorrect.textContent = stats.incorrect;

  if (isFirstTest) {
    results.dataset.result = "baseline";
    resultTitle.textContent = "Baseline Established!";
    resultMessage.textContent = "Your first score is saved. Now you have a target to beat.";
    againButton.querySelector("span").textContent = "Beat This Score";
  } else if (isNewBest) {
    results.dataset.result = "new-best";
    resultTitle.textContent = "High Score Smashed!";
    resultMessage.textContent = "You're getting faster. That was incredible typing.";
    againButton.querySelector("span").textContent = "Beat This Score";
  } else {
    results.dataset.result = "complete";
    resultTitle.textContent = "Test Complete!";
    resultMessage.textContent = "Solid run. Keep pushing to beat your high score.";
    againButton.querySelector("span").textContent = "Go Again";
  }
}

function handleTyping() {
  if (app.dataset.state !== "running") {
    startTest();
  }

  const nextValue = typingInput.value.slice(0, currentPassage.length);
  const previousLength = typedValue.length;
  typedValue = nextValue;

  if (typedValue.length > previousLength) {
    for (let index = previousLength; index < typedValue.length; index += 1) {
      if (typedValue[index] !== currentPassage[index]) {
        totalErrors += 1;
      }
    }
  }

  typingInput.value = typedValue;
  updateCharacterStates();
  updateStats();

  if (typedValue.length === currentPassage.length) {
    finishTest();
  }
}

function updateCharacterStates() {
  const chars = passageEl.querySelectorAll(".char");

  chars.forEach((span, index) => {
    const typedChar = typedValue[index];
    span.classList.toggle("is-current", index === typedValue.length && app.dataset.state !== "finished");
    span.classList.toggle("is-correct", typedChar !== undefined && typedChar === currentPassage[index]);
    span.classList.toggle("is-incorrect", typedChar !== undefined && typedChar !== currentPassage[index]);
  });
}

function calculateStats() {
  let correct = 0;
  let currentIncorrect = 0;

  for (let index = 0; index < typedValue.length; index += 1) {
    if (typedValue[index] === currentPassage[index]) {
      correct += 1;
    } else {
      currentIncorrect += 1;
    }
  }

  const seconds = mode === "timed" ? Math.max(elapsedSeconds, 1) : Math.max(elapsedSeconds, 1);
  const minutes = seconds / 60;
  const wpm = Math.round((correct / 5) / minutes) || 0;
  const accuracyBase = correct + totalErrors;
  const accuracy = accuracyBase > 0 ? Math.max(0, Math.round((correct / accuracyBase) * 100)) : 100;

  return {
    correct,
    incorrect: Math.max(totalErrors, currentIncorrect),
    wpm,
    accuracy
  };
}

function updateStats() {
  const stats = calculateStats();

  wpmValue.textContent = stats.wpm;
  accuracyValue.textContent = `${stats.accuracy}%`;
  accuracyValue.classList.toggle("is-warning", stats.accuracy < 95);
  timeValue.textContent = mode === "timed" ? formatTime(remainingSeconds) : formatTime(elapsedSeconds);
}

function formatTime(seconds) {
  if (mode === "timed" && seconds === 60) return "0:60";

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function updatePersonalBest() {
  personalBestEl.textContent = personalBest === null ? "-- WPM" : `${personalBest} WPM`;
}

function updateControls() {
  document.querySelectorAll("[data-language]").forEach((button) => {
    const isActive = button.dataset.language === language;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll("[data-difficulty]").forEach((button) => {
    const isActive = button.dataset.difficulty === difficulty;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll("[data-mode]").forEach((button) => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelector('[data-control="language"] [data-selected-label]').textContent = language === "en" ? "English" : "Українська";
  document.querySelector('[data-control="difficulty"] [data-selected-label]').textContent = capitalize(difficulty);
  document.querySelector('[data-control="mode"] [data-selected-label]').textContent = mode === "timed" ? "Timed (60s)" : "Passage";
}

function setLanguage(nextLanguage) {
  if (language === nextLanguage) return;
  language = nextLanguage;
  hasPickedInitialPassage = false;
  updateControls();
  restartTest();
}

function setDifficulty(nextDifficulty) {
  if (difficulty === nextDifficulty) return;
  difficulty = nextDifficulty;
  updateControls();
  restartTest();
}

function setMode(nextMode) {
  if (mode === nextMode) return;
  mode = nextMode;
  updateControls();
  restartTest();
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function closeMenus() {
  document.querySelectorAll(".control.is-open").forEach((control) => {
    control.classList.remove("is-open");
    control.querySelector(".select-trigger")?.setAttribute("aria-expanded", "false");
  });
}

startButton.addEventListener("click", startTest);
restartButton.addEventListener("click", restartTest);
againButton.addEventListener("click", restartTest);
passageEl.addEventListener("click", () => typingInput.focus());
typingInput.addEventListener("input", handleTyping);

document.addEventListener("keydown", (event) => {
  const isTypingKey = event.key.length === 1 || event.key === "Backspace";
  const isControlTarget = event.target.closest?.("button, a");
  const isTextInput = event.target === typingInput;

  if (
    isTypingKey &&
    !isControlTarget &&
    !isTextInput &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    app.dataset.state !== "finished"
  ) {
    event.preventDefault();

    if (event.key === "Backspace") {
      typingInput.value = typingInput.value.slice(0, -1);
    } else {
      typingInput.value = `${typingInput.value}${event.key}`;
    }

    typingInput.focus();
    handleTyping();
  }
});

document.querySelectorAll("[data-difficulty]").forEach((button) => {
  button.addEventListener("click", () => {
    setDifficulty(button.dataset.difficulty);
    closeMenus();
  });
});

document.querySelectorAll("[data-language]").forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.language);
    closeMenus();
  });
});

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
    closeMenus();
  });
});

document.querySelectorAll(".select-trigger").forEach((button) => {
  button.addEventListener("click", () => {
    const control = button.closest(".control");
    const shouldOpen = !control.classList.contains("is-open");
    closeMenus();
    control.classList.toggle("is-open", shouldOpen);
    button.setAttribute("aria-expanded", String(shouldOpen));
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".control")) {
    closeMenus();
  }
});

init();
