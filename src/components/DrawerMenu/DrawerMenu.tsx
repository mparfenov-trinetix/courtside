import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useIsFocused, useRoute, type Href } from 'expo-router';
import { DrawerContentScrollView, useDrawerProgress, type DrawerContentComponentProps } from 'expo-router/drawer';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTeam } from '@/hooks';
import { fonts, logoOn, mix, palette, teamTheme, withAlpha, surfaces } from '@/lib/theme';
import { pushOnce, returningFromDetail } from '@/navigation';
import { useTeamStore } from '@/state';
import { Glass } from '../Glass';
import { BracketIcon, CalendarIcon, CardIcon, CompareIcon, CupIcon, DraftIcon, GridIcon, PeopleIcon, PodiumIcon, SearchIcon, StandingsIcon, StarIcon, TrophyIcon, WireIcon } from '../Icons';
import { NbaLogo } from '../NbaLogo';
import { DRAWER_WIDTH, SCENE_RADIUS, type MenuSection } from './constants';

// Only when Metro was started with `npm run storybook`.
const STORYBOOK = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true';

/** The menu: what is yours, the league, and the tournaments and events (playoffs, the Cup, All-Star Weekend, the Draft). */
export const SECTIONS: MenuSection[] = [
  {
    // What is yours, no heading of its own: your team, its calendar, what you starred (players and games alike).
    title: '',
    items: [
      { route: 'home', href: '/home', label: 'Team card', Icon: CardIcon },
      { route: 'calendar', href: '/calendar' as Href, label: 'Calendar', Icon: CalendarIcon },
      { route: 'watchlist', href: '/watchlist' as Href, label: 'Watchlist', Icon: StarIcon },
    ],
  },
  {
    // The whole league: tables, leaderboards (players, and teams ranked by a team stat), every roster and a way to put two players or teams side by side.
    title: 'League',
    items: [
      { route: 'standings', href: '/standings', label: 'Standings', Icon: StandingsIcon },
      { route: 'league-leaders', href: '/league-leaders', label: 'Player leaders', Icon: TrophyIcon },
      { route: 'team-leaders', href: '/team-leaders' as Href, label: 'Team leaders', Icon: PodiumIcon },
      { route: 'roster', href: '/roster', label: 'Rosters', Icon: PeopleIcon },
      { route: 'teams', href: '/teams', label: 'Teams', Icon: GridIcon },
      { route: 'compare', href: '/compare' as Href, label: 'Compare', Icon: CompareIcon },
      { route: 'wire', href: '/wire' as Href, label: 'League wire', Icon: WireIcon },
    ],
  },
  {
    title: 'Tournaments',
    items: [
      { route: 'playoffs', href: '/playoffs' as Href, label: 'Playoffs', Icon: BracketIcon },
      { route: 'cup', href: '/cup' as Href, label: 'NBA Cup', Icon: CupIcon },
      { route: 'all-star', href: '/all-star' as Href, label: 'All-Star Weekend', Icon: StarIcon },
      { route: 'draft', href: '/draft' as Href, label: 'NBA Draft', Icon: DraftIcon },
    ],
  },
];

/** Where each row falls in the opening sequence (hero, search, then every section title and its items), worked out once. */
const ORDER = (() => {
  let n = 2;
  const titles: Record<string, number> = {};
  const items: Record<string, number> = {};
  for (const section of SECTIONS) {
    titles[section.title] = n++;
    for (const item of section.items) items[item.route] = n++;
  }
  return { titles, items, footer: n };
})();

