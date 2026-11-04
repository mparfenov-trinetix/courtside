import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAllStars, usePlayerCareer, usePlayerProfile } from '@/hooks';
import type { Honor, PlayerProfile } from '@/lib/espn';
import { titleSeasons } from '@/lib/league';
import { fonts, palette, withAlpha } from '@/lib/theme';

type Who = { id: string; name: string };
type Line = { label: string; a: string; b: string; winner?: 'a' | 'b' };

const sumHonors = (honors: Honor[] | undefined, test: RegExp) => (honors ?? []).filter((h) => test.test(h.name)).reduce((n, h) => n + h.count, 0);
const money = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`);
const better = (a: number, b: number, higher = true): 'a' | 'b' | undefined => (a === b ? undefined : (a > b) === higher ? 'a' : 'b');

/** Count lines (titles, MVPs...): shown only when at least one of the two has some. */
function honorLines(
  a: { profile?: PlayerProfile; titles: number; allStars: number },
  b: { profile?: PlayerProfile; titles: number; allStars: number },
): Line[] {
  const count = (label: string, x: number, y: number): Line | null => (x === 0 && y === 0 ? null : { label, a: String(x), b: String(y), winner: better(x, y) });
  return [
    count('NBA champion', a.titles, b.titles),
    count('MVP', sumHonors(a.profile?.honors, /^MVP$/i), sumHonors(b.profile?.honors, /^MVP$/i)),
    count('Finals MVP', sumHonors(a.profile?.honors, /^finals mvp/i), sumHonors(b.profile?.honors, /^finals mvp/i)),
    count('All-Star', a.allStars, b.allStars),
    count('All-NBA', sumHonors(a.profile?.honors, /^all-nba/i), sumHonors(b.profile?.honors, /^all-nba/i)),
    count('All-Defensive', sumHonors(a.profile?.honors, /^all-defensive/i), sumHonors(b.profile?.honors, /^all-defensive/i)),
    count('Defensive Player of the Year', sumHonors(a.profile?.honors, /^defensive player/i), sumHonors(b.profile?.honors, /^defensive player/i)),
    count('Rookie of the Year', sumHonors(a.profile?.honors, /^rookie of the year/i), sumHonors(b.profile?.honors, /^rookie of the year/i)),
  ].filter((l): l is Line => l != null);
}

/** Contract and honors side by side. Separate from the stats chart: these are facts, not averages to put on a radar. */
export function PlayerExtras({ a, b, aColor, bColor }: { a: Who; b: Who; aColor: string; bColor: string }) {
  const profA = usePlayerProfile(a.id);
  const profB = usePlayerProfile(b.id);
  const careerA = usePlayerCareer(a.id);
  const careerB = usePlayerCareer(b.id);
  const { data: allStars } = useAllStars();

  const ca = profA.data?.contract;
  const cb = profB.data?.contract;
  const da = profA.data?.draft;
  const db = profB.data?.draft;

  const contract: Line[] = [];
  if (ca || cb) {
    contract.push({ label: 'Salary', a: ca ? money(ca.salary) : '–', b: cb ? money(cb.salary) : '–', winner: ca && cb ? better(ca.salary, cb.salary) : undefined });
    contract.push({ label: 'Years left', a: ca ? String(ca.yearsRemaining) : '–', b: cb ? String(cb.yearsRemaining) : '–', winner: ca && cb ? better(ca.yearsRemaining, cb.yearsRemaining) : undefined });
    if (ca && cb) {
      const total = (c: typeof ca) => c.salary * Math.max(1, c.yearsRemaining);
      contract.push({ label: 'Remaining value (at this salary)', a: money(total(ca)), b: money(total(cb)), winner: better(total(ca), total(cb)) });
    }
  }
  if (da || db) {
    contract.push({ label: 'Draft pick', a: da ? `#${da.pick} · ${da.year}` : 'Undrafted', b: db ? `#${db.pick} · ${db.year}` : 'Undrafted' });
  }

  const honors = honorLines(
    { profile: profA.data, titles: careerA.data ? titleSeasons(careerA.data.seasons).length : 0, allStars: allStars?.[a.id]?.length ?? 0 },
    { profile: profB.data, titles: careerB.data ? titleSeasons(careerB.data.seasons).length : 0, allStars: allStars?.[b.id]?.length ?? 0 },
  );

  return (
    <View>
      {contract.length > 0 && <Block title="Contract" lines={contract} aColor={aColor} bColor={bColor} delay={60} />}
      {honors.length > 0 && <Block title="Honors" lines={honors} aColor={aColor} bColor={bColor} delay={120} />}
    </View>
  );
}

function Block({ title, lines, aColor, bColor, delay }: { title: string; lines: Line[]; aColor: string; bColor: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(280)} style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>
        {lines.map((l, i) => (
          <View key={l.label} style={[styles.row, i < lines.length - 1 && styles.border]}>
            <Text style={[styles.value, { textAlign: 'left' }, l.winner === 'a' ? { color: aColor } : styles.dim]}>{l.a}</Text>
            <Text style={styles.label}>{l.label}</Text>
            <Text style={[styles.value, { textAlign: 'right' }, l.winner === 'b' ? { color: bColor } : styles.dim]}>{l.b}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 18 },
  title: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: withAlpha(palette.chalk, 0.55), marginBottom: 8, paddingHorizontal: 4 },
  card: { borderRadius: 18, backgroundColor: withAlpha('#FFFFFF', 0.05), overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 16 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(palette.chalk, 0.1) },
  value: { flex: 1, fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
  dim: { color: withAlpha(palette.chalk, 0.85) },
  label: { flex: 1.2, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
});
