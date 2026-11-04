import { Redirect } from 'expo-router';
import { Drawer, type DrawerContentComponentProps } from 'expo-router/drawer';
import type { ReactNode } from 'react';

import { DRAWER_WIDTH, DrawerMenu, SceneFrame, menuBackground } from '@/components';
import { useTeam } from '@/hooks';
import { teamTheme } from '@/lib/theme';
import { useTeamStore } from '@/state';

// Defined once, outside the component: a new function each render would make the navigator rebuild every screen.
const renderMenu = (props: DrawerContentComponentProps) => <DrawerMenu {...props} />;
const sceneLayout = ({ children }: { children: ReactNode }) => <SceneFrame>{children}</SceneFrame>;

export default function DrawerLayout() {
  const { hydrated, favoriteTeamId, currentTeamId } = useTeamStore();
  const team = useTeam(currentTeamId);
  const menu = menuBackground(teamTheme(team).primary);

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
      }}>
      <Drawer.Screen name="home" options={{ title: 'Team card' }} />
      <Drawer.Screen name="teams" options={{ title: 'All teams' }} />
      <Drawer.Screen name="roster" options={{ title: 'Roster' }} />
      <Drawer.Screen name="league-leaders" options={{ title: 'League Leaders' }} />
      <Drawer.Screen name="team-leaders" options={{ title: 'Team Leaders' }} />
      <Drawer.Screen name="standings" options={{ title: 'Standings' }} />
      <Drawer.Screen name="playoffs" options={{ title: 'Playoffs' }} />
      <Drawer.Screen name="cup" options={{ title: 'NBA Cup' }} />
      <Drawer.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Drawer.Screen name="compare" options={{ title: 'Compare' }} />
      <Drawer.Screen name="watchlist" options={{ title: 'Watchlist' }} />
    </Drawer>
  );
}
