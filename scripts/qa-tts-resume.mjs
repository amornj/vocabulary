import assert from 'node:assert/strict';
import { chromium } from 'file:///Users/home/projects/mi-definition-2026/node_modules/playwright-core/index.mjs';

const url = process.argv[2] || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // Controlled speech events reproduce mid-paragraph pauses and cancellation races.
  await page.addInitScript(() => {
    const synth = {
      paused: false, speaking: false, pending: false, current: null,
      spoken: [], calls: [],
      getVoices() { return []; },
      cancel() { this.calls.push('cancel'); this.current = null; this.speaking = false; },
      pause() { this.calls.push('pause'); this.paused = true; },
      resume() { this.calls.push('resume'); this.paused = false; },
      speak(utter) { this.calls.push('speak'); this.spoken.push(utter); this.current = utter; this.speaking = true; },
      finish() { const utter = this.current; this.current = null; this.speaking = false; utter.onend(); }
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => { selectStudent('TTS QA'); openReader(35); });
  const button = page.locator('#ttsBtn');
  await button.click();
  // Advance beyond the first paragraph, where the original restart bug was obvious.
  await page.evaluate(() => { speechSynthesis.finish(); speechSynthesis.finish(); speechSynthesis.finish(); });
  const before = await page.evaluate(() => {
    window.retainedUtterance = ttsUtterance;
    return { index: ttsIdx, count: speechSynthesis.spoken.length, text: ttsUtterance.text, cancelCount: speechSynthesis.calls.filter(x => x === 'cancel').length };
  });
  assert.equal(before.index, 3);
  for (let i = 0; i < 3; i++) {
    await button.click();
    assert.equal(await button.getAttribute('aria-label'), 'Resume read aloud');
    assert(await page.evaluate(() => ttsPaused && !ttsPlaying && speechSynthesis.paused));
    assert.equal(await page.locator('#readerBody p.tts-active').textContent(), before.text);
    await button.click();
    assert.equal(await button.getAttribute('aria-label'), 'Pause read aloud');
    assert(await page.evaluate(() => ttsPlaying && !ttsPaused && !speechSynthesis.paused && ttsUtterance === window.retainedUtterance));
  }
  const after = await page.evaluate(() => ({ index: ttsIdx, count: speechSynthesis.spoken.length, text: ttsUtterance.text, cancelCount: speechSynthesis.calls.filter(x => x === 'cancel').length }));
  assert.deepEqual(after, before, 'Resume must not cancel, replay, or replace the utterance');
  await page.evaluate(() => speechSynthesis.finish());
  assert.equal(await page.evaluate(() => ttsIdx), 4);
  // A paragraph can finish just as the user pauses. Queue the next one on resume.
  await button.click();
  const count = await page.evaluate(() => speechSynthesis.spoken.length);
  await page.evaluate(() => speechSynthesis.finish());
  assert.equal(await page.evaluate(() => speechSynthesis.spoken.length), count);
  await button.click();
  assert.equal(await page.evaluate(() => ttsIdx), 5);
  assert.equal(await page.evaluate(() => speechSynthesis.spoken.length), count + 1);
  // Switching while paused invalidates both end and error events from the old story.
  await button.click();
  await page.evaluate(() => { window.oldUtterance = ttsUtterance; openReader(36); });
  assert.equal(await button.getAttribute('aria-label'), 'Read aloud');
  assert.equal(await page.locator('#readerBody .tts-active').count(), 0);
  await button.click();
  await page.evaluate(() => { oldUtterance.onend(); oldUtterance.onerror({ error: 'interrupted' }); });
  assert(await page.evaluate(() => ttsIdx === 0 && ttsPlaying && ttsUtterance.text === GRE_STORIES[36].paragraphs[0]));
  // Close while paused, including a delayed callback after reopening.
  await button.click();
  await page.evaluate(() => { window.closedUtterance = ttsUtterance; closeReader(); openReader(0); });
  await button.click();
  await page.evaluate(() => closedUtterance.onend());
  assert(await page.evaluate(() => ttsIdx === 0 && ttsUtterance.text === GRE_STORIES[0].paragraphs[0]));
  // End-of-story and speech failures return to a clean idle state.
  await page.evaluate(() => {
    stopTTS();
    ttsParas = Array.from(document.querySelectorAll('#readerBody p')).slice(0, 1);
    ttsPlaying = true;
    speakNextPara();
    speechSynthesis.finish();
  });
  assert(await page.evaluate(() => !ttsPlaying && !ttsPaused && ttsIdx === 0 && !ttsUtterance));
  await button.click();
  await page.evaluate(() => ttsUtterance.onerror({ error: 'synthesis-failed' }));
  assert.equal(await button.getAttribute('aria-label'), 'Read aloud');
  assert(await page.evaluate(() => !ttsPlaying && !ttsPaused));
  await page.evaluate(() => closeReader());
  assert.deepEqual(errors, []);
  console.log('PASS: repeated in-place resume, paragraph-boundary pause, natural advancement, switching/closing while paused, stale callbacks, completion, speech errors.');

  // Exercise the real browser/OS speech engine as well as deterministic races.
  const native = await browser.newPage();
  await native.goto(url, { waitUntil: 'networkidle' });
  await native.evaluate(() => {
    window.speechEvents = [];
    window.nativeUtterances = [];
    const speak = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = utter => {
      nativeUtterances.push(utter);
      utter.addEventListener('boundary', e => speechEvents.push({ type: 'boundary', text: utter.text, index: e.charIndex }));
      utter.addEventListener('error', e => speechEvents.push({ type: 'error', error: e.error }));
      speak(utter);
    };
    selectStudent('Native TTS QA');
    openReader(35);
    // Use a long paragraph to verify resumption inside its text.
    document.getElementById('readerBody').innerHTML = '<p>' + GRE_STORIES[35].paragraphs[1] + '</p>';
  });
  await native.locator('#ttsBtn').click();
  try {
    await native.waitForFunction(() => speechEvents.some(e => e.type === 'boundary' && e.index >= 20), null, { timeout: 15000 });
    await native.locator('#ttsBtn').click();
    assert(await native.evaluate(() => speechSynthesis.paused && ttsPaused));
    await native.waitForTimeout(500);
    const paused = await native.evaluate(() => ({ index: speechEvents.filter(e => e.type === 'boundary').at(-1).index, count: nativeUtterances.length }));
    await native.waitForTimeout(500);
    assert.equal(await native.evaluate(() => speechEvents.filter(e => e.type === 'boundary').at(-1).index), paused.index);
    await native.locator('#ttsBtn').click();
    await native.waitForFunction(index => speechEvents.some(e => e.type === 'boundary' && e.index > index), paused.index, { timeout: 10000 });
    assert.equal(await native.evaluate(() => nativeUtterances.length), paused.count);
    assert(await native.evaluate(() => !speechSynthesis.paused && ttsPlaying));
    console.log('PASS: real Chrome speech engine paused mid-paragraph and resumed at a later character in the same utterance.');
  } catch (error) {
    console.error('Native speech test failed:', await native.evaluate(() => ({ voices: speechSynthesis.getVoices().length, events: speechEvents, paused: speechSynthesis.paused, speaking: speechSynthesis.speaking })));
    throw error;
  } finally { await native.evaluate(() => stopTTS()); }
} finally { await browser.close(); }
