import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** A single digit as a vertical reel that spins to its new value. */
function Reel({ digit, fontSize, style }: { digit: number; fontSize: number; style?: StyleProp<TextStyle> }) {
  const height = Math.round(fontSize * 1.15);
  // Starts on its digit, so nothing spins when a screen first opens.
  const offset = useSharedValue(-digit * height);

  useEffect(() => {
    offset.set(withSpring(-digit * height, { damping: 15, stiffness: 150, mass: 0.7 }));
  }, [digit, height, offset]);

  const reel = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));

  return (
    <View style={{ height, overflow: 'hidden' }}>
      <Animated.View style={reel}>
        {DIGITS.map((d) => (
          <Text key={d} style={[style, styles.digit, { fontSize, height, lineHeight: height }]}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

/** A score that rolls like an odometer when it changes. Non-numeric values just render as text. */
export function RollingNumber({
  value,
  fontSize,
  style,
}: {
  value: number | string;
  fontSize: number;
  style?: StyleProp<TextStyle>;
}) {
  const text = String(value);
  if (!/^\d+$/.test(text)) return <Text style={[style, { fontSize }]}>{text}</Text>;

  // Keyed from the right, so 99 -> 100 keeps the ones and tens reels and adds a new hundreds reel.
  const digits = text.split('');
  return (
    <View style={styles.row} accessibilityLabel={text} accessible>
      {digits.map((d, i) => (
        <Reel key={digits.length - i} digit={Number(d)} fontSize={fontSize} style={style} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  digit: { textAlign: 'center' },
});
