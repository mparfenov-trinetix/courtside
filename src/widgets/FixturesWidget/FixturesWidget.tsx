import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  padding,
  resizable,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { FixtureProps, FixturesProps } from '@/lib/widgets';
import { SAMPLE_FIXTURES } from './constants';

/**
 * Home-screen widget: the selected team's next games as a list. Medium shows three, large shows seven.
 * Runs in WidgetKit's own runtime: pure, synchronous, and nothing outside this function but the imports above.
 */
const FixturesLayout = (props: FixturesProps, environment: WidgetEnvironment) => {
  'widget';
  const large = environment.widgetFamily === 'systemLarge';
  const white = '#F2F4F7';
  const dim = '#F2F4F7A6';
  const surface = containerBackground(
    { type: 'linearGradient', colors: [props.bg2, props.bg], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    'widget',
  );
  const shown = props.games.slice(0, large ? 7 : 3);
  // Seven rows only fit with tighter spacing (the page does not scroll: an overfull one cuts off its top).
  const gap = large ? (shown.length >= 7 ? 8 : shown.length === 6 ? 10 : 12) : 8;

  const crest = (file: string, abbr: string, size: number) =>
    file !== '' ? (
      <Image uiImage={file} modifiers={[resizable(), aspectRatio({ contentMode: 'fit' }), frame({ width: size, height: size })]} />
    ) : (
      <Text modifiers={[font({ size: size * 0.36, weight: 'heavy' }), foregroundStyle(white), frame({ width: size, height: size })]}>{abbr}</Text>
    );

  const row = (g: FixtureProps, i: number) => (
    <HStack key={i} spacing={10} modifiers={[widgetURL(g.gameId !== '' ? 'courtside://game/' + g.gameId : 'courtside://')]}>
      {crest(g.oppLogo, g.oppAbbr, large ? 32 : 28)}
      <VStack alignment="leading" spacing={1}>
        <Text modifiers={[font({ size: 14, weight: 'heavy' }), foregroundStyle(white), lineLimit(1)]}>{(g.home ? 'vs ' : '@ ') + g.oppName}</Text>
        {g.tag !== '' ? <Text modifiers={[font({ size: 10, weight: 'bold' }), kerning(0.6), foregroundStyle(props.accent)]}>{g.tag.toUpperCase()}</Text> : null}
      </VStack>
      <Spacer />
      <VStack alignment="trailing" spacing={1}>
        <Text modifiers={[font({ size: 14, weight: 'heavy' }), foregroundStyle(props.accent)]}>{g.time}</Text>
        <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(dim)]}>{g.day}</Text>
      </VStack>
    </HStack>
  );

  return (
    <VStack alignment="leading" spacing={gap} modifiers={[padding({ all: 2 }), surface, widgetURL('courtside://')]}>
      <HStack spacing={6}>
        <Text modifiers={[font({ size: 10, weight: 'heavy' }), kerning(1.2), foregroundStyle(props.accent)]}>UPCOMING</Text>
        <Spacer />
        <Text modifiers={[font({ size: 10, weight: 'bold' }), kerning(0.6), foregroundStyle(dim)]}>{props.teamAbbr}</Text>
      </HStack>
      {shown.length === 0 ? <Text modifiers={[font({ size: 13 }), foregroundStyle(dim)]}>No games scheduled</Text> : shown.map((g, i) => row(g, i))}
      <Spacer />
    </VStack>
  );
};

export const FixturesWidget = createWidget<FixturesProps>('FixturesWidget', FixturesLayout, SAMPLE_FIXTURES);

export default FixturesWidget;
