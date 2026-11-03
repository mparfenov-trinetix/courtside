/**
 * Names the element that flies between two screens. The screen you leave from adds an `origin` param to the link
 * ("standings", "strip"...) and uses it in the tag; the screen you arrive on reads the same param. Without it the same
 * team would carry one tag in every mounted list and the transition could pick the wrong one.
 */
export const sharedTag = (origin: string | undefined, ...parts: (string | number)[]) =>
  origin ? [...parts, origin].join(':') : undefined;
