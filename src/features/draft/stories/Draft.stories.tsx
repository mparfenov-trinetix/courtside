import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView, View } from 'react-native';

import { DraftHero, PickRow } from '../components';
import draftJson from '../../../../tests/fixtures/draft.json';
import { normalizeDraft } from '@/lib/espn';
import { palette } from '@/lib/theme';

const meta = { title: 'NBA Draft' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// Real records, trimmed: 2025 (the first, second and tenth picks, the tenth traded, and a second-rounder), 2024's first pick from abroad, 2005's first.
const draft = (season: 2025 | 2024 | 2005) => {
  const f = draftJson[String(season) as '2025' | '2024' | '2005'];
  return normalizeDraft(season, f.rounds as never, f.athletes as never, f.colleges as never);
};
const noTeam = () => undefined;

const Page = ({ season }: { season: 2025 | 2024 | 2005 }) => {
  const d = draft(season);
  return (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScrollView contentContainerStyle={{ paddingVertical: 24, gap: 8 }}>
        <DraftHero draft={d} teamOf={noTeam} />
        {d.picks.map((p) => (
          <View key={p.overall} style={{ paddingHorizontal: 16 }}>
            <PickRow pick={p} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

/** A recent class: photos, colleges, a traded pick (tap a row for ESPN's scouting report). */
export const Recent: Story = { render: () => <Page season={2025} /> };

/** A player from a club abroad: his country's flag in place of a college. */
export const FromAbroad: Story = { render: () => <Page season={2024} /> };

/** Before 2019: no NBA id on the record, so the college's logo stands in for a photo. */
export const Older: Story = { render: () => <Page season={2005} /> };
