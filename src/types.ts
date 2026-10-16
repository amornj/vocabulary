export interface Word {
  level: number;
  word: string;
  pos: string;
  def: string;
  sentence: string;
}

export interface Story {
  id: number;
  title: string;
  genre: string;
  styleInspiration: string;
  wordCount: number;
  paragraphs: string[];
  vocab: { word: string; def: string }[];
}

export interface SrsCard {
  level: number;
  box: number;       // 1-6
  due: number;        // timestamp (ms)
  lastReview: number; // timestamp
}

export interface Profile {
  name: string;
  xp: number;
  streak: number;
  lastStudy: string | null;
  dailyGoal: number;
  reviewLimit: number;
  dailyCount: number;
  dailyDate: string | null;
  progress: Record<string, SrsCard>;
  bookmarks: string[];
  showTimer: boolean;
  customDecks: CustomDeck[];
  autorunMode: string;
  autorunInterval: number;
  flashRandom: boolean;
}

export interface CustomDeck {
  id: string;
  name: string;
  wordIndices: string[];
}

export interface Deck {
  type: 'premade' | 'bookmark' | 'custom' | 'adaptive';
  subtype?: string;
  level?: number;
  part?: number;
  id?: string;
}

export type StudyMode = 'flash' | 'srs' | 'quiz' | 'adaptive';
export type View = 'profile-select' | 'dashboard' | 'study' | 'browse' | 'settings' | 'story-list' | 'reading' | 'deck-builder';
