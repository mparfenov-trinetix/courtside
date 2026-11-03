// Court geometry in feet. Origin is the baseline's left corner; the basket sits at (25, 5.25).
export const COURT_W = 50;
export const COURT_H = 47;
export const HOOP = { x: 25, y: 5.25 };
export const THREE_R = 23.75;
export const CORNER_X = 3;
export const CORNER_Y = HOOP.y + Math.sqrt(THREE_R ** 2 - (25 - CORNER_X) ** 2);
export const HOT = '#F97316';
export const COLD = '#60A5FA';
export const CELL = 3;
