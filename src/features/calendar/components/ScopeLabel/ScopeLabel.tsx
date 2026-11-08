import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { NbaLogo } from '@/components';
import type { Team } from '@/lib/espn';
import { fonts, palette } from '@/lib/theme';
import type { CalendarMode } from '../../constants';

/** The height of the logo (a team's, or the NBA's) in front of the scope. */
const LOGO = 20;

/**
 * The Calendar's title with what it is showing underneath: the day view lists every game of the league, month and agenda are
 * one team's season (the one whose logo sits in front of its name). The same screen answers two different questions, so it says which.
 */
export function ScopeLabel({ mode, team }: { mode: CalendarMode; team?: Pick<Team, 'name' | 'logo' | 'logoDark'> | null }) {
  const league = mode === 'day' || !team;
  return (
    <View>
      <Text style={styles.title} numberOfLines={1}>
        Calendar
      </Text>
      <View style={styles.scope}>
        {/* Both are LOGO tall, so the header does not change height between the views. The NBA mark is tall and narrow, cropped to
            itself (`tight`): it was a small mark in a big empty box. */}
        {league ? <NbaLogo size={LOGO} tight /> : <Image source={team.logoDark || team.logo} style={styles.logo} contentFit="contain" />}
        <Text style={styles.scopeText} numberOfLines={1}>
          {league ? 'Every game in the league' : `${team.name} season`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.displayBold, fontSize: 24, color: palette.chalk },
  scope: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -2 },
  logo: { width: LOGO, height: LOGO },
  scopeText: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
});
