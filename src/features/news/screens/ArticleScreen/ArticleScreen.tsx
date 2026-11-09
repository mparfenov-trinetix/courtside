import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ErrorState, ListSkeleton, ScreenHeader } from '@/components';
import { useArticle } from '@/hooks';
import { timeAgo } from '@/lib/date';
import { fontSize, fonts, palette, radius, space, surfaces } from '@/lib/theme';
import { goBack } from '@/navigation';

/**
 * One article's text, as plain paragraphs under its picture and headline, with a way on to its page on espn.com. ESPN's text comes with
 * links and pictures in the middle of it; they are left out, the words stay.
 */
export function ArticleScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch } = useArticle(String(id));

  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScreenHeader title="News" onBack={goBack} />
      {isPending ? (
        <ListSkeleton count={5} avatar="none" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          {data.image ? <Image source={data.image} style={styles.image} contentFit="cover" transition={150} /> : null}
          <View style={styles.body}>
            <Text style={styles.headline}>{data.headline}</Text>
            <Text style={styles.byline}>{[data.byline, data.published ? timeAgo(data.published) : undefined].filter(Boolean).join(' · ')}</Text>
            {data.blocks.map((block, i) => (
              <Text key={i} style={block.kind === 'heading' ? styles.heading : styles.paragraph}>
                {block.text}
              </Text>
            ))}
            {data.webUrl ? (
              <Button label="Read on ESPN" tone="secondary" onPress={() => WebBrowser.openBrowserAsync(data.webUrl!).catch(() => {})} style={styles.more} />
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', aspectRatio: 16 / 9, backgroundColor: surfaces.raised },
  body: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.md },
  headline: { fontFamily: fonts.displayBold, fontSize: fontSize.display - 2, lineHeight: 34, color: palette.chalk },
  byline: { fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.gold, letterSpacing: 0.3, marginBottom: space.xs },
  heading: { fontFamily: fonts.bodyBold, fontSize: fontSize.title - 2, color: palette.chalk, marginTop: space.sm },
  paragraph: { fontFamily: fonts.body, fontSize: fontSize.large, lineHeight: 25, color: palette.chalk },
  more: { alignSelf: 'flex-start', marginTop: space.md, borderRadius: radius.xl },
});
