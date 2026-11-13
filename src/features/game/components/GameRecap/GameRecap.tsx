import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionLabel } from '@/components';
import type { GameRecap as Recap } from '@/lib/espn';
import { fonts, fontSize, palette, radius, space, surfaces } from '@/lib/theme';
import { openDetail } from '@/navigation';

/**
 * The game's recap, when ESPN has written one (its AP article, in the game's own summary): the picture, the headline and the first
 * sentence, and a tap opens the whole article in the app (the news page reads it by id). Only on a finished game, whole game only.
 */
export function GameRecap({ recap }: { recap: Recap }) {
  return (
    <View>
      <SectionLabel style={styles.label}>Recap</SectionLabel>
      <Pressable
        onPress={() => openDetail({ pathname: '/article/[id]', params: { id: recap.id } })}
        accessibilityRole="button"
        accessibilityLabel={`Read the recap: ${recap.headline}`}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
        {recap.image ? <Image source={recap.image} style={styles.image} contentFit="cover" transition={150} /> : null}
        <View style={styles.body}>
          <Text style={styles.headline} numberOfLines={3}>{recap.headline}</Text>
          {recap.description ? <Text style={styles.summary} numberOfLines={3}>{recap.description}</Text> : null}
          <Text style={styles.read}>Read the recap ›</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: space.sm },
  card: { borderRadius: radius.lg, backgroundColor: surfaces.card, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 2.4, backgroundColor: surfaces.raised },
  body: { padding: space.lg, gap: space.sm },
  headline: { fontFamily: fonts.bodyBold, fontSize: fontSize.large, lineHeight: 22, color: palette.chalk },
  summary: { fontFamily: fonts.body, fontSize: fontSize.body, lineHeight: 20, color: palette.muted },
  read: { fontFamily: fonts.bodySemi, fontSize: fontSize.body, color: palette.gold, marginTop: space.xs },
});
