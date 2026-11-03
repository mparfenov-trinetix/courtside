import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FlashOverlay, Tick } from './LiveFlash';
import { fonts, palette, withAlpha } from '@/lib/theme';

const meta = { title: 'Live data/Change highlights' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function TickDemo() {
  const [clock, setClock] = useState(572);
  const text = `${Math.floor(clock / 60)}:${String(clock % 60).padStart(2, '0')}`;
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <Tick value={text} style={{ fontFamily: fonts.display, fontSize: 48, color: palette.chalk }} />
      <Button label="Tick the clock" onPress={() => setClock((c) => c - 7)} />
    </View>
  );
}

/** A value that slides up and fades in when it changes (not on first render). */
export const TickValue: Story = { render: () => <TickDemo /> };

function FlashDemo() {
  const [pts, setPts] = useState(24);
  return (
    <View style={{ gap: 16, paddingHorizontal: 16 }}>
      <View style={styles.row}>
        <FlashOverlay radius={12} signature={String(pts)} />
        <Text style={styles.name}>T. Maxey</Text>
        <Text style={styles.value}>{pts} PTS</Text>
      </View>
      <Button label="Maxey scores" onPress={() => setPts((p) => p + 2)} />
    </View>
  );
}

/** A gold wash that fades out whenever the data behind a row changes. Used on live game rows and cards. */
export const FlashOnChange: Story = { render: () => <FlashDemo /> };

const styles = StyleSheet.create({
  button: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: withAlpha(palette.chalk, 0.12) },
  buttonText: { color: palette.chalk, fontFamily: fonts.bodyBold },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, backgroundColor: withAlpha('#FFFFFF', 0.05) },
  name: { fontFamily: fonts.bodySemi, fontSize: 16, color: palette.chalk },
  value: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
});
