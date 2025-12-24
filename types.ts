
export enum CategoryColor {
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  PURPLE = 'PURPLE',
  NONE = 'NONE'
}

export enum TagColor {
  INDIGO = 'INDIGO',
  CYAN = 'CYAN',
  ORANGE = 'ORANGE',
  PINK = 'PINK',
  NONE = 'NONE'
}

export interface Category {
  id: string;
  label: string;
  words: string[];
  color: CategoryColor;
  difficulty: number;
}

export interface GameBoard {
  date?: string;
  categories: Category[];
  allWords: string[];
}

export interface TileState {
  word: string;
  marks: TagColor[];
  isSelected: boolean;
  isSolved: boolean;
  solvedColor?: CategoryColor;
}

export type GameStatus = 'PLAYING' | 'WON' | 'LOST';

export interface GuessResult {
  colors: CategoryColor[];
}
