import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  background,
  clipShape,
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

export type FormGameProps = {
  result: 'W' | 'L';
  /** Opponent abbreviation. */
  opp: string;
  /** "106-93": the team's score first. */
  score: string;
  home: boolean;
};

/** Everything the widget shows, already worked out by the app. */
export type TeamFormProps = {
  teamAbbr: string;
  teamName: string;
  record: string;
  /** "4th in Pacific Division"; empty when unknown. */
  standing: string;
  /** "W3" / "L2"; empty with no games. */
  streak: string;
  bg: string;
  bg2: string;
  accent: string;
  /** Logo file URI inside the shared widget folder; empty when it couldn't be downloaded. */
  logo: string;
  /** Last five finished games, oldest first. */
  games: FormGameProps[];
};

/** What the widget gallery and a never-opened widget show. */
export const SAMPLE_FORM: TeamFormProps = {
  teamAbbr: 'DEN',
  teamName: 'Denver Nuggets',
  record: '4-2',
  standing: '2nd in Northwest Division',
  streak: 'W3',
  bg: '#0D1B2E',
  bg2: '#1B3A5F',
  accent: '#FEC524',
  logo: '',
  games: [
    { result: 'L', opp: 'LAL', score: '98-104', home: false },
    { result: 'W', opp: 'PHX', score: '121-110', home: true },
    { result: 'W', opp: 'MIN', score: '113-99', home: true },
    { result: 'L', opp: 'OKC', score: '101-109', home: false },
    { result: 'W', opp: 'UTA', score: '127-105', home: true },
  ],
};

/**
 * Home-screen widget: the selected team's last five results with its record, streak and standing.
 * Runs in WidgetKit's own runtime: pure, synchronous, and nothing outside this function but the imports above.
 */
const TeamFormWidget = (props: TeamFormProps, environment: WidgetEnvironment) => {
  'widget';
  const small = environment.widgetFamily === 'systemSmall';
  const white = '#F2F4F7';
  const dim = '#F2F4F7A6';
  const green = '#34D399';
  const red = '#F87171';
  const surface = containerBackground(
    { type: 'linearGradient', colors: [props.bg2, props.bg], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    'widget',
  );

  const crest = (size: number) =>
    props.logo !== '' ? (
      <Image uiImage={props.logo} modifiers={[resizable(), aspectRatio({ contentMode: 'fit' }), frame({ width: size, height: size })]} />
    ) : (
      <Text modifiers={[font({ size: size * 0.42, weight: 'heavy' }), foregroundStyle(white), frame({ width: size, height: size })]}>
        {props.teamAbbr}
      </Text>
    );

  const dot = (g: FormGameProps, i: number, size: number) => (
    <VStack key={i} spacing={3}>
      <Text
        modifiers={[
          font({ size: size * 0.46, weight: 'heavy' }),
          foregroundStyle(g.result === 'W' ? green : red),
          frame({ width: size, height: size }),
          background(g.result === 'W' ? '#34D39933' : '#F8717133'),
          clipShape('circle'),
        ]}>
        {g.result}
      </Text>
      <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(white), lineLimit(1)]}>{(g.home ? 'vs ' : '@ ') + g.opp}</Text>
      {small ? null : <Text modifiers={[font({ size: 9, weight: 'semibold' }), foregroundStyle(dim), lineLimit(1)]}>{g.score}</Text>}
    </VStack>
  );

  const header = (
    <HStack spacing={6}>
      <Text modifiers={[font({ size: 10, weight: 'heavy' }), kerning(1.2), foregroundStyle(props.accent)]}>FORM</Text>
      <Spacer />
      <Text modifiers={[font({ size: 11, weight: 'heavy' }), foregroundStyle(props.streak.startsWith('W') ? green : red)]}>
        {props.streak !== '' ? props.streak : ' '}
      </Text>
    </HStack>
  );

  const body =
    props.games.length === 0 ? (
      <Text modifiers={[font({ size: 13 }), foregroundStyle(dim)]}>No games played yet</Text>
    ) : (
      <HStack spacing={small ? 6 : 12}>{props.games.map((g, i) => dot(g, i, small ? 26 : 34))}</HStack>
    );

  return (
    <VStack alignment="leading" spacing={small ? 8 : 10} modifiers={[padding({ all: 2 }), surface, widgetURL('courtside://')]}>
      {header}
      <HStack spacing={8}>
        {crest(small ? 30 : 36)}
        <VStack alignment="leading" spacing={1}>
          <Text modifiers={[font({ size: small ? 15 : 18, weight: 'heavy' }), foregroundStyle(white), lineLimit(1)]}>
            {props.teamAbbr + '  ' + props.record}
          </Text>
          {small ? null : <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(dim), lineLimit(1)]}>{props.standing}</Text>}
        </VStack>
      </HStack>
      <Spacer />
      {body}
    </VStack>
  );
};

export default createWidget<TeamFormProps>('TeamFormWidget', TeamFormWidget, SAMPLE_FORM);
