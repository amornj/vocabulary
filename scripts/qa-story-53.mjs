import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'file:///Users/home/projects/mi-definition-2026/node_modules/playwright-core/index.mjs';

const html = fs.readFileSync('index.html', 'utf8');
const stories = JSON.parse(html.match(/var GRE_STORIES = (\[.*?\]);/s)[1]);
const source = JSON.parse(fs.readFileSync('src/data/stories.ts', 'utf8').split('= ')[1].trim().replace(/;$/, ''));
const story = stories.at(-1);
const marked = [...story.paragraphs.join(' ').matchAll(/\*\*(.*?)\*\*/g)].map(m => m[1]);
const count = (story.paragraphs.join(' ').replaceAll('**', '').match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length;
assert.equal(stories.length, 53);
assert.deepEqual(stories, source);
assert.equal(story.id, 53);
assert.equal(story.title, 'Seven Minutes of Gravity');
assert.equal(story.styleInspiration, 'Andy Weir');
assert(story.illustration);
assert.equal(count, 2500);
assert.equal(story.wordCount, 40);
assert.equal(marked.length, 40);
assert.equal(new Set(marked).size, 40);
assert.deepEqual(new Set(marked), new Set(story.vocab.map(v => v.word)));
const recent = new Set(stories.slice(-7, -1).flatMap(s => s.vocab.map(v => v.word)));
assert.deepEqual(story.vocab.filter(v => recent.has(v.word)), []);

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const speech = {
      current: null, spoken: [], paused: false,
      cancel() { this.current = null; }, pause() { this.paused = true; }, resume() { this.paused = false; },
      speak(u) { this.current = u; this.spoken.push(u.text); },
      finish() { const u = this.current; this.current = null; u.onend(); }
    };
    Object.defineProperty(window, 'speechSynthesis', { value: speech, configurable: true });
  });
  await page.goto(process.argv[2] || process.env.QA_URL || 'http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await page.evaluate(() => { selectStudent('Story 53 QA'); openStoryList(); });
  assert.equal(await page.locator('#readingStoryCount').textContent(), '53');
  assert.equal(await page.locator('.story-card').count(), 53);
  await page.locator('#storySearchInput').fill('seven minutes');
  assert.equal(await page.locator('.story-card').count(), 1);
  await page.locator('.story-card .sc-info').click();
  assert.equal(await page.locator('#readerTitle').textContent(), story.title);
  assert.equal(await page.locator('#readerBody .gre-word').count(), 40);
  assert.equal(await page.locator('#readerBody img').count(), 1);
  await page.locator('#readerBody img').evaluate(img => img.decode());
  assert.equal(await page.locator('#readerBody p').count(), story.paragraphs.length);
  assert(await page.evaluate(() => currentStudent.readStories.includes(53)));
  const data = await page.evaluate(() => ({
    missing: GRE_STORIES[52].vocab.filter(v => getWordData(v.word).def === '(not found)'),
    offList: GRE_STORIES[52].vocab.filter(v => !MAGOOSH_WORDS.has(v.word) && !GREGMAT_WORDS.has(v.word)),
    links: GRE_STORIES[52].vocab.filter(v => STORY_PROSE_INDEX[v.word] !== 52),
    questions: generateStoryMCQQuestions(GRE_STORIES[52]),
    sorts: ['default','az','za','words-desc','words-asc','echo','babas','masochist','gre-desc','gre-asc','unread-first','read-first']
      .map(mode => { storySortMode = mode; return getSortedStories().find(x => x.story.id === 53).index; })
  }));
  assert.deepEqual(data.missing, []); assert.deepEqual(data.offList, []); assert.deepEqual(data.links, []);
  assert(data.sorts.every(i => i === 52));
  assert.equal(data.questions.length, 40);
  for (const q of data.questions) { assert.equal(new Set(q.options).size, 4); assert(q.options.includes(q.def)); }
  for (const v of story.vocab) {
    await page.locator(`#readerBody .gre-word[data-word="${v.word}"]`).click();
    assert.equal(await page.locator('#wpWord').textContent(), v.word);
    assert.equal(await page.locator('#wpDef').textContent(), v.def);
    assert(await page.locator('#wpSourceBadges .gre-source-badge').count() >= 1);
    await page.locator('#wordPopup .wp-close').click();
  }
  await page.locator('#readerBody .gre-word[data-word="flounder"]').click();
  await page.locator('#wpBookmark').click();
  assert.match(await page.locator('#readerGenre').textContent(), /1\/40/);
  await page.locator('#wpMcqBtn').click();
  assert.equal(await page.locator('#mcqContent .quiz-option').count(), 4);
  await page.locator('#mcqContent .quiz-option[data-correct="true"]').click();
  assert.equal(await page.locator('#quizFeedback').textContent(), '✅ Correct!');
  await page.locator('#mcqContent [data-bm-word="flounder"]').click();
  assert.match(await page.locator('#readerGenre').textContent(), /0\/40/, 'Quiz bookmarking must update the reader counter');
  await page.evaluate(() => closeReadingMCQ());
  await page.locator('#readerBody .gre-word[data-word="flounder"]').click({ modifiers: ['Shift'] });
  assert.equal(await page.evaluate(() => storyMCQMode), 'single');
  await page.locator('#mcqContent .quiz-option[data-correct="false"]').first().click();
  assert(await page.locator('#quizFeedback').getAttribute('class').then(c => c.includes('wrong')));
  await page.evaluate(() => closeReadingMCQ());
  console.log('PASS: 53 stories, search, 12 sorts, all word popups and sources, bookmarks, single-word quizzes, story links, aquatint illustration.');

  // Drive every question through the UI, advancing the actual quiz timers deterministically.
  await page.clock.install();
  await page.locator('#mcqBtn').click();
  for (let i = 0; i < 40; i++) {
    assert.equal(await page.evaluate(() => storyMCQIndex), i);
    await page.locator(`#mcqContent .quiz-option[data-correct="${i !== 0}"]`).first().click();
    await page.clock.runFor(1501);
  }
  assert.equal(await page.locator('.mcq-summary-score .score').textContent(), '39 / 40');
  await page.locator('.mcq-summary-actions .review').click();
  assert.equal(await page.evaluate(() => storyMCQQuestions.length), 1);
  await page.locator('#mcqContent .quiz-option[data-correct="true"]').click();
  await page.clock.runFor(1501);
  assert.equal(await page.locator('.mcq-summary-score .score').textContent(), '1 / 1');
  await page.locator('.mcq-summary-actions .return').click();
  // An answer's delayed callback must not advance a newly opened single-word quiz.
  await page.locator('#mcqBtn').click();
  await page.locator('#mcqContent .quiz-option[data-correct="true"]').click();
  await page.evaluate(() => { closeReadingMCQ(); openSingleWordMCQ('flounder', 52); });
  await page.clock.runFor(1600);
  assert.equal(await page.evaluate(() => storyMCQIndex), 0, 'Canceled quiz timer leaked into another quiz');
  // A rapid repeat event must not score the same answer twice.
  await page.locator('#mcqContent .quiz-option[data-correct="true"]').evaluate(el => { el.click(); el.click(); });
  assert.equal(await page.evaluate(() => storyMCQResults.length), 1);
  // Switching stories clears a pending batch and its overlay.
  await page.evaluate(() => closeReadingMCQ());
  await page.locator('#mcqBtn').click();
  await page.locator('#mcqContent .quiz-option[data-correct="true"]').click();
  await page.evaluate(() => { openReader(0); openReader(52); });
  await page.clock.runFor(1600);
  assert.equal(await page.locator('#readingMcqPane.active').count(), 0);
  assert.equal(await page.evaluate(() => storyMCQIndex), 0);
  const singles = await page.evaluate(() => GRE_STORIES[52].vocab.map(v => {
    openSingleWordMCQ(v.word, 52);
    return storyMCQQuestions[0];
  }));
  for (const q of singles) { assert.equal(new Set(q.options).size, 4); assert(q.options.includes(q.def)); }
  await page.evaluate(() => closeReadingMCQ());
  console.log('PASS: full 40-question batch, correct/wrong feedback, score, wrong-answer review, returning to reading, quiz cancellation.');

  await page.locator('#ttsBtn').click();
  assert.equal(await page.evaluate(() => speechSynthesis.spoken.at(-1)), story.paragraphs[0]);
  await page.evaluate(() => speechSynthesis.finish());
  assert.equal(await page.evaluate(() => ttsIdx), 1);
  await page.locator('#ttsBtn').click();
  assert.equal(await page.locator('#ttsBtn').getAttribute('aria-label'), 'Resume read aloud');
  const n = await page.evaluate(() => speechSynthesis.spoken.length);
  await page.locator('#ttsBtn').click();
  assert.equal(await page.evaluate(() => speechSynthesis.spoken.length), n);
  assert.equal(await page.locator('#readerBody .tts-active').count(), 1);
  await page.evaluate(() => { while (ttsPlaying) speechSynthesis.finish(); });
  assert.equal(await page.locator('#ttsBtn').getAttribute('aria-label'), 'Read aloud');
  assert.equal(await page.locator('#readerBody .tts-active').count(), 0);
  const spoken = await page.evaluate(() => speechSynthesis.spoken);
  assert.deepEqual(spoken, story.paragraphs.map(p => p.replaceAll('**', '')));

  // Inspect the real export window and keep the automated run out of the OS print dialog.
  await page.evaluate(() => {
    const open = window.open;
    window.open = (...args) => { const w = open(...args); w.print = () => { w.__printed = true; }; return w; };
  });
  const popupPromise = page.waitForEvent('popup');
  await page.locator('#pdfBtn').click();
  const print = await popupPromise;
  assert.equal(await print.locator('h1').textContent(), story.title);
  assert.equal(await print.locator('img').count(), 1);
  await print.locator('img').evaluate(img => img.decode());
  assert.equal(await print.locator('li').count(), 40);
  for (const v of story.vocab) assert((await print.locator('body').textContent()).includes(`${v.word} — ${v.def}`));
  assert.equal(await print.locator('p').count(), story.paragraphs.length);
  await page.clock.runFor(500);
  await print.getByRole('button', { name: '✕ Close' }).click();

  await page.locator('#readerBody .gre-word[data-word="acerbic"]').click();
  await page.locator('#wpBookmark').click();
  await page.locator('#wordPopup .wp-close').click();
  await page.evaluate(() => { closeReader(); closeStoryList(); });
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => { selectStudent('Story 53 QA'); openStoryList(); });
  assert(await page.evaluate(() => currentStudent.readStories.includes(53)));
  assert(await page.evaluate(() => currentStudent.bookmarks.includes('acerbic')));
  await page.locator('#storySearchInput').fill('seven minutes');
  assert.equal(await page.locator('.story-card.read').count(), 1);
  await page.locator('.story-card .sc-read').click();
  assert.equal(await page.locator('.story-card.read').count(), 0);
  await page.locator('.story-card .sc-info').click();
  assert.match(await page.locator('#readerGenre').textContent(), /1\/40/);
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    assert(await page.evaluate(() => readerBody.scrollWidth <= readerBody.clientWidth), `Overflow at ${width}`);
    await page.locator('#mcqBtn').click();
    assert(await page.locator('#mcqContent .quiz-option').first().isVisible());
    assert(await page.evaluate(() => mcqContent.scrollWidth <= mcqContent.clientWidth));
    await page.evaluate(() => closeReadingMCQ());
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/Users/home/Documents/Codex/2026-10-19/do-you-remember-projects-vocabulary-app/work/story-53-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: '/Users/home/Documents/Codex/2026-10-19/do-you-remember-projects-vocabulary-app/work/story-53-desktop.png' });
  await page.evaluate(() => { closeReader(); openGreReaderPane('flounder'); });
  assert.equal(await page.locator('#greReaderContent .gre-reader-title').textContent(), story.title);
  assert.equal(await page.locator('#greReaderContent img').count(), 1);
  assert(await page.locator('#greReaderContent .gre-highlight').count() >= 1);
  await page.evaluate(() => closeGreReaderPane());
  // Each newly illustrated story loads its artwork in reader, study pane, and print.
  for (const index of [52]) {
    await page.evaluate(i => openReader(i), index);
    const artwork = page.locator('#readerBody .story-illustration img');
    assert.equal(await artwork.count(), 1);
    await artwork.evaluate(img => img.decode());
    const dimensions = await artwork.evaluate(img => [img.naturalWidth, img.naturalHeight]);
    assert.deepEqual(dimensions, [stories[index].illustration.width, stories[index].illustration.height]);
    assert(await artwork.getAttribute('alt'));
    assert.equal(await page.locator('#readerBody .gre-word').count(), 40);
    const popupReady = page.waitForEvent('popup');
    await page.locator('#pdfBtn').click();
    const exported = await popupReady;
    await exported.locator('.story-illustration img').evaluate(img => img.decode());
    assert.equal(await exported.locator('li').count(), 40);
    assert.equal(await exported.locator('h1').textContent(), stories[index].title);
    await exported.close();
    await page.evaluate(i => { closeReader(); openGreReaderPane(GRE_STORIES[i].vocab[0].word); }, index);
    assert.equal(await page.locator('#greReaderContent .gre-reader-title').textContent(), stories[index].title);
    await page.locator('#greReaderContent img').evaluate(img => img.decode());
    await page.evaluate(() => closeGreReaderPane());
  }
  console.log('PASS: aquatint for Story 53 load in main reader, study pane, and PDF export.');
  assert.deepEqual(errors, []);
  console.log(`PASS: Story 53 (${count} words), narration of every paragraph plus pause/resume, PDF window and all vocabulary, read persistence, study reader pane, desktop/tablet/mobile; no JavaScript errors.`);
} finally { await browser.close(); }
