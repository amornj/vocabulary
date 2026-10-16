import assert from 'node:assert/strict';
import { chromium } from 'file:///Users/home/projects/mi-definition-2026/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => { window.print = () => { window.printCalled = true; }; });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.argv[2] || 'http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await page.evaluate(() => { selectStudent('Illustration QA'); openReader(35); });
  const art = page.locator('#readerBody > .story-illustration img');
  await art.evaluate(img => img.decode());
  assert.equal(await art.count(), 1);
  assert(await art.getAttribute('alt'));
  assert.equal(await art.evaluate(img => img.naturalWidth), 1071);
  assert.equal(await page.locator('#readerBody > p').count(), await page.evaluate(() => GRE_STORIES[35].paragraphs.length));
  assert.equal(await page.locator('#readerBody .gre-word').count(), 45);
  for (const [name, width, height] of [['desktop',1280,900], ['mobile',390,844]]) {
    await page.setViewportSize({ width, height });
    const box = await art.boundingBox();
    assert(box.width > 100 && box.width <= width);
    assert(box.height <= height * .7 + 1);
    assert(Math.abs(box.width / box.height - 1071 / 1468) < .01);
    assert(await page.evaluate(() => readerBody.scrollWidth <= readerBody.clientWidth));
    await page.screenshot({ path: `/tmp/story-36-art-${name}.png` });
  }
  const speech = await page.evaluate(() => {
    let text;
    const originalSpeak = speechSynthesis.speak;
    speechSynthesis.speak = utter => { text = utter.text; };
    startTTS();
    const result = { text, paragraphs: ttsParas.length };
    stopTTS();
    speechSynthesis.speak = originalSpeak;
    return result;
  });
  assert.equal(speech.text, 'The city remembered saving a woman who had never been born.');
  assert.equal(speech.paragraphs, await page.evaluate(() => GRE_STORIES[35].paragraphs.length));
  await page.evaluate(() => { showWordPopup('synoptic',35); bookmarkFromPopup(); closeWordPopup(); openGreReaderPane('synoptic'); });
  await page.locator('#greReaderContent .story-illustration img').evaluate(img => img.decode());
  assert.equal(await page.locator('#greReaderContent .story-illustration').count(), 1);
  await page.evaluate(() => closeGreReaderPane());
  const popupPromise = page.waitForEvent('popup');
  await page.evaluate(() => exportStoryPDF());
  const popup = await popupPromise;
  await popup.waitForFunction(() => window.printCalled === true);
  assert(await popup.locator('.story-illustration img').evaluate(img => img.complete && img.naturalWidth === 1071));
  assert.equal(await popup.locator('.vocab-grid li').count(), 45);
  await popup.close();
  await page.evaluate(() => openReader(36));
  assert.equal(await page.locator('#readerBody .story-illustration').count(), 0);
  assert.equal(await page.locator('#readerBody > p').first().textContent(), "I. Miss Lydia Harcourt's Account");
  assert.deepEqual(errors, []);
  console.log('PASS: optional image loads; desktop/mobile aspect ratio and sizing; no text or vocabulary changes; text-only narration; bookmarks; vocabulary reader; PDF waits for image; unillustrated stories unchanged.');
} finally { await browser.close(); }
