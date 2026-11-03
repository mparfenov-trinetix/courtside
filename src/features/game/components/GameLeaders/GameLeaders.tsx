import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { headshotUrl, type BoxScorePlayer, type GameInfo, type Injury } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';

type Side = { teamId: string; abbr: string; color: string; players: BoxScorePlayer[] };

const CATS = [
  { key: 'PTS', label: 'Points' },
  { key: 'REB', label: 'Rebounds' },
  { key: 'AST', label: 'Assists' },
] as const;

function best(players: BoxScorePlayer[], key: string) {
  let top: BoxScorePlayer | null = null;
  let topVal = 0;
  for (const p of players) {
    const v = parseFloat(p.stats[key] ?? '');
    if (!isNaN(v) && v > topVal) {
      top = p;
      topVal = v;
    }
  }
  return top ? { player: top, value: topVal } : null;
}

export function GameLeaders({ away, home }: { away: Side; home: Side }) {
  const rows = CATS.map((c) => ({ ...c, a: best(away.players, c.key), h: best(home.players, c.key) })).filter(
    (r) => r.a || r.h,
  );
  if (rows.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Game leaders</Text>
      <View style={styles.card}>
        {rows.map((r, i) => (
          <View key={r.key} style={[styles.row, i < rows.length - 1 && styles.rowBorder]}>
            <Leader side={away} entry={r.a} align="left" />
            <View style={styles.mid}>
              <Text style={styles.midLabel}>{r.label}</Text>
            </View>
            <Leader side={home} entry={r.h} align="right" />
          </View>
        ))}
      </View>
    </View>
  );
}

function Leader({
  side,
  entry,
  align,
}: {
  side: Side;
  entry: { player: BoxScorePlayer; value: number } | null;
  align: 'left' | 'right';
}) {
  if (!entry) return <View style={styles.leader} />;
  const { player, value } = entry;
  const right = align === 'right';
  return (
    <Pressable
      onPress={() => player.id && openDetail({ pathname: '/player/[id]', params: { id: player.id, teamId: side.teamId } })}
      style={({ pressed }) => [styles.leader, right && styles.leaderRight, pressed && { opacity: 0.7 }]}>
      {!right && <Headshot player={player} color={side.color} />}
      <View style={[styles.leaderText, right && { alignItems: 'flex-end' }]}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.name} numberOfLines={1}>{player.shortName || player.name}</Text>
      </View>
      {right && <Headshot player={player} color={side.color} />}
    </Pressable>
  );
}

function Headshot({ player, color }: { player: BoxScorePlayer; color: string }) {
  return (
    <View style={[styles.headshot, { backgroundColor: withAlpha(color, 0.35) }]}>
      {player.headshot ? (
        <Image source={player.headshot} style={styles.headshotImg} contentFit="cover" />
      ) : (
        <Text style={styles.initial}>{(player.shortName || player.name).charAt(0)}</Text>
      )}
    </View>
  );
}

export function GameInfoCard({ info }: { info: GameInfo }) {
  const rows: [string, string][] = [];
  if (info.venue) rows.push(['Arena', [info.venue, info.city].filter(Boolean).join(' · ')]);
  if (info.date) {
    rows.push([
      'Tip-off',
      new Date(info.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    ]);
  }
  if (info.attendance) rows.push(['Attendance', info.attendance.toLocaleString('en-US')]);
  if (info.broadcast) rows.push(['Broadcast', info.broadcast]);
  if (info.seriesSummary) rows.push(['Season series', info.seriesSummary]);
  if (info.officials.length > 0) rows.push(['Officials', info.officials.join(', ')]);
  if (rows.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Game info</Text>
      <View style={styles.card}>
        {rows.map(([label, value], i) => (
          <View key={label} style={[styles.infoRow, i < rows.length - 1 && styles.rowBorder]}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function InjuryReport({
  injuries,
  teams,
}: {
  injuries: Injury[];
  teams: { id: string; abbr: string; color: string }[];
}) {
  const groups = teams
    .map((t) => ({ ...t, items: injuries.filter((i) => i.teamId === t.id) }))
    .filter((g) => g.items.length > 0);
  if (groups.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Injury report</Text>
      <View style={styles.card}>
        {groups.map((g, gi) => (
          <View key={g.id}>
            <Text style={[styles.injTeam, { color: g.color }, gi > 0 && styles.injTeamBorder]}>{g.abbr}</Text>
            {g.items.map((i) => {
              const out = /out/i.test(i.status);
              const status = out ? '#F87171' : '#FBBF24';
              const src = i.headshot || (i.athleteId ? headshotUrl(i.athleteId) : '');
              return (
                <Pressable
                  key={i.athleteId || i.name}
                  disabled={!i.athleteId}
                  onPress={() => openDetail({ pathname: '/player/[id]', params: { id: i.athleteId, teamId: i.teamId } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${i.name}, ${i.status}`}
                  style={({ pressed }) => [styles.injRow, pressed && { opacity: 0.7 }]}>
                  <View style={styles.injAvatarWrap}>
                    <View style={[styles.injAvatar, { backgroundColor: withAlpha(g.color, 0.3) }]}>
                      {src ? <Image source={src} style={styles.injAvatarImg} contentFit="cover" /> : (
                        <Text style={styles.initial}>{i.name.charAt(0)}</Text>
                      )}
                    </View>
                    <View style={[styles.injDot, { backgroundColor: status }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.injName} numberOfLines={1}>
                      {i.name}{i.position ? ` · ${i.position}` : ''}
                    </Text>
                    <Text style={styles.injDetail} numberOfLines={1}>
                      {[i.detail, i.returnDate ? `back ~${new Date(i.returnDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <Text style={[styles.injStatus, { color: status }]}>{i.status}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  injTeam: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  injTeamBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(palette.chalk, 0.1), marginTop: 8 },
  injRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8 },
  injAvatarWrap: { width: 40, height: 40 },
  injAvatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  injAvatarImg: { width: 46, height: 40 },
  injDot: { position: 'absolute', right: -1, bottom: -1, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: '#16202F' },
  injName: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
  injDetail: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  injStatus: { fontFamily: fonts.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  wrap: { paddingHorizontal: 16, marginBottom: 14 },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: { borderRadius: 16, backgroundColor: withAlpha('#FFFFFF', 0.05), overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(palette.chalk, 0.1) },
  mid: { width: 74, alignItems: 'center' },
  midLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  leader: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  leaderRight: { justifyContent: 'flex-end' },
  leaderText: { flexShrink: 1, gap: 0 },
  value: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, color: palette.chalk },
  name: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  headshot: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  headshotImg: { width: 46, height: 40 },
  initial: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.chalk },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 12, paddingHorizontal: 14 },
  infoLabel: { fontFamily: fonts.body, fontSize: 14, color: palette.muted },
  infoValue: { flex: 1, textAlign: 'right', fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
});
