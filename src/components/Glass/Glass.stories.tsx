import type { Meta, StoryObj } from '@storybook/react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Glass, glassSupported } from './Glass';
import { fonts, palette } from '@/lib/theme';

const meta = { title: 'Controls/Glass' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Liquid Glass over a busy background (iOS 26), or the plain translucent fallback elsewhere. Glass needs something behind it to show. */
export const OverContent: Story = {
  render: () => (
    <View style={styles.stage}>
      <View style={[styles.stripe, { backgroundColor: '#E84855' }]} />
      <View style={[styles.stripe, { backgroundColor: '#F4B942' }]} />
      <View style={[styles.stripe, { backgroundColor: '#2E86DE' }]} />
      <Glass interactive style={styles.pill}>
        <Text style={styles.label}>{glassSupported() ? 'Liquid Glass' : 'Fallback'}</Text>
      </Glass>
      <Glass tint="#E84855" style={[styles.pill, { marginTop: 14 }]}>
        <Text style={styles.label}>Tinted</Text>
      </Glass>
    </View>
  ),
};

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.arena },
  stripe: { position: 'absolute', left: 0, right: 0, height: 60, top: '38%' },
  pill: { height: 44, paddingHorizontal: 22, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bodySemi, fontSize: 16, color: palette.chalk },
});
