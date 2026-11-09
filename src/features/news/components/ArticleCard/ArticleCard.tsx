import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Pill } from '@/components';
import { timeAgo } from '@/lib/date';
import type { NewsArticle, NewsKind, Team } from '@/lib/espn';
import { fontSize, fonts, palette, radius, space, surfaces } from '@/lib/theme';

const KIND_LABEL: Record<NewsKind, string> = { recap: 'Recap', preview: 'Preview', story: 'Story', news: 'News', video: 'Video' };

/**
 * One article of the news list: its picture, a tag for the kind (recap, preview, story, news, video), the headline, ESPN's one-line summary,
 * how long ago it came out and the logos of the teams it is about. `lead` is the first article, with a wide picture on top.
 */
export function ArticleCard({ article, teamOf, lead = false, onPress }: { article: NewsArticle; teamOf: (id: string) => Team | undefined; lead?: boolean; onPress: () => void }) {
  const teams = article.teamIds.map(teamOf).filter((t): t is Team => !!t).slice(0, 2);
  const meta = (
    <View style={styles.meta}>
      <Pill>{KIND_LABEL[article.kind].toUpperCase()}</Pill>
      <Text style={styles.time}>{timeAgo(article.published)}</Text>
      <View style={{ flex: 1 }} />
      {teams.map((t) => (
        <Image key={t.id} source={t.logoDark || t.logo} style={styles.logo} contentFit="contain" />
      ))}
    </View>
  );
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${KIND_LABEL[article.kind]}: ${article.headline}`} style={({ pressed }) => pressed && { opacity: 0.75 }}>
      <Card padded={false} style={styles.card}>
        {lead ? (
          <>
            {article.image ? <Image source={article.image} style={styles.leadImage} contentFit="cover" transition={150} /> : null}
            <View style={styles.leadBody}>
              {meta}
              <Text style={styles.leadHeadline} numberOfLines={4}>{article.headline}</Text>
              {article.description ? <Text style={styles.description} numberOfLines={3}>{article.description}</Text> : null}
            </View>
          </>
        ) : (
          <View style={styles.row}>
            <View style={{ flex: 1, gap: space.sm }}>
              {meta}
              <Text style={styles.headline} numberOfLines={3}>{article.headline}</Text>
              {article.description ? <Text style={styles.description} numberOfLines={2}>{article.description}</Text> : null}
            </View>
            {article.image ? <Image source={article.image} style={styles.thumb} contentFit="cover" transition={150} /> : null}
          </View>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  row: { flexDirection: 'row', gap: space.md, padding: space.md },
  thumb: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: surfaces.raised },
  leadImage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: surfaces.raised },
  leadBody: { padding: space.md, gap: space.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  time: { fontFamily: fonts.body, fontSize: fontSize.label, color: palette.muted },
  logo: { width: 20, height: 20 },
  headline: { fontFamily: fonts.bodyBold, fontSize: fontSize.large, color: palette.chalk, lineHeight: 21 },
  leadHeadline: { fontFamily: fonts.displayBold, fontSize: fontSize.heading, lineHeight: 28, color: palette.chalk },
  description: { fontFamily: fonts.body, fontSize: fontSize.small, color: palette.muted, lineHeight: 18 },
});
