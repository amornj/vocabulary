import { chromium } from "file:///Users/home/projects/mi-definition-2026/node_modules/playwright-core/index.mjs";

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(process.env.QA_URL || "http://127.0.0.1:5173", { waitUntil: "networkidle" });

// Batch reading-mode quiz: source badges appear above the card and the last
// answer advances to a word-only summary.
await page.evaluate(() => {
  storyMCQQuestions = [
    { word: "aberrant", def: "first", options: ["first", "second", "third", "fourth"] },
    { word: "abate", def: "second", options: ["first", "second", "third", "fourth"] },
  ];
  storyMCQIndex = 0;
  storyMCQCorrect = 0;
  storyMCQMode = "batch";
  storyMCQResults = [];
  document.getElementById("readingMcqPane").classList.add("active");
  renderStoryMCQ();
});
if (await page.locator("#mcqContent > .bookmark-row + .quiz-card").count() !== 1) throw new Error("Batch source badges are not above the card");
if (await page.locator("#mcqContent > .bookmark-row").evaluate(el => getComputedStyle(el).justifyContent) !== "flex-end") throw new Error("Batch source badges are not right-aligned");
if (await page.locator("#mcqContent .gre-source-badge").count() !== 2) throw new Error("Batch MCQ did not show both source badges");
if (await page.locator("#mcqContent .bookmark-btn[data-bm-word='aberrant']").count() !== 1) throw new Error("Batch MCQ did not show the current-word bookmark");
await page.locator("#mcqContent .quiz-option[data-correct='true']").click();
await page.waitForTimeout(1600);
await page.locator("#mcqContent .quiz-option[data-correct='false']").first().click();
await page.getByText("1 / 2", { exact: true }).waitFor({ timeout: 3000 });
await page.getByRole("heading", { name: "✅ Correct words (1)" }).waitFor();
await page.getByRole("heading", { name: "❌ Incorrect words (1)" }).waitFor();
await page.locator(".mcq-result-item.correct b", { hasText: "aberrant" }).waitFor();
await page.locator(".mcq-result-item.wrong b", { hasText: "abate" }).waitFor();
if (await page.getByText("Your answer:", { exact: false }).count()) throw new Error("Summary still shows the selected answer");
if (await page.getByText("Correct answer:", { exact: false }).count()) throw new Error("Summary still shows the correct definition");
if (await page.getByText("first", { exact: true }).count()) throw new Error("Summary still shows definitions");

// Definition-popup entry point: a one-word quiz stays on immediate feedback.
await page.evaluate(() => {
  const match = GRE_STORIES.flatMap((story, storyIdx) => story.vocab.map(entry => ({ entry, storyIdx }))).find(({ entry }) => MAGOOSH_WORDS.has(entry.word.toLowerCase()) || GREGMAT_WORDS.has(entry.word.toLowerCase()));
  showWordPopup(match.entry.word, match.storyIdx);
});
if (await page.locator("#wpSourceBadges .gre-source-badge").count() < 1) throw new Error("Definition popup did not show a source badge beside its actions");
if (await page.locator("#wpSourceBadges + #wpBookmark").count() !== 1) throw new Error("Definition popup source badges are not beside the bookmark");
await page.evaluate(() => {
  const match = GRE_STORIES.flatMap((story, storyIdx) => story.vocab.map(entry => ({ entry, storyIdx }))).find(({ entry }) => MAGOOSH_WORDS.has(entry.word.toLowerCase()) || GREGMAT_WORDS.has(entry.word.toLowerCase()));
  const entry = match.entry;
  currentPopupWord = entry.word;
  currentPopupStoryIdx = match.storyIdx;
  mcqFromPopup();
});
if (await page.locator("#mcqContent > .bookmark-row + .quiz-card").count() !== 1) throw new Error("Popup single-word source badge is not above the card");
if (await page.locator("#mcqContent > .bookmark-row").evaluate(el => getComputedStyle(el).justifyContent) !== "flex-end") throw new Error("Popup single-word source badge is not right-aligned");
if (await page.locator("#mcqContent .gre-source-badge").count() < 1) throw new Error("Popup single-word MCQ did not show a source badge");
await page.locator("#mcqContent .quiz-option[data-correct='true']").click();
await page.waitForTimeout(1700);
if (await page.locator(".mcq-summary").count()) throw new Error("Popup single-word MCQ showed a summary");
await page.getByText("✅ Correct!", { exact: true }).waitFor();

// Shift-click entry point: also stays on immediate feedback without a summary.
await page.evaluate(() => {
  const match = GRE_STORIES.flatMap((story, storyIdx) => story.vocab.map(entry => ({ entry, storyIdx }))).find(({ entry }) => MAGOOSH_WORDS.has(entry.word.toLowerCase()) || GREGMAT_WORDS.has(entry.word.toLowerCase()));
  const entry = match.entry;
  const word = document.createElement("button");
  word.className = "gre-word";
  word.dataset.word = entry.word;
  word.dataset.story = String(match.storyIdx);
  document.body.appendChild(word);
  word.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
});
if (await page.locator("#mcqContent > .bookmark-row + .quiz-card").count() !== 1) throw new Error("Shift-click source badge is not above the card");
if (await page.locator("#mcqContent > .bookmark-row").evaluate(el => getComputedStyle(el).justifyContent) !== "flex-end") throw new Error("Shift-click source badge is not right-aligned");
if (await page.locator("#mcqContent .gre-source-badge").count() < 1) throw new Error("Shift-click MCQ did not show a source badge");
await page.locator("#mcqContent .quiz-option[data-correct='false']").first().click();
await page.waitForTimeout(1700);
if (await page.locator(".mcq-summary").count()) throw new Error("Shift-click single-word MCQ showed a summary");
await page.locator("#quizFeedback.wrong").waitFor();

console.log(JSON.stringify({ batchSummary: "passed", popupSingle: "passed", shiftClickSingle: "passed" }));
await browser.close();
