import { useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';

import { setDetailDepth } from './nav';

const DETAIL_ROUTES = new Set(['game/[id]', 'team/[id]', 'player/[id]']);

type RouteLike = { name: string; state?: { routes?: RouteLike[] } };

/** The root stack's pages. The navigation state wraps them in a single `__root` route, so they are one level down. */
const stackRoutes = (routes: RouteLike[] | undefined): RouteLike[] =>
  routes?.length === 1 && routes[0].name === '__root' ? (routes[0].state?.routes ?? []) : (routes ?? []);

/** Reports how many game/team/player pages are stacked, for `openDetail`. Renders nothing. */
export function NavDepthTracker() {
  const state = useRootNavigationState();
  const depth = stackRoutes(state?.routes as RouteLike[] | undefined).filter((r) => DETAIL_ROUTES.has(r.name)).length;
  useEffect(() => {
    setDetailDepth(depth);
  }, [depth]);
  return null;
}
