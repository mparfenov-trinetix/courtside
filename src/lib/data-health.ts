import { useSyncExternalStore } from 'react';

/** Sources whose ESPN responses parsed but look wrong, with a short reason each. */
const issues = new Map<string, string>();
let snapshot: ReadonlyMap<string, string> = new Map();
const listeners = new Set<() => void>();

export function reportIssue(source: string, detail: string | null) {
  const had = issues.get(source);
  if (detail === null) issues.delete(source);
  else issues.set(source, detail);
  if (had === (detail ?? undefined)) return;
  snapshot = new Map(issues);
  listeners.forEach((l) => l());
}

export function useDataIssues() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
  );
}
