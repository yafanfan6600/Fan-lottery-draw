export type View = 'setup' | 'wishing' | 'winners';

export interface Winner {
  id: string;
  name: string;
  date: string;
}

export interface HistoryRecord {
  id: string;
  date: string;
  winners: string[];
}
