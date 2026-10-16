import { useCallback } from 'react';
import type { Profile } from '../types';

const STORAGE_KEY = 'vocab_lastStudent';

export function getProfiles(): string[] {
  const raw = localStorage.getItem('vocab_profiles');
  return raw ? JSON.parse(raw) : [];
}

export function saveProfiles(profiles: string[]) {
  localStorage.setItem('vocab_profiles', JSON.stringify(profiles));
}

export function loadStudent(name: string): Profile {
  const raw = localStorage.getItem('vocab_' + name);
  if (raw) return JSON.parse(raw);
  return {
    name,
    xp: 0,
    streak: 0,
    lastStudy: null,
    dailyGoal: 10,
    reviewLimit: 20,
    dailyCount: 0,
    dailyDate: null,
    progress: {},
    bookmarks: [],
    showTimer: true,
    customDecks: [],
    autorunMode: 'word',
    autorunInterval: 2,
    flashRandom: false,
  };
}

export function saveStudent(s: Profile) {
  localStorage.setItem('vocab_' + s.name, JSON.stringify(s));
}

export function getLastStudent(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setLastStudent(name: string) {
  localStorage.setItem(STORAGE_KEY, name);
}

export function createProfile(name: string): Profile {
  const profiles = getProfiles();
  if (profiles.includes(name)) return loadStudent(name);
  profiles.push(name);
  saveProfiles(profiles);
  const s = loadStudent(name);
  saveStudent(s);
  return s;
}

export function deleteProfile(name: string) {
  const profiles = getProfiles().filter(p => p !== name);
  saveProfiles(profiles);
  localStorage.removeItem('vocab_' + name);
  localStorage.removeItem('vocab_customWords_' + name);
  localStorage.removeItem('vocab_roundCounts_' + name);
  if (getLastStudent() === name) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getCustomWords(name: string): { word: string; def: string; pos: string; sentence: string }[] {
  const raw = localStorage.getItem('vocab_customWords_' + name);
  return raw ? JSON.parse(raw) : [];
}

export function saveCustomWords(name: string, words: any[]) {
  localStorage.setItem('vocab_customWords_' + name, JSON.stringify(words));
}

export function getRoundCounts(name: string): Record<string, number> {
  const raw = localStorage.getItem('vocab_roundCounts_' + name);
  return raw ? JSON.parse(raw) : {};
}

export function saveRoundCounts(name: string, counts: Record<string, number>) {
  localStorage.setItem('vocab_roundCounts_' + name, JSON.stringify(counts));
}
