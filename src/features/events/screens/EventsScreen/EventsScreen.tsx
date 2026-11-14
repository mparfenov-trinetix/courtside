import { router, type Href } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CupIcon, DraftIcon, MedalIcon, ScreenHeader, StarIcon } from '@/components';
import { eventsOnNow, orderEvents, type EventKey } from '@/lib/league';
import { palette, space } from '@/lib/theme';
import { EventCard } from '../../components';
import { READABLE } from '@/lib/layout';

const EVENTS: Record<EventKey, { title: string; text: string; href: Href; icon: (color: string) => React.ReactNode }> = {
  cup: { title: 'NBA Cup', text: 'The groups, the standings and the knockout', href: '/cup' as Href, icon: (c) => <CupIcon color={c} size={26} /> },
  'all-star': { title: 'All-Star Weekend', text: 'The game, its rosters and MVP, back to 2000', href: '/all-star' as Href, icon: (c) => <StarIcon color={c} size={26} /> },
  draft: { title: 'NBA Draft', text: 'Every pick since 2003, with the scouting reports', href: '/draft' as Href, icon: (c) => <DraftIcon color={c} size={26} /> },
  awards: { title: 'Awards', text: 'MVP, All-NBA, Finals MVP and the rest, back to 1999-00', href: '/awards' as Href, icon: (c) => <MedalIcon color={c} size={26} /> },
};

/**
 * The league's yearly events in one place (the Cup, the All-Star Weekend, the Draft and the Awards: four rows of the menu that are visited a
 * few times a year): the ones that are on now first, with a tag, then the rest. Each opens its own screen.
 */
export function EventsScreen() {
  const insets = useSafeAreaInsets();
  const { order, on } = useMemo(() => ({ order: orderEvents(), on: eventsOnNow() }), []);
  return (
    <View style={styles.root}>
      <ScreenHeader title="Events" color={palette.chalk} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[READABLE, { paddingHorizontal: space.lg, paddingBottom: insets.bottom + 24, gap: space.md }]}>
        {order.map((key) => (
          <EventCard
            key={key}
            icon={EVENTS[key].icon(on.includes(key) ? palette.gold : palette.chalk)}
            title={EVENTS[key].title}
            text={EVENTS[key].text}
            now={on.includes(key)}
            onPress={() => router.navigate(EVENTS[key].href)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.arena },
});
