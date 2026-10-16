import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'file:///Users/home/projects/mi-definition-2026/node_modules/playwright-core/index.mjs';

const html = fs.readFileSync('index.html', 'utf8');
const stories = JSON.parse(html.match(/var GRE_STORIES = (\[.*?\]);/s)[1]);
const sourceStories = JSON.parse(fs.readFileSync('src/data/stories.ts', 'utf8').split('= ')[1].trim().replace(/;$/, ''));
const story = stories.find(item => item.id === 39);
const sourceStory = sourceStories.find(item => item.id === 39);
const previousStories = stories.filter(item => item.id < 39);
const previousProse = previousStories.flatMap(item => item.paragraphs).join(' ').toLowerCase();
const previousVocab = new Set(previousStories.flatMap(item => item.vocab.map(vocab => vocab.word.toLowerCase())));
const markedWords = [...story.paragraphs.join(' ').matchAll(/\*\*(.*?)\*\*/g)].map(match => match[1]);

assert.equal(stories.length, 40);
assert.deepEqual(story, sourceStory);
assert.equal(story.id, 39);
assert.equal(story.styleInspiration, 'F. Scott Fitzgerald');
assert.equal(story.wordCount, 46);
assert.equal(story.illustration.src, '/stories/story-39-villa-borrowed-light.png');
assert.deepEqual(new Set(markedWords), new Set(story.vocab.map(vocab => vocab.word)));
for (const { word } of story.vocab) {
  assert(!previousVocab.has(word.toLowerCase()), `Previously taught: ${word}`);
  assert(!new RegExp(`\\b${word}\\b`, 'i').test(previousProse), `Previously in prose: ${word}`);
}

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.argv[2] || process.env.QA_URL || 'http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await page.evaluate(() => { selectStudent('Story 39 QA'); openStoryList(); });
  assert.equal(await page.locator('.story-card').count(), 40);
  await page.locator('.story-card', { hasText: story.title }).click();
  assert.equal(await page.locator('#readerTitle').textContent(), story.title);
  assert.equal(await page.locator('#readerBody .gre-word').count(), 46);
  const illustration = page.locator('#readerBody .story-illustration img');
  await illustration.evaluate(img => img.decode());
  assert.equal(await illustration.count(), 1);
  assert.equal(await illustration.evaluate(img => img.naturalWidth), 1086);

  const appData = await page.evaluate(() => {
    const storyIndex = 38;
    const selected = GRE_STORIES[storyIndex];
    return {
      missing: selected.vocab.filter(vocab => getWordData(vocab.word).def === '(not found)'),
      offList: selected.vocab.filter(vocab => !MAGOOSH_WORDS.has(vocab.word) && !GREGMAT_WORDS.has(vocab.word)),
      brokenLinks: selected.vocab.filter(vocab => STORY_PROSE_INDEX[vocab.word] !== storyIndex),
      questions: generateStoryMCQQuestions(selected),
      sorts: ['default', 'az', 'za', 'words-desc', 'words-asc', 'echo', 'babas', 'masochist', 'gre-desc', 'gre-asc']
        .map(mode => { storySortMode = mode; return getSortedStories().find(item => item.story.id === 39).index; })
    };
  });
  assert.deepEqual(appData.missing, []);
  assert.deepEqual(appData.offList, []);
  assert.deepEqual(appData.brokenLinks, []);
  assert.equal(appData.questions.length, 46);
  assert(appData.sorts.every(index => index === 38));
  for (const question of appData.questions) {
    assert.equal(new Set(question.options).size, 4);
    assert(question.options.includes(question.def));
  }

  await page.evaluate(() => { showWordPopup('fervent', 38); bookmarkFromPopup(); });
  assert.match(await page.locator('#readerGenre').textContent(), /1\/46/);
  await page.evaluate(() => mcqFromPopup());
  assert.equal(await page.locator('#mcqContent .quiz-option').count(), 4);
  await page.locator('#mcqContent .quiz-option[data-correct="true"]').click();
  await page.getByText('✅ Correct!', { exact: true }).waitFor();
  await page.evaluate(() => { closeReadingMCQ(); toggleReadingMCQ(); });
  assert.equal(await page.evaluate(() => storyMCQQuestions.length), 46);

  const speech = await page.evaluate(() => {
    let spoken = '';
    const originalSpeak = speechSynthesis.speak;
    speechSynthesis.speak = utterance => { spoken = utterance.text; };
    startTTS();
    const result = { spoken, count: ttsParas.length, highlighted: document.querySelectorAll('.tts-active').length };
    stopTTS();
    speechSynthesis.speak = originalSpeak;
    return result;
  });
  assert.equal(speech.spoken, story.paragraphs[0]);
  assert.equal(speech.count, story.paragraphs.length);
  assert.equal(speech.highlighted, 1);

  const print = await page.evaluate(() => {
    let output = '';
    const originalOpen = window.open;
    window.open = () => ({ document: { write: value => { output += value; }, close() {} }, focus() {}, print() {} });
    exportStoryPDF();
    window.open = originalOpen;
    return output;
  });
  assert(print.includes(story.title));
  for (const vocab of story.vocab) assert(print.includes(`<b>${vocab.word}</b> — ${vocab.def}`));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => openReader(38));
  assert(await page.evaluate(() => readerBody.scrollWidth <= readerBody.clientWidth));
  assert.deepEqual(errors, []);
  console.log('PASS: Story 39 data, 46 unused source-list words, illustrated reader, sorting, bookmarks, quizzes, narration, print, and mobile layout.');
} finally {
  await browser.close();
}