/** Fades and slides its content in as the menu opens, each row a little after the one above it. */
function Reveal({ progress, index, children }: { progress: SharedValue<number>; index: number; children: ReactNode }) {
  const style = useAnimatedStyle(() => {
    const from = Math.min(0.55, 0.1 + index * 0.035);
    const p = interpolate(progress.get(), [from, from + 0.4], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ translateX: (1 - p) * -18 }] };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** The deep, team-tinted color behind the menu: darker than any screen, so the screen reads as a layer above it. */
export const menuBackground = (primary: string) => mix(primary, '#000000', 0.62);

export function DrawerMenu(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const progress = useDrawerProgress() as SharedValue<number>;
  const { favoriteTeamId, currentTeamId, viewTeam } = useTeamStore();
  const team = useTeam(currentTeamId);
  const favorite = useTeam(favoriteTeamId);
  const theme = teamTheme(team);
  const base = menuBackground(theme.primary);
  const activeRoute = props.state.routes[props.state.index]?.name;

  const go = (href: Href) => {
    props.navigation.closeDrawer();
    router.navigate(href);
  };

  const dim = withAlpha(palette.chalk, 0.72);
  const press = ({ pressed }: { pressed: boolean }) => [styles.item, pressed && { backgroundColor: surfaces.raised }];

  return (
    <View style={{ flex: 1, width: DRAWER_WIDTH, backgroundColor: base }}>
      <LinearGradient colors={[withAlpha(theme.primary, TOP_WASH + 0.02), withAlpha(theme.primary, 0)]} style={[StyleSheet.absoluteFill, { height: 360 }]} />

      <Reveal progress={progress} index={0}>
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <View style={styles.heroTop}>
            {team && <Image source={logoOn(team, theme.onPrimary)} style={styles.heroLogo} contentFit="contain" />}
            <View style={styles.pills}>
              {favorite && favorite.id !== currentTeamId && (
                <Pressable
                  onPress={() => {
                    viewTeam(favorite.id);
                    go('/home');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Back to the ${favorite.name}`}
                  style={({ pressed }) => pressed && { opacity: 0.7 }}>
                  <Glass interactive style={styles.pill} fallbackStyle={styles.pillPlain}>
                    <Image source={favorite.logoDark || favorite.logo} style={styles.pillLogo} contentFit="contain" />
                    <Text style={styles.pillText}>Mine</Text>
                  </Glass>
                </Pressable>
              )}
              <Pressable
                onPress={() => {
                  props.navigation.closeDrawer();
                  router.push('/onboarding');
                }}
                accessibilityRole="button"
                accessibilityLabel="Change favorite team"
                style={({ pressed }) => pressed && { opacity: 0.7 }}>
                <Glass interactive style={styles.pill} fallbackStyle={styles.pillPlain}>
                  <StarIcon color={dim} size={14} />
                  <Text style={styles.pillText}>Change</Text>
                </Glass>
              </Pressable>
            </View>
          </View>
          <Text style={[styles.heroLocation, { color: withAlpha(theme.onPrimary, 0.75) }]}>{team?.location ?? 'Courtside'}</Text>
          <Text style={[styles.heroName, { color: theme.onPrimary }]} numberOfLines={1}>
            {team?.name ?? ''}
          </Text>
        </View>
      </Reveal>

      <Reveal progress={progress} index={1}>
        <Pressable
          onPress={() => {
            props.navigation.closeDrawer();
            pushOnce('/search');
          }}
          accessibilityRole="search"
          accessibilityLabel="Search teams and players"
          style={({ pressed }) => [styles.searchPress, pressed && { opacity: 0.75 }]}>
          <Glass style={styles.search} fallbackStyle={styles.searchPlain}>
            <SearchIcon color={dim} size={18} />
            <Text style={styles.searchText}>Search teams and players</Text>
          </Glass>
        </Pressable>
      </Reveal>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section) => (
          <View key={section.title || 'main'} style={styles.section}>
            {section.title ? (
              <Reveal progress={progress} index={ORDER.titles[section.title]}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </Reveal>
            ) : null}
            {section.items.map(({ route, href, label, Icon }) => {
              const active = route === activeRoute;
              const color = active ? palette.chalk : dim;
              return (
                <Reveal key={route} progress={progress} index={ORDER.items[route]}>
                  <Pressable
                    onPress={() => go(href)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={(s) => [press(s), active && { backgroundColor: withAlpha(theme.accent, 0.2) }]}>
                    {active && <View style={[styles.activeBar, { backgroundColor: theme.accent }]} />}
                    <Icon color={active ? theme.accent : color} size={22} />
                    <Text style={[styles.itemLabel, { color }]}>{label}</Text>
                  </Pressable>
                </Reveal>
              );
            })}
          </View>
        ))}

        {STORYBOOK && (
          <Pressable
            onPress={() => {
              props.navigation.closeDrawer();
              router.push('/storybook' as Href);
            }}
            accessibilityRole="button"
            style={press}>
            <GridIcon color={dim} size={20} />
            <Text style={[styles.itemLabelSmall, { color: dim }]}>Storybook</Text>
          </Pressable>
        )}
      </DrawerContentScrollView>

      <View style={[styles.footerRow, { paddingBottom: insets.bottom + 16 }]}>
        <NbaLogo size={28} />
        <Text style={styles.footer}>Team data from ESPN’s public API</Text>
      </View>
    </View>
  );
}

/** How much of the team color the menu's top wash shows at the very top edge. */
const TOP_WASH = 0.53;

/** A rounded corner drawn in the menu's color over the screen's own corner, so the screen needs no clipping to look round. */
function Corner({ color, flip }: { color: string; flip?: boolean }) {
  const r = SCENE_RADIUS;
  return (
    <Svg width={r} height={r} style={flip ? { transform: [{ scaleY: -1 }] } : undefined}>
      <Path d={`M0,0 H${r} A${r},${r} 0 0 0 0,${r} Z`} fill={color} />
      <Path d={`M${r},0 A${r},${r} 0 0 0 0,${r}`} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={1.5} />
    </Svg>
  );
}

/**
 * Wraps every screen. While the menu is open the screen reads as a layer of its own: round corners at its left edge, a
 * soft shadow falling onto the menu and a thin light edge. It is all drawn on top of the screen (nothing clips or
 * re-renders the screen itself), so opening a screen from the menu stays cheap.
 */
/** The first screen shown after launch does not animate in: the intro's own fade hands over to it. Every later focus does. */
let launchScene = true;
/** The drawer screen that was last in focus: a page opened over it and closed again brings focus back to the same one. */
let lastScene = '';

/** How long a screen takes to settle once the menu sends you to it. */
// Longer and with a long, soft tail (an ease-out quint): the first frames carry the motion, the end just settles.
const SCENE_IN_MS = 520;
const SCENE_EASE = Easing.bezier(0.22, 1, 0.36, 1);

export function SceneFrame({ children }: { children: ReactNode }) {
  const progress = useDrawerProgress() as SharedValue<number>;
  const currentTeamId = useTeamStore((s) => s.currentTeamId);
  const team = useTeam(currentTeamId);
  const primary = teamTheme(team).primary;
  const menu = menuBackground(primary);
  // The menu's team-colored wash is strongest at the very top (see DrawerMenu), so the top corner matches it, not the base.
  const menuTop = mix(menu, primary, TOP_WASH);
  const edge = useAnimatedStyle(() => ({ opacity: progress.get() }));

  // A screen reached from the menu settles in: its content eases from a little to the right (where the menu pushed it), slightly
  // smaller and not fully opaque, to rest, as the menu closes. Opacity does not start at zero: the menu's color behind the
  // scene would show through as a blank background.
  const focused = useIsFocused();
  const routeName = useRoute().name;
  const enter = useSharedValue(1);
  useEffect(() => {
    if (!focused) return;
    if (launchScene) {
      launchScene = false;
      return;
    }
    // Every deliberate trip to a drawer screen slides it in (from the menu, from any button). Returning to the screen that was showing
    // because a game, player or team page on top of it was closed does not: it was on screen all along, and sliding it in looked like
    // the menu dragging open. (A button on a page like that, say Compare on a team page, goes to a different screen: that one slides.)
    const returning = returningFromDetail() && lastScene === routeName;
    lastScene = routeName;
    if (returning) return;
    enter.set(0);
    // Not in the same frame the screen is built in: the first render of a heavy screen (the Calendar's pager and its queries) takes
    // the frames the first part of the motion needs, and the slide would start with a hitch. Two frames later it has drawn.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => enter.set(withTiming(1, { duration: SCENE_IN_MS, easing: SCENE_EASE })));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [focused, enter, routeName]);
  // The screen only slides (cheap: one layer moved). The fade is a veil in the menu's color laid over it and thinning out: fading the
  // screen itself made iOS draw all its cards into a temporary buffer on every frame. The veil finishes first, so the screen is
  // solid before it stops moving. No scale: a scaled layer is resampled and goes soft mid-move.
  const content = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - enter.get()) * 22 }] }));
  const veil = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - Math.min(1, enter.get() * 1.8)) }));

  // The corners must be solid as soon as any of the menu shows (they sit right next to it), not fade in with the slide.
  const corner = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.get() * 8) }));
  return (
    <View style={styles.frame}>
      <Animated.View style={[styles.frame, content]}>
        {children}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: menu }, veil]} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.shadow, edge]}>
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.line, edge]} />
      <Animated.View pointerEvents="none" style={[styles.cornerTop, corner]}>
        <Corner color={menuTop} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.cornerBottom, corner]}>
        <Corner color={menu} flip />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  shadow: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 26 },
  line: { position: 'absolute', top: SCENE_RADIUS, bottom: SCENE_RADIUS, left: 0, width: 1.5, backgroundColor: 'rgba(255,255,255,0.16)' },
  cornerTop: { position: 'absolute', top: 0, left: 0 },
  cornerBottom: { position: 'absolute', bottom: 0, left: 0 },
  searchPress: { marginHorizontal: 20, marginTop: 6, marginBottom: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 42, paddingHorizontal: 14, borderRadius: 14 },
  searchPlain: { backgroundColor: withAlpha('#FFFFFF', 0.1) },
  searchText: { fontFamily: fonts.body, fontSize: 14, color: withAlpha(palette.chalk, 0.6) },
  hero: { paddingHorizontal: 24, paddingBottom: 10 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  heroLogo: { width: 48, height: 48 },
  pills: { flexDirection: 'row', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 11, borderRadius: 15 },
  pillPlain: { backgroundColor: withAlpha('#FFFFFF', 0.12) },
  pillLogo: { width: 16, height: 16 },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.chalk },
  heroLocation: { fontFamily: fonts.bodySemi, fontSize: 15 },
  heroName: { fontFamily: fonts.display, fontSize: 34, marginTop: -2 },
  list: { paddingTop: 6, paddingHorizontal: 14 },
  section: { marginTop: 8 },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: withAlpha(palette.chalk, 0.42),
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 40, paddingHorizontal: 12, borderRadius: 12, marginBottom: 1, overflow: 'hidden' },
  activeBar: { position: 'absolute', left: 0, top: 11, bottom: 11, width: 3, borderRadius: 2 },
  itemLabel: { fontFamily: fonts.bodySemi, fontSize: 16 },
  itemLabelSmall: { fontFamily: fonts.bodySemi, fontSize: 15 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 26, paddingTop: 10 },
  footer: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: withAlpha(palette.chalk, 0.45) },
});
