import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { fonts, palette } from '@/lib/theme';

/** "Updated 12s ago", ticking while a live game polls in the background. */
export function UpdatedAgo({ at }: { at: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  const secs = Math.max(0, Math.round((now - at) / 1000));
  const label = secs < 5 ? 'just now' : secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`;
  return <Text style={styles.text}>Updated {label}</Text>;
}

const styles = StyleSheet.create({
  text: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
});
