import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { Glass } from '../Glass';
import { fonts, palette } from '@/lib/theme';

const HEIGHT = 46;

type Props = Omit<TextInputProps, 'style' | 'placeholder' | 'placeholderTextColor'> & {
  placeholder: string;
  /** The field's pill: background, radius, `paddingHorizontal`, and `flex: 1` where it should fill a row. */
  style?: StyleProp<ViewStyle>;
  /** No glass or pill of its own: the field sits inside a pill the screen draws (with an icon beside it, say). */
  bare?: boolean;
};

/**
 * A search field. The placeholder is drawn here, not by TextInput: with a custom font iOS sets TextInput's own placeholder lower
 * than the caret (or clips it to its descenders), so the hint sits half out of the pill.
 */
export function SearchInput({ placeholder, value, style, bare = false, ...props }: Props) {
  const { backgroundColor, ...shape } = StyleSheet.flatten(style) ?? {};
  const pad = shape.paddingHorizontal;
  const Wrap = bare ? View : Glass;
  // The field is glass; its background color (from the caller) is only for where glass is not available.
  return (
    <Wrap style={[styles.wrap, bare ? style : shape]} {...(bare ? {} : { fallbackStyle: backgroundColor ? { backgroundColor } : undefined })}>
      <TextInput value={value} accessibilityLabel={placeholder} {...props} style={styles.input} />
      {!value && (
        <Text pointerEvents="none" numberOfLines={1} style={[styles.placeholder, { left: typeof pad === 'number' ? pad : 0, right: typeof pad === 'number' ? pad : 0 }]}>
          {placeholder}
        </Text>
      )}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  wrap: { height: HEIGHT, justifyContent: 'center' },
  input: { height: HEIGHT, paddingVertical: 0, fontFamily: fonts.body, fontSize: 16, color: palette.chalk },
  placeholder: { position: 'absolute', fontFamily: fonts.body, fontSize: 16, color: palette.muted },
});
