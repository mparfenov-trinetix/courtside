import { useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';

import { setDetailDepth } from './nav';

const DETAIL_ROUTES = new Set(['game/[id]', 'team/[id]', 'player/[id]']);
/** Other pages pushed over a drawer screen: they do not count toward the stack limit, but closing one shows the screen under it again all the same. */
const COVER_ROUTES = new Set(['article/[id]', 'series', 'matchup-standings', 'matchup-playoffs', 'matchup-cup', 'matchup-compare']);

type RouteLike = { name: string; state?: { routes?: RouteLike[] } };

/** The root stack's pages. The navigation state wraps them in a single `__root` route, so they are one level down. */
const stackRoutes = (routes: RouteLike[] | undefined): RouteLike[] =>
  routes?.length === 1 && routes[0].name === '__root' ? (routes[0].state?.routes ?? []) : (routes ?? []);

/** Reports how many game/team/player pages are stacked (for `openDetail`) and how many pages of any kind cover the drawer (for `returningFromDetail`). Renders nothing. */
export function NavDepthTracker() {
  const state = useRootNavigationState();
  const routes = stackRoutes(state?.routes as RouteLike[] | undefined);
  const depth = routes.filter((r) => DETAIL_ROUTES.has(r.name)).length;
  const covering = depth + routes.filter((r) => COVER_ROUTES.has(r.name)).length;
  useEffect(() => {
    setDetailDepth(depth, covering);
  }, [depth, covering]);
  return null;
}
