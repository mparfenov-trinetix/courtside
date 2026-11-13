import { Redirect, type Href, useSegments } from 'expo-router';
import { Drawer, type DrawerContentComponentProps } from 'expo-router/drawer';
import { useState, type ReactNode } from 'react';

import { DRAWER_WIDTH, DrawerMenu, SceneFrame, menuBackground } from '@/components';
import { useTeam } from '@/hooks';
import { PRELOAD_PACE, currentPreloadPace, usePreloadScreens } from '@/navigation';
import { teamTheme } from '@/lib/theme';
import { useTeamStore } from '@/state';

// Defined once, outside the component: a new function each render would make the navigator rebuild every screen.
const renderMenu = (props: DrawerContentComponentProps) => <DrawerMenu {...props} />;
/** The screens whose first visit stalls the most (the heaviest first builds), mounted in the background after launch, in this order. The intro waits for them. */
const PRELOADED: Href[] = ['/calendar', '/team-leaders', '/teams'];
/** A light one (a list of ten rows): built later, once the intro has left, so the intro is not held for it. */
const PRELOADED_LATER: Href[] = ['/league-leaders'];
const sceneLayout = ({ children }: { children: ReactNode }) => <SceneFrame>{children}</SceneFrame>;

export default function DrawerLayout() {
  const { hydrated, favoriteTeamId, currentTeamId } = useTeamStore();
  const team = useTeam(currentTeamId);
  const menu = menuBackground(teamTheme(team).primary);
  // A game, player or team page opened on top of a drawer screen: the drawer underneath is still mounted, and its edge swipe would
  // catch the same finger as the back swipe (the screen below dragged open like the menu for a moment). Only a drawer screen on
  // top may open the menu.
  const onTop = useSegments()[0] === '(drawer)';

  // Mounted behind the intro the intro asks for the screens one at a time; mounted for any other reason (a link opened a game and the drawer
  // is underneath) they are paced gently. Decided once, when the layout mounts.
  const [pace] = useState(currentPreloadPace);
  usePreloadScreens(PRELOADED, hydrated && !!favoriteTeamId, pace);
  usePreloadScreens(PRELOADED_LATER, hydrated && !!favoriteTeamId, PRELOAD_PACE.later, false);

  if (hydrated && !favoriteTeamId) return <Redirect href="/onboarding" />;

  return (
    <Drawer
      drawerContent={renderMenu}
      screenLayout={sceneLayout}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        // No dimming: the overlay also darkened the screen's corner pieces, so they stopped matching the menu next to them.
        overlayColor: 'transparent',
        drawerStyle: { backgroundColor: menu, width: DRAWER_WIDTH },
        // Behind the screen's round corners: the menu's own color, so the corners read as the edge of a layer.
        sceneStyle: { backgroundColor: menu },
        swipeEdgeWidth: 40,
        swipeEnabled: onTop,
      }}>
      <Drawer.Screen name="home" options={{ title: 'Team card' }} />
      <Drawer.Screen name="teams" options={{ title: 'Teams' }} />
      <Drawer.Screen name="standings" options={{ title: 'Standings' }} />
      <Drawer.Screen name="playoffs" options={{ title: 'Playoffs' }} />
      <Drawer.Screen name="cup" options={{ title: 'NBA Cup' }} />
      <Drawer.Screen name="all-star" options={{ title: 'All-Star Weekend' }} />
      <Drawer.Screen name="draft" options={{ title: 'NBA Draft' }} />
      <Drawer.Screen name="awards" options={{ title: 'Awards' }} />
      <Drawer.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Drawer.Screen name="around" options={{ title: 'Around the league' }} />
      <Drawer.Screen name="events" options={{ title: 'Events' }} />
      <Drawer.Screen name="compare" options={{ title: 'Compare' }} />
      <Drawer.Screen name="watchlist" options={{ title: 'Watchlist' }} />
      <Drawer.Screen name="pickem" options={{ title: "Pick'em" }} />
      <Drawer.Screen name="league-leaders" options={{ title: 'Player leaders' }} />
      <Drawer.Screen name="team-leaders" options={{ title: 'Team leaders' }} />
      {/* News and the wire stopped being rows of the menu (they are panes of Around the league) but stay declared: a route that is not declared here does not open from a link. */}
      <Drawer.Screen name="news" options={{ title: 'News' }} />
      <Drawer.Screen name="wire" options={{ title: 'Injuries and moves' }} />
    </Drawer>
  );
}
