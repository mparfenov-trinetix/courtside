import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ChevronIcon, Pill } from '@/components';
import { fonts, fontSize, palette, space, surfaces, withAlpha } from '@/lib/theme';

/** One event as a card: its icon, its name and what is in it, an "On now" tag when it is its season, and a tap to open it. */
export function EventCard({ icon, title, text, now, onPress }: { icon: ReactNode; title: string; text: string; now?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}${now ? ', on now' : ''}`} style={({ pressed }) => pressed && { opacity: 0.8 }}>
      <Card style={[styles.card, now && { borderColor: withAlpha(palette.gold, 0.5) }]}>
        <View style={styles.icon}>{icon}</View>
        <View style={styles.text}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {now ? <Pill tone="gold">On now</Pill> : null}
          </View>
          <Text style={styles.sub} numberOfLines={2}>{text}</Text>
        </View>
        <ChevronIcon color={palette.muted} size={18} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1.5, borderColor: 'transparent' },
  icon: { width: 52, height: 52, borderRadius: 26, backgroundColor: surfaces.raised, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: space.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { fontFamily: fonts.display, fontSize: fontSize.heading, color: palette.chalk, flexShrink: 1 },
  sub: { fontFamily: fonts.body, fontSize: fontSize.small, color: palette.muted },
});
