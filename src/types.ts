export type Category = 'Productivity' | 'Health' | 'Social' | 'Money' | 'Other';

export interface Mistake {
  id: string;
  text: string;
  category: Category;
  timestamp: number;
}

export interface DayEntry {
  date: string; // YYYY-MM-DD
  mistakes: Mistake[];
}

export interface AppState {
  entries: Record<string, DayEntry>;
  streak: number;
  lastLoggedDate: string | null;
}
