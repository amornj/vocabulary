import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'file:///Users/home/projects/mi-definition-2026/node_modules/playwright-core/index.mjs';

const html = fs.readFileSync('index.html', 'utf8');
const stories = JSON.parse(html.match(/var GRE_STORIES = (\[.*?\]);/)[1]);
const sourceStories = JSON.parse(fs.readFileSync('src/data/stories.ts', 'utf8').split('= ')[1].trim().replace(/;$/, ''));
const story = stories.at(-1);
assert.equal(stories.length, 36);
assert.deepEqual(story, sourceStories.at(-1));
assert.equal(story.id, 36);
assert.equal(story.styleInspiration, 'Isaac Asimov');
assert.equal(story.wordCount, 45);
const oldProse = stories.slice(0, -1).flatMap(s => s.paragraphs).join(' ').toLowerCase();
const oldVocab = new Set(stories.slice(0, -1).flatMap(s => s.vocab.map(v => v.word.toLowerCase())));
const marks = story.paragraphs.join(' ').matchAll(/\*\*(.*?)\*\*/g);
assert.deepEqual(new Set(Array.from(marks, m => m[1])), new Set(story.vocab.map(v => v.word)));
for (const { word } of story.vocab) {
  assert(!oldVocab.has(word), `Previously taught: ${word}`);
  assert(!new RegExp(`\\b${word}\\b`, 'i').test(oldProse), `Previously in prose: ${word}`);
}
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.argv[2] || process.env.QA_URL || 'http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await page.evaluate(() => { selectStudent('Story QA'); openStoryList(); });
  assert.equal(await page.locator('.story-card').count(), 36);
  await page.locator('.story-card', { hasText: story.title }).click();
  assert.equal(await page.locator('#readerTitle').textContent(), story.title);
  assert.equal(await page.locator('#readerBody .gre-word').count(), 45);
  const data = await page.evaluate(() => {
    const s = GRE_STORIES[35];
    return {
      missing: s.vocab.filter(v => getWordData(v.word).def === '(not found)'),
      sources: s.vocab.filter(v => !MAGOOSH_WORDS.has(v.word) && !GREGMAT_WORDS.has(v.word)),
      links: s.vocab.filter(v => STORY_PROSE_INDEX[v.word] !== 35),
      questions: generateStoryMCQQuestions(s),
      sorts: ['default','az','za','words-desc','words-asc','echo','babas','masochist','gre-desc','gre-asc'].map(mode => {
        storySortMode = mode;
        const item = getSortedStories().find(x => x.story.id === 36);
        return item.index;
      })
    };
  });
  assert.deepEqual(data.missing, []);
  assert.deepEqual(data.sources, []);
  assert.deepEqual(data.links, []);
  assert(data.sorts.every(i => i === 35));
  assert.equal(data.questions.length, 45);
  for (const q of data.questions) { assert.equal(new Set(q.options).size, 4); assert(q.options.includes(q.def)); }
  for (const v of story.vocab) {
    await page.evaluate(word => showWordPopup(word, 35), v.word);
    assert.equal(await page.locator('#wpDef').textContent(), v.def);
    assert.equal(await page.locator('#wpSourceBadges .gre-source-badge').count(), 1);
  }
  await page.evaluate(() => { showWordPopup('synoptic', 35); bookmarkFromPopup(); });
  assert.match(await page.locator('#readerGenre').textContent(), /1\/45/);
  assert(await page.evaluate(() => JSON.parse(localStorage.getItem('vocab_Story QA')).bookmarks.includes('synoptic')));
  await page.evaluate(() => mcqFromPopup());
  assert.equal(await page.locator('#mcqContent .quiz-option').count(), 4);
  await page.locator('#mcqContent .quiz-option[data-correct="true"]').click();
  await page.getByText('✅ Correct!', { exact: true }).waitFor();
  await page.evaluate(() => { closeReadingMCQ(); toggleReadingMCQ(); });
  assert.equal(await page.evaluate(() => storyMCQQuestions.length), 45);
  await page.evaluate(() => {
    storyMCQIndex = storyMCQQuestions.length - 1;
    renderStoryMCQ();
  });
  await page.locator('#mcqContent .quiz-option[data-correct="true"]').click();
  await page.locator('.mcq-summary').waitFor();
  await page.evaluate(() => { closeReadingMCQ(); openGreReaderPane('synoptic'); });
  assert.equal(await page.locator('.gre-reader-title').textContent(), story.title);
  assert((await page.locator('#greReaderContent .gre-highlight').count()) > 0);
  await page.evaluate(() => closeGreReaderPane());
  const speech = await page.evaluate(() => {
    let spoken = '';
    const originalSpeak = speechSynthesis.speak;
    speechSynthesis.speak = utter => { spoken = utter.text; };
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
    window.open = () => ({ document: { write: s => { output += s; }, close() {} }, focus() {}, print() {} });
    exportStoryPDF();
    window.open = originalOpen;
    return output;
  });
  assert(print.includes(story.title));
  for (const v of story.vocab) assert(print.includes(`<b>${v.word}</b> — ${v.def}`));
  await page.screenshot({ path: '/tmp/story-36-desktop.png', fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => openReader(35));
  assert(await page.evaluate(() => document.getElementById('readerBody').scrollWidth <= document.getElementById('readerBody').clientWidth));
  await page.screenshot({ path: '/tmp/story-36-mobile.png', fullPage: false });
  assert.deepEqual(errors, []);
  console.log('PASS: 45 unused source-list words; data parity; all word definitions/badges; reader; sorting; bookmarks; quizzes; story links; narration dispatch; print content; mobile layout.');
} finally { await browser.close(); }
