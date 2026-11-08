import { useState } from 'react';
import { View } from 'react-native';

import { InjuryReport, TransactionList } from '../../components';
import { ScreenHeader, Segmented } from '@/components';
import { palette, space } from '@/lib/theme';
import { useScreenTeamStore } from '@/state';

type Tab = 'injuries' | 'moves';
const TABS: { key: Tab; label: string }[] = [
  { key: 'injuries', label: 'Injuries' },
  { key: 'moves', label: 'Moves' },
];

/** The league's wire: every team's injury report, and the season's signings, waivers and trades. */
export function WireScreen() {
  const [tab, setTab] = useState<Tab>('injuries');
  const favoriteTeamId = useScreenTeamStore((s) => s.favoriteTeamId);
  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScreenHeader title="League Wire" />
      <Segmented style={{ marginHorizontal: space.lg, marginBottom: space.xs, alignSelf: 'flex-start' }} options={TABS} value={tab} segmentWidth={104} onChange={(key) => setTab(key)} />
      {tab === 'injuries' ? <InjuryReport favoriteTeamId={favoriteTeamId} /> : <TransactionList />}
    </View>
  );
}
