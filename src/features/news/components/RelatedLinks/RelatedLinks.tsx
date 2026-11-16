import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ChevronIcon, SectionLabel } from '@/components';
import { useTeams } from '@/hooks';
import { headshotUrl, type ArticleRelated } from '@/lib/espn';
import { fontSize, fonts, palette, radius, space, surfaces } from '@/lib/theme';
import { openDetail, teamHref } from '@/navigation';

const MAX_PLAYERS = 6;

/**
 * "Related" under an article: the game it is about, the teams and the players ESPN tagged it with, each a row that opens its page. The
 * team's logo comes from the cached team list (a team missing from it keeps just its name); a player's photo is ESPN's headshot, and a
 * player with none shows a plain circle. Nothing is drawn for an article with no tags.
 */
export function RelatedLinks({ related }: { related: ArticleRelated }) {
  const { data: teams } = useTeams();
  const players = related.players.slice(0, MAX_PLAYERS);
  if (!related.game && related.teams.length === 0 && players.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <SectionLabel>Related</SectionLabel>
      <Card padded={false} style={styles.card}>
        {related.game ? (
          <Row
            label={related.game.name}
            tag="Game"
            onPress={() => openDetail({ pathname: '/game/[id]', params: { id: related.game!.id } })}
            lead={<View style={[styles.avatar, styles.gameDot]}><Text style={styles.gameDotText}>VS</Text></View>}
          />
        ) : null}
        {related.teams.map((t) => {
          const team = teams?.find((x) => x.id === t.id);
          return (
            <Row
              key={`t${t.id}`}
              label={t.name}
              tag="Team"
              onPress={() => openDetail(teamHref(t.id))}
              lead={team ? <Image source={team.logoDark || team.logo} style={styles.logo} contentFit="contain" /> : <View style={styles.avatar} />}
            />
          );
        })}
        {players.map((p) => (
          <Row
            key={`p${p.id}`}
            label={p.name}
            tag="Player"
            onPress={() => openDetail({ pathname: '/player/[id]', params: { id: p.id, teamId: '' } })}
            lead={<Image source={headshotUrl(p.id)} style={[styles.avatar, styles.photo]} contentFit="cover" />}
          />
        ))}
      </Card>
    </View>
  );
}

function Row({ label, tag, lead, onPress }: { label: string; tag: string; lead: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${tag}: ${label}`} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={styles.leadBox}>{lead}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.tag}>{tag.toUpperCase()}</Text>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </View>
      <ChevronIcon size={16} color={palette.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, marginTop: space.lg },
  card: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.sm, minHeight: 56 },
  leadBox: { width: 36, alignItems: 'center' },
  logo: { width: 32, height: 32 },
  avatar: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: surfaces.raised },
  photo: { overflow: 'hidden' },
  gameDot: { alignItems: 'center', justifyContent: 'center' },
  gameDotText: { fontFamily: fonts.displayBold, fontSize: fontSize.label, color: palette.gold, letterSpacing: 0.5 },
  tag: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 0.8, color: palette.muted },
  label: { fontFamily: fonts.bodySemi, fontSize: fontSize.large - 1, color: palette.chalk },
});
