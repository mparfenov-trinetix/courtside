import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleCard } from '../../components';
import { Chip, EmptyState, ErrorState, ListSkeleton, ScreenHeader } from '@/components';
import { useNews, useRefresh, useTeams } from '@/hooks';
import type { NewsArticle } from '@/lib/espn';
import { palette, space } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { useScreenTeamStore } from '@/state';

type Filter = 'all' | 'mine' | 'recap' | 'preview' | 'story' | 'video';

/** Which kinds each filter keeps ("Stories" is the long reads and the short news items together). */
const KEEPS: Record<Exclude<Filter, 'all' | 'mine'>, NewsArticle['kind'][]> = {
  recap: ['recap'],
  preview: ['preview'],
  story: ['story', 'news'],
  video: ['video'],
};

/**
 * The league's news from ESPN: game recaps and previews, stories, short news items and videos, newest first, with a strip to narrow it to
 * your team or to one kind. A recap, preview, story or news item opens in the app (its text), a video on espn.com.
 */
export function NewsScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const favoriteTeamId = useScreenTeamStore((s) => s.favoriteTeamId);
  const { data: teams } = useTeams();
  const league = useNews(undefined, filter !== 'mine');
  const mine = useNews(favoriteTeamId ?? undefined, filter === 'mine' && !!favoriteTeamId);
  const feed = filter === 'mine' ? mine : league;
  const refreshControl = useRefresh([['news']]);
  const teamOf = (id: string) => teams?.find((t) => t.id === id);
  const favorite = favoriteTeamId ? teamOf(favoriteTeamId) : undefined;

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    ...(favoriteTeamId ? [{ key: 'mine' as const, label: favorite?.abbreviation ?? 'My team' }] : []),
    { key: 'recap', label: 'Recaps' },
    { key: 'preview', label: 'Previews' },
    { key: 'story', label: 'Stories' },
    { key: 'video', label: 'Videos' },
  ];

  const articles = useMemo(() => {
    const all = feed.data ?? [];
    return filter === 'all' || filter === 'mine' ? all : all.filter((a) => KEEPS[filter].includes(a.kind));
  }, [feed.data, filter]);

  const open = (article: NewsArticle) => {
    if (article.kind === 'video') {
      if (article.webUrl) WebBrowser.openBrowserAsync(article.webUrl).catch(() => {});
    } else {
      openDetail({ pathname: '/article/[id]', params: { id: article.id } });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      {embedded ? null : <ScreenHeader title="News" />}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm, paddingVertical: space.sm }}>
        {filters.map((f) => (
          <Chip key={f.key} size="md" label={f.label} active={f.key === filter} onPress={() => setFilter(f.key)} accessibilityLabel={f.label} />
        ))}
      </ScrollView>
      {feed.isPending ? (
        <ListSkeleton count={6} avatar="square" />
      ) : feed.error ? (
        <ErrorState message={feed.error.message} onRetry={feed.refetch} />
      ) : articles.length === 0 ? (
        <EmptyState title="Nothing here" text="ESPN has no stories of this kind right now." placement="center" />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(a) => a.id}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + 24, gap: space.sm }}
          renderItem={({ item, index }) => <ArticleCard article={item} teamOf={teamOf} lead={index === 0} onPress={() => open(item)} />}
        />
      )}
    </View>
  );
}
