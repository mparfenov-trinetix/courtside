import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, kerning, lineLimit, minimumScaleFactor, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { LockScreenProps } from '@/lib/widgets';
import { SAMPLE_LOCK } from './constants';

/**
 * Lock Screen widget in the three accessory shapes: a circle (who and when), a rectangle (record, next game, form) and an
 * inline line. The Lock Screen tints everything itself, so there is no color here.
 * Runs in WidgetKit's own runtime: pure, synchronous, and nothing outside this function but the imports above.
 */
const LockScreenLayout = (props: LockScreenProps, environment: WidgetEnvironment) => {
  'widget';
  const family = environment.widgetFamily;
  const has = props.oppAbbr !== '';
  const versus = props.home ? 'vs' : '@';
  const url = has && props.gameId !== '' ? 'courtside://game/' + props.gameId : 'courtside://';

  if (family === 'accessoryInline') {
    return (
      <Text modifiers={[widgetURL(url), lineLimit(1)]}>
        {has ? props.teamAbbr + ' ' + versus + ' ' + props.oppAbbr + ' · ' + props.when : props.teamAbbr + ' ' + props.record}
      </Text>
    );
  }

  if (family === 'accessoryCircular') {
    return (
      <VStack spacing={0} modifiers={[widgetURL(url)]}>
        <Text modifiers={[font({ size: 10, weight: 'bold' }), kerning(0.5)]}>{has ? versus.toUpperCase() : props.teamAbbr}</Text>
        <Text modifiers={[font({ size: 17, weight: 'heavy' }), lineLimit(1), minimumScaleFactor(0.6)]}>{has ? props.oppAbbr : props.record}</Text>
        <Text modifiers={[font({ size: 10, weight: 'semibold' }), lineLimit(1), minimumScaleFactor(0.5)]}>{has ? props.time : props.streak}</Text>
      </VStack>
    );
  }

  // accessoryRectangular
  return (
    <VStack alignment="leading" spacing={1} modifiers={[widgetURL(url)]}>
      <HStack spacing={4}>
        <Text modifiers={[font({ size: 13, weight: 'heavy' }), lineLimit(1)]}>{props.teamAbbr + '  ' + props.record}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 13, weight: 'heavy' })]}>{props.streak}</Text>
      </HStack>
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), lineLimit(1), minimumScaleFactor(0.8)]}>
        {has ? 'Next ' + versus + ' ' + props.oppAbbr + ' · ' + props.when : 'No game scheduled'}
      </Text>
      <Text modifiers={[font({ size: 11 }), lineLimit(1), minimumScaleFactor(0.8)]}>
        {props.form.length > 0 ? props.form.join(' ') + (props.last !== '' ? '  ·  ' + props.last : '') : props.last}
      </Text>
    </VStack>
  );
};

export const LockScreenWidget = createWidget<LockScreenProps>('LockScreenWidget', LockScreenLayout, SAMPLE_LOCK);

export default LockScreenWidget;
