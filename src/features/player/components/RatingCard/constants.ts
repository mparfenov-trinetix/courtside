/** The badge's tint by overall, the usual game-card ladder, brightest at the top. */
export const tintFor = (overall: number) => (overall >= 95 ? '#F5C242' : overall >= 90 ? '#A78BFA' : overall >= 85 ? '#4FA3F7' : '#34D399');
