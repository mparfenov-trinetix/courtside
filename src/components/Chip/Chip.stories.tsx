import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from './Chip';
import { palette } from '@/lib/theme';

const meta = { title: 'Controls/Chip' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const OPTIONS = ['Full', 'Q1', 'Q2', 'Q3', 'Q4'];

function Demo({ color, size }: { color?: string; size?: 'sm' | 'md' }) {
  const [on, setOn] = useState('Full');
  return (
    <View style={styles.stage}>
      <View style={styles.row}>
        {OPTIONS.map((o) => (
          <Chip key={o} label={o} size={size} color={color} active={on === o} onPress={() => setOn(o)} />
        ))}
      </View>
    </View>
  );
}

/** The chosen chip is Liquid Glass (iOS 26); the others are a plain faint pill. */
export const Default: Story = { render: () => <Demo /> };
export const Tinted: Story = { render: () => <Demo color="#E84855" size="md" /> };

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.arena },
  row: { flexDirection: 'row', gap: 6 },
});
