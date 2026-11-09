import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { WinnerRow } from '../WinnerRow';
import { Card, SectionLabel } from '@/components';
import type { AwardGroup, Team } from '@/lib/espn';
import { fontSize, fonts, palette, space } from '@/lib/theme';

/**
 * One group of a season's awards. The awards with a single winner (MVP, Rookie of the Year...) share one card, a row each with the award's
 * name over the winner; an award with a team of five (All-NBA First Team...) is a card of its own with the five in court order.
 */
export function AwardSection({ group, teamOf }: { group: AwardGroup; teamOf: (id?: string) => Team | undefined }) {
  const singles = group.awards.filter((a) => a.winners.length === 1);
  const teams = group.awards.filter((a) => a.winners.length > 1);
  return (
    <View style={styles.section}>
      <SectionLabel style={styles.label}>{group.title}</SectionLabel>
      {singles.length > 0 ? (
        <Card padded={false}>
          {singles.map((award, i) => (
            <Fragment key={award.id}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <WinnerRow winner={award.winners[0]} team={teamOf(award.winners[0].teamId)} caption={award.name} />
            </Fragment>
          ))}
        </Card>
      ) : null}
      {teams.map((award) => (
        <Card key={award.id} padded={false}>
          <Text style={styles.teamTitle}>{award.name}</Text>
          {award.winners.map((winner) => (
            <WinnerRow key={winner.id} winner={winner} team={teamOf(winner.teamId)} />
          ))}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: space.lg, marginTop: space.lg, gap: space.sm },
  label: { paddingHorizontal: space.xs },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.line, marginLeft: space.md },
  teamTitle: { fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.gold, letterSpacing: 0.4, textTransform: 'uppercase', paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.xs },
});
