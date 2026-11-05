import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchIcon } from '@/components';
import { usePlayerSearch, useTeams } from '@/hooks';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { goBack, openDetail } from '@/navigation';
import { RECENT_KEY, MAX_RECENT } from './constants';

type Hit =
  | { kind: 'team'; id: string; title: string; subtitle: string; image?: string }
  | { kind: 'player'; id: string; title: string; subtitle: string; image?: string; teamId?: string };

function open(hit: Hit) {
  if (hit.kind === 'team') openDetail(`/team/${hit.id}` as Href);
  else openDetail({ pathname: '/player/[id]', params: { id: hit.id, teamId: hit.teamId ?? '' } });
}

/** One box for teams and players, with the last few things you opened when it's empty. */
export function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<Hit[]>([]);
  const { data: teams } = useTeams();
  const { data: players, isFetching } = usePlayerSearch(query);

  useEffect(() => {
    const id = setTimeout(() => setQuery(text.trim()), 250);
    return () => clearTimeout(id);
  }, [text]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => raw && setRecent(JSON.parse(raw) as Hit[]))
      .catch(() => {});
  }, []);

  const remember = (hit: Hit) => {
    const next = [hit, ...recent.filter((r) => !(r.kind === hit.kind && r.id === hit.id))].slice(0, MAX_RECENT);
    setRecent(next);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
  };

  const clearRecent = () => {
    setRecent([]);
    AsyncStorage.removeItem(RECENT_KEY).catch(() => {});
  };

  const q = query.toLowerCase();
  const teamHits: Hit[] =
    q.length >= 2
      ? (teams ?? [])
          .filter((t) => [t.displayName, t.abbreviation, t.location, t.name].some((s) => s?.toLowerCase().includes(q)))
          .slice(0, 5)
          .map((t) => ({ kind: 'team', id: t.id, title: t.displayName, subtitle: t.abbreviation, image: t.logoDark || t.logo }))
      : [];
  const playerHits: Hit[] =
    q.length >= 2
      ? (players ?? []).map((p) => ({
          kind: 'player',
          id: p.id,
          title: p.name,
          subtitle: p.teamAbbr ?? '',
          image: p.headshot,
          teamId: p.teamId,
        }))
      : [];

  const searching = q.length >= 2;
  const sections = searching
    ? [
        { title: 'Teams', data: teamHits },
        { title: 'Players', data: playerHits },
      ].filter((s) => s.data.length > 0)
    : recent.length > 0
      ? [{ title: 'Recent', data: recent }]
      : [];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.bar}>
        <View style={styles.field}>
          <SearchIcon color={palette.muted} size={18} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Search players and teams"
            placeholderTextColor={palette.muted}
            autoFocus
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={styles.input}
          />
          {isFetching && <ActivityIndicator color={palette.muted} size="small" />}
        </View>
        <Pressable onPress={goBack} hitSlop={10}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(h) => `${h.kind}-${h.id}`}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {searching ? (isFetching ? ' ' : 'No players or teams found') : 'Type at least two letters.'}
          </Text>
        }
        renderSectionHeader={({ section }) =>
          section.title === 'Recent' ? (
            <View style={styles.sectionRow}>
              <Text style={[styles.section, styles.sectionRowTitle]}>{section.title}</Text>
              <Pressable onPress={clearRecent} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear recent searches">
                <Text style={styles.clear}>Clear</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.section}>{section.title}</Text>
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View>
            <Pressable
              onPress={() => {
                remember(item);
                open(item);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: withAlpha('#FFFFFF', 0.06) }]}>
              <View style={[styles.avatar, item.kind === 'team' && styles.avatarTeam]}>
                {item.image ? (
                  <Image
                    source={item.image}
                    style={item.kind === 'team' ? styles.logo : styles.headshot}
                    contentFit={item.kind === 'team' ? 'contain' : 'cover'}
                  />
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.sub}>{item.kind === 'team' ? 'Team' : item.subtitle || 'Player'}</Text>
              </View>
              <Text style={styles.kind}>{item.kind === 'team' ? item.subtitle : item.subtitle ? 'Player' : ''}</Text>
            </Pressable>
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.arena },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 23,
    backgroundColor: withAlpha('#FFFFFF', 0.08),
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: palette.chalk },
  cancel: { fontFamily: fonts.bodySemi, fontSize: 15, color: palette.muted },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionRowTitle: { flex: 1 },
  clear: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted, paddingBottom: 6, paddingHorizontal: 4 },
  section: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: withAlpha(palette.chalk, 0.55),
    paddingTop: 16,
    paddingBottom: 6,
    paddingHorizontal: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: withAlpha(palette.chalk, 0.1) },
  avatarTeam: { backgroundColor: 'transparent', borderRadius: 0 },
  headshot: { width: 52, height: 44 },
  logo: { width: 44, height: 44 },
  title: { fontFamily: fonts.bodySemi, fontSize: 16, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, marginTop: 1 },
  kind: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  empty: { textAlign: 'center', marginTop: 40, fontFamily: fonts.body, fontSize: 15, color: palette.muted },
});
