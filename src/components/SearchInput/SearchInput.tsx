import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { fonts, palette } from '@/lib/theme';

const HEIGHT = 46;

type Props = Omit<TextInputProps, 'style' | 'placeholder' | 'placeholderTextColor'> & {
  placeholder: string;
  /** The field's pill: background, radius, `paddingHorizontal`, and `flex: 1` where it should fill a row. */
  style?: StyleProp<ViewStyle>;
};

/**
 * A search field. The placeholder is drawn here, not by TextInput: with a custom font iOS sets TextInput's own placeholder lower
 * than the caret (or clips it to its descenders), so the hint sits half out of the pill.
 */
export function SearchInput({ placeholder, value, style, ...props }: Props) {
  const pad = StyleSheet.flatten(style)?.paddingHorizontal;
  return (
    <View style={[styles.wrap, style]}>
      <TextInput value={value} accessibilityLabel={placeholder} {...props} style={styles.input} />
      {!value && (
        <Text pointerEvents="none" numberOfLines={1} style={[styles.placeholder, { left: typeof pad === 'number' ? pad : 0, right: typeof pad === 'number' ? pad : 0 }]}>
          {placeholder}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: HEIGHT, justifyContent: 'center' },
  input: { height: HEIGHT, paddingVertical: 0, fontFamily: fonts.body, fontSize: 16, color: palette.chalk },
  placeholder: { position: 'absolute', fontFamily: fonts.body, fontSize: 16, color: palette.muted },
});
