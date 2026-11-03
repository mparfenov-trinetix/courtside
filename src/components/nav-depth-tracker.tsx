import { useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';

import { setDetailDepth } from '@/lib/nav';

const DETAIL_ROUTES = new Set(['game/[id]', 'team/[id]', 'player/[id]']);

/** Reports how many game/team/player pages are stacked, for `openDetail`. Renders nothing. */
export function NavDepthTracker() {
  const state = useRootNavigationState();
  const depth = state?.routes?.filter((r) => DETAIL_ROUTES.has(r.name)).length ?? 0;
  useEffect(() => {
    setDetailDepth(depth);
  }, [depth]);
  return null;
}
