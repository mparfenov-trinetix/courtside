import { Image } from 'expo-image';
import { Redirect, router, type Href } from 'expo-router';
import { Drawer, DrawerContentScrollView, type DrawerContentComponentProps } from 'expo-router/drawer';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarIcon, CardIcon, CompareIcon, GridIcon, PeopleIcon, PodiumIcon, StandingsIcon, StarIcon, TrophyIcon } from '@/components/icons';
import { useTeam } from '@/hooks/queries';
import { fonts, logoOn, palette, teamTheme, withAlpha } from '@/lib/theme';
import { useTeamStore } from '@/state/team-store';

export default function DrawerLayout() {
  const { hydrated, favoriteTeamId, currentTeamId } = useTeamStore();
  const team = useTeam(currentTeamId);
  const theme = teamTheme(team);

  if (hydrated && !favoriteTeamId) return <Redirect href="/onboarding" />;

  return (
    <Drawer
      drawerContent={(props) => <Menu {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        overlayColor: 'rgba(0,0,0,0.35)',
        drawerStyle: { backgroundColor: theme.surface, width: 300 },
        sceneStyle: { backgroundColor: theme.background },
        swipeEdgeWidth: 40,
      }}>
      <Drawer.Screen name="home" options={{ title: 'Team card' }} />
      <Drawer.Screen name="teams" options={{ title: 'All teams' }} />
      <Drawer.Screen name="roster" options={{ title: 'Roster' }} />
      <Drawer.Screen name="league-leaders" options={{ title: 'League Leaders' }} />
      <Drawer.Screen name="team-leaders" options={{ title: 'Team Leaders' }} />
      <Drawer.Screen name="standings" options={{ title: 'Standings' }} />
      <Drawer.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Drawer.Screen name="compare" options={{ title: 'Compare' }} />
      <Drawer.Screen name="watchlist" options={{ title: 'Watchlist' }} />
    </Drawer>
  );
}

type MenuItem = {
  route: string;
  href: Href;
  label: string;
  Icon: ComponentType<{ color: string; size?: number; filled?: boolean }>;
};

const ITEMS: MenuItem[] = [
  { route: 'home', href: '/home', label: 'Team card', Icon: CardIcon },
  { route: 'teams', href: '/teams', label: 'All teams', Icon: GridIcon },
  { route: 'roster', href: '/roster', label: 'Roster', Icon: PeopleIcon },
  { route: 'league-leaders', href: '/league-leaders', label: 'League Leaders', Icon: TrophyIcon },
  { route: 'team-leaders', href: '/team-leaders' as Href, label: 'Team Leaders', Icon: PodiumIcon },
  { route: 'standings', href: '/standings', label: 'Standings', Icon: StandingsIcon },
  { route: 'calendar', href: '/calendar' as Href, label: 'Calendar', Icon: CalendarIcon },
  { route: 'compare', href: '/compare' as Href, label: 'Compare', Icon: CompareIcon },
  { route: 'watchlist', href: '/watchlist' as Href, label: 'Watchlist', Icon: StarIcon },
];

function Menu(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { favoriteTeamId, currentTeamId, viewTeam } = useTeamStore();
  const team = useTeam(currentTeamId);
  const favorite = useTeam(favoriteTeamId);
  const theme = teamTheme(team);
  const activeRoute = props.state.routes[props.state.index]?.name;

  const go = (href: Href) => {
    props.navigation.closeDrawer();
    router.navigate(href);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.hero, { paddingTop: insets.top + 20, backgroundColor: theme.primary }]}>
        {team && (
          <Image source={logoOn(team, theme.onPrimary)} style={styles.heroLogo} contentFit="contain" />
        )}
        <Text style={[styles.heroLocation, { color: withAlpha(theme.onPrimary, 0.7) }]}>
          {team?.location ?? 'Courtside'}
        </Text>
        <Text style={[styles.heroName, { color: theme.onPrimary }]} numberOfLines={1}>
          {team?.name ?? ''}
        </Text>
      </View>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.list}>
        {ITEMS.map(({ route, href, label, Icon }) => {
          const active = route === activeRoute;
          const color = active ? palette.chalk : withAlpha(palette.chalk, 0.7);
          return (
            <Pressable
              key={route}
              onPress={() => go(href)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.item,
                { backgroundColor: active ? withAlpha(theme.accent, 0.18) : pressed ? withAlpha('#FFFFFF', 0.06) : 'transparent' },
              ]}>
              {active && <View style={[styles.activeBar, { backgroundColor: theme.accent }]} />}
              <Icon color={color} />
              <Text style={[styles.itemLabel, { color }]}>{label}</Text>
            </Pressable>
          );
        })}

        <View style={styles.divider} />

        {favorite && favorite.id !== currentTeamId && (
          <Pressable
            onPress={() => {
              viewTeam(favorite.id);
              go('/home');
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.item, pressed && { backgroundColor: withAlpha('#FFFFFF', 0.06) }]}>
            <Image source={favorite.logoDark || favorite.logo} style={styles.smallLogo} contentFit="contain" />
            <Text style={[styles.itemLabel, { color: withAlpha(palette.chalk, 0.7) }]}>
              Back to the {favorite.name}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            props.navigation.closeDrawer();
            router.push('/onboarding');
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.item, pressed && { backgroundColor: withAlpha('#FFFFFF', 0.06) }]}>
          <StarIcon color={withAlpha(palette.chalk, 0.7)} />
          <Text style={[styles.itemLabel, { color: withAlpha(palette.chalk, 0.7) }]}>Change favorite team</Text>
        </Pressable>
      </DrawerContentScrollView>

      <Text style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        Team data from ESPN’s public API
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  heroLogo: {
    width: 64,
    height: 64,
    marginBottom: 14,
  },
  heroLocation: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
  },
  heroName: {
    fontFamily: fonts.display,
    fontSize: 40,
    marginTop: -2,
  },
  list: {
    paddingTop: 14,
    paddingHorizontal: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 4,
    overflow: 'hidden',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: 2,
  },
  itemLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 17,
  },
  smallLogo: {
    width: 22,
    height: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.line,
    marginVertical: 12,
    marginHorizontal: 14,
  },
  footer: {
    paddingHorizontal: 26,
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.muted,
  },
});
