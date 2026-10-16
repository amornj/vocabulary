import { useCallback } from 'react';
import { INTERVALS } from '../data/constants';
import type { SrsCard, Profile } from '../types';

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function createEmptyCard(level: number): SrsCard {
  return { level, box: 1, due: Date.now(), lastReview: 0 };
}

// Rate a word: box 1-6, updates due time based on INTERVALS
export function rateCard(card: SrsCard, quality: 'again' | 'hard' | 'good' | 'easy'): SrsCard {
  let box = card.box;
  if (quality === 'again') {
    box = 1;
  } else if (quality === 'hard') {
    box = Math.max(2, box);
  } else if (quality === 'good') {
    box = Math.min(6, box + 1);
  } else if (quality === 'easy') {
    box = Math.min(6, box + 2);
  }
  const intervalMin = INTERVALS[box * 10] || 43200;
  const due = Date.now() + intervalMin * 60 * 1000;
  return { ...card, box, due, lastReview: Date.now() };
}

export function isCardDue(card: SrsCard): boolean {
  return card.due <= Date.now();
}

export function getDueWords(progress: Record<string, SrsCard>): string[] {
  return Object.entries(progress)
    .filter(([_, card]) => isCardDue(card))
    .map(([word]) => word);
}

export function getNewWords(progress: Record<string, SrsCard>, allWords: string[], limit: number): string[] {
  return allWords.filter(w => !progress[w]).slice(0, limit);
}

export function updateStreak(profile: Profile): Profile {
  const today = todayStr();
  if (profile.lastStudy === today) return profile;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (profile.lastStudy === yesterday) {
    return { ...profile, streak: profile.streak + 1, lastStudy: today };
  }
  return { ...profile, streak: 1, lastStudy: today };
}

export function recordStudyActivity(profile: Profile): Profile {
  const today = todayStr();
  let updated = { ...profile };
  if (updated.dailyDate !== today) {
    updated.dailyDate = today;
    updated.dailyCount = 0;
  }
  updated.dailyCount++;
  updated.xp = (updated.xp || 0) + 10;
  updated = updateStreak(updated);
  return updated;
}