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

export type FixtureProps = {
  oppAbbr: string;
  oppName: string;
  /** Logo file URI inside the shared widget folder; empty when it couldn't be downloaded. */
  oppLogo: string;
  home: boolean;
  /** "Thu, Nov 5" and "7:00 PM", in the device's language and time zone when the app last synced. */
  day: string;
  time: string;
  /** "NBA Cup" or a playoff round; empty for a regular game. */
  tag: string;
  gameId: string;
};

export type FixturesProps = {
  teamAbbr: string;
  bg: string;
  bg2: string;
  accent: string;
  logo: string;
  /** The next games, soonest first. */
  games: FixtureProps[];
};

/** What the widget gallery and a never-opened widget show. */
export const SAMPLE_FIXTURES: FixturesProps = {
  teamAbbr: 'DEN',
  bg: '#0D1B2E',
  bg2: '#1B3A5F',
  accent: '#FEC524',
  logo: '',
  games: [
    { oppAbbr: 'TOR', oppName: 'Toronto Raptors', oppLogo: '', home: true, day: 'Thu, Nov 5', time: '7:00 PM', tag: '', gameId: '' },
    { oppAbbr: 'POR', oppName: 'Portland Trail Blazers', oppLogo: '', home: false, day: 'Sat, Nov 7', time: '9:30 PM', tag: 'NBA Cup', gameId: '' },
    { oppAbbr: 'MIN', oppName: 'Minnesota Timberwolves', oppLogo: '', home: true, day: 'Mon, Nov 9', time: '7:00 PM', tag: '', gameId: '' },
    { oppAbbr: 'SAS', oppName: 'San Antonio Spurs', oppLogo: '', home: false, day: 'Wed, Nov 11', time: '8:00 PM', tag: '', gameId: '' },
    { oppAbbr: 'LAC', oppName: 'LA Clippers', oppLogo: '', home: true, day: 'Fri, Nov 13', time: '10:00 PM', tag: '', gameId: '' },
  ],
};

/**
 * Home-screen widget: the selected team's next games as a list. Medium shows three, large shows five.
 * Runs in WidgetKit's own runtime: pure, synchronous, and nothing outside this function but the imports above.
 */
const FixturesWidget = (props: FixturesProps, environment: WidgetEnvironment) => {
  'widget';
  const large = environment.widgetFamily === 'systemLarge';
  const white = '#F2F4F7';
  const dim = '#F2F4F7A6';
  const surface = containerBackground(
    { type: 'linearGradient', colors: [props.bg2, props.bg], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    'widget',
  );
  const shown = props.games.slice(0, large ? 5 : 3);

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
    <VStack alignment="leading" spacing={large ? 12 : 8} modifiers={[padding({ all: 2 }), surface, widgetURL('courtside://')]}>
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

export default createWidget<FixturesProps>('FixturesWidget', FixturesWidget, SAMPLE_FIXTURES);
