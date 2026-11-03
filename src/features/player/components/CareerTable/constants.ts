export const COLS = ['GP', 'GS', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', 'PF', 'FG%', '3P%', 'FT%', 'FG', '3PT', 'FT'];

export const COL_W: Record<string, number> = {
  GP: 36, GS: 36, MIN: 42, PTS: 46, REB: 42, AST: 40, STL: 40, BLK: 40, TO: 38, PF: 34,
  'FG%': 48, '3P%': 48, 'FT%': 48, FG: 68, '3PT': 62, FT: 66, OR: 40, DR: 40,
};

export const FIRST_W = 124;
export const ROW_H = 52;
export const HEADER_H = 32;
export const CAREER_H = 46;

/** Columns where the best season gets highlighted. */
export const HIGHLIGHT = new Set(['PTS', 'REB', 'AST', 'STL', 'BLK']);
