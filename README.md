# Vocabulary — SRS English Learning

A 100% static, offline-first vocabulary app for spaced repetition learning. Vite + TypeScript, zero backend, deploys to Vercel. All progress lives in `localStorage`.

**Live:** https://vocabulary-eta-ten.vercel.app

---

## What it is

A self-contained English vocabulary trainer with:

- **3,280 words** across 6 levels (Grade 9 → GRE), each with part-of-speech, definition, and example sentence
- **60 illustrated stories** (aquatint art) that embed vocabulary in context
- **4 study modes:** Flashcard, SRS (spaced repetition), Quiz, Adaptive
- **SRS engine:** 6-box Leitner-style scheduling with configurable intervals
- **Custom decks & bookmarks**, multi-profile support, daily goals, streaks, XP
- **Story reader** with word highlighting and vocabulary integration

### Levels

| Level | Name | Words |
|-------|------|-------|
| 1 | Grade 9 — Foundational | 101 |
| 2 | Grade 10 — Intermediate | 100 |
| 3 | Grade 11 — Advanced | 98 |
| 4 | Grade 12 — College Ready | 115 |
| 5 | TOEFL/IELTS — Academic | 982 |
| 6 | GRE — Graduate Exam | 1,884 |

Level 6 (GRE) is split into 19 parts of 100 words each for focused study.

### SRS intervals

Boxes map to review delays: 1 min → 10 min → 1 day → 3 days → 7 days → 30 days.

### Stories

60 short stories inspired by literary styles (H.G. Wells, Borges, Murakami, etc.), each tightly woven with target vocabulary. Bold-highlighted words link back to definitions. Illustrations and prose are generated and QA-checked via `scripts/qa-story-*.mjs`.

---

## Tech

- **No framework** — vanilla TypeScript + Vite
- `src/data/words.ts` — 3,280 words (level, word, pos, def, sentence)
- `src/data/stories.ts` — 60 stories (paragraphs, vocab links, illustrations)
- `src/data/constants.ts` — level definitions, counts, SRS intervals
- `src/types.ts` — `Word`, `Story`, `SrsCard`, `Profile`, `Deck`, `View`
- `src/hooks/` — `useLocalStorage`, `useProfiles`, `useSRS`
- `src/appHtml.ts` — app shell rendering
- `public/stories/` — 60 story illustrations + `manifest.json`
- `dist/` — Vite build output (static)

No server, no database. Everything persists in the browser.

---

## Run locally

```sh
npm install
npm run build   # → dist/
npm run dev     # Vite dev server on :5173
```

No toolchain beyond Node 18+ and npm.

---

## Deploy

Linked to Vercel project `vocabulary` (static Vite output from `dist/`):

```sh
vercel --prod
```

---

## Project structure

```
src/
  data/        words.ts, stories.ts, constants.ts
  hooks/       useLocalStorage, useProfiles, useSRS
  types.ts
  appHtml.ts   main app shell
  index.css
public/
  stories/     60 illustrations + manifest
scripts/       QA scripts per story
```

---

## License

Private project. All rights reserved.
