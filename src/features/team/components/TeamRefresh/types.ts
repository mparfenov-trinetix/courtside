/** A repeating wave: `a` is its amplitude, `k` its shape, `c` how many times it repeats per loop, `p` its phase (0..1). */
export type Wave = { a: number; k: 'sine' | 'abs' | 'saw' | 'tri' | 'pulse' | 'spring' | 'plat'; c?: number; p?: number };

/**
 * How a team's logo moves: each axis is a wave; `flip` is full turns around its vertical axis per loop. `st` stretches it
 * tall (and narrows it, keeping its volume) when positive.
 */
export type LogoMotion = { x?: Wave; y?: Wave; r?: Wave; s?: Wave; st?: Wave; flip?: number };

/** One team's refresh animation: how long a loop takes, and what its logo does. */
export type TeamMotion = { period: number; logo: LogoMotion };
