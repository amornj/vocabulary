import fs from 'node:fs';

const sourcePath = new URL('../src/data/stories.ts', import.meta.url);
const indexPath = new URL('../index.html', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8');
const sourceMatch = source.match(/export const GRE_STORIES: Story\[\] = (\[.*\]);\s*$/s);

if (!sourceMatch) {
  throw new Error('Could not parse GRE_STORIES from src/data/stories.ts');
}

const stories = JSON.parse(sourceMatch[1]);
const index = fs.readFileSync(indexPath, 'utf8');
const indexMatch = index.match(/var GRE_STORIES = \[.*?\];/s);

if (!indexMatch) {
  throw new Error('Could not locate GRE_STORIES in index.html');
}

const next = index.replace(
  /var GRE_STORIES = \[.*?\];/s,
  `var GRE_STORIES = ${JSON.stringify(stories)};`,
);

if (next === index) {
  console.log(`Story data already synced (${stories.length} stories)`);
  process.exit(0);
}

fs.writeFileSync(indexPath, next);
console.log(`Synced ${stories.length} stories into index.html`);
