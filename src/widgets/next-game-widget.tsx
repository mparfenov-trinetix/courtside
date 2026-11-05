import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  minimumScaleFactor,
  multilineTextAlignment,
  padding,
  resizable,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

/** Everything the widget shows, already formatted by the app: the widget itself can't fetch or compute. */
export type NextGameProps = {
  /** The selected team. */
  teamAbbr: string;
  teamName: string;
  record: string;
  /** The app's own look: dark team-tinted background (top-left to bottom-right) and the team's accent. */
  bg: string;
  bg2: string;
  accent: string;
  /** Logo file URIs inside the shared widget folder; empty when a logo couldn't be downloaded. */
  logo: string;
  oppLogo: string;
  /** The next fixture; `iso` is empty when the team has no game scheduled. */
  oppAbbr: string;
  oppName: string;
  home: boolean;
  iso: string;
  /** "Thu, Nov 5" in the device's language. */
  day: string;
  /** Between tip-off and the end of the game: the widget turns red and sends you to the live game. */
  live: boolean;
  gameId: string;
  /** For the footer: stage like "NBA Cup" or "Round 1", when there is one. */
  tag: string;
  /** The score while the game is on (the selected team's first, as the logos are) and its clock ("4:03 - 3rd"); empty before the app has one. */
  myScore: string;
  oppScore: string;
  clock: string;
  /** Only the gallery sample sets these: fixed text in place of the live clock, which a sample can't have. */
  timeText?: string;
  countdownText?: string;
};

export const EMPTY_PROPS: NextGameProps = {
  teamAbbr: 'NBA',
  teamName: 'Courtside',
  record: '',
  bg: '#0D1B2E',
  bg2: '#16273F',
  accent: '#F2F4F7',
  logo: '',
  oppLogo: '',
  oppAbbr: '',
  oppName: '',
  home: true,
  iso: '',
  day: '',
  live: false,
  gameId: '',
  tag: '',
  myScore: '',
  oppScore: '',
  clock: '',
};

/**
 * What the widget gallery and a freshly installed (never opened) widget show: a plausible fixture instead of an empty card.
 * The app replaces it with the real timeline as soon as it runs.
 */
export const SAMPLE_PROPS: NextGameProps = {
  teamAbbr: 'DEN',
  teamName: 'Denver Nuggets',
  record: '4-2',
  bg: '#0D1B2E',
  bg2: '#1B3A5F',
  accent: '#FEC524',
  logo: '',
  oppLogo: '',
  oppAbbr: 'TOR',
  oppName: 'Toronto Raptors',
  home: true,
  iso: '2030-01-01T02:00:00Z',
  day: 'THU, NOV 5',
  live: false,
  gameId: '',
  tag: '',
  myScore: '',
  oppScore: '',
  clock: '',
  timeText: '7:00 PM',
  countdownText: 'in 1 day, 6 hr',
};

/**
 * Home-screen widget: the selected team's next fixture.
 *
 * Runs in WidgetKit's own runtime: it must be pure, synchronous, and reference nothing outside this function
 * (no imports at runtime beyond the components above, no module-level constants, no hooks).
 */
const NextGameWidget = (props: NextGameProps, environment: WidgetEnvironment) => {
  'widget';
  const small = environment.widgetFamily === 'systemSmall';
  const white = '#F2F4F7';
  const dim = '#F2F4F7A6';
  const has = props.iso !== '';
  // A game that is on, with the score the app last saw: the right side shows it instead of the tip-off time.
  const scored = props.live && props.myScore !== '';
  const when = has ? new Date(props.iso) : undefined;
  const url = has ? 'courtside://game/' + props.gameId : 'courtside://';
  const background = containerBackground(
    { type: 'linearGradient', colors: [props.bg2, props.bg], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    'widget',
  );

  // A team's logo, or its abbreviation when the logo isn't available.
  const crest = (file: string, abbr: string, size: number) =>
    file !== '' ? (
      <Image uiImage={file} modifiers={[resizable(), aspectRatio({ contentMode: 'fit' }), frame({ width: size, height: size })]} />
    ) : (
      <Text modifiers={[font({ size: size * 0.42, weight: 'heavy' }), foregroundStyle(white), frame({ width: size, height: size })]}>{abbr}</Text>
    );

  const red = '#F87171';
  const header = (
    <HStack spacing={5}>
      {props.live ? <Text modifiers={[font({ size: 8 }), foregroundStyle(red)]}>●</Text> : null}
      <Text modifiers={[font({ size: 10, weight: 'heavy' }), kerning(1.2), foregroundStyle(props.live ? red : props.accent)]}>
        {props.live ? 'LIVE NOW' : 'NEXT GAME'}
      </Text>
      <Spacer />
      {props.tag !== '' ? (
        <Text modifiers={[font({ size: 10, weight: 'bold' }), kerning(0.6), foregroundStyle(dim)]}>{props.tag.toUpperCase()}</Text>
      ) : null}
    </HStack>
  );

  if (!has || !when) {
    return (
      <VStack alignment="leading" spacing={4} modifiers={[padding({ all: 2 }), background, widgetURL(url)]}>
        {header}
        <Spacer />
        <HStack spacing={10}>
          {crest(props.logo, props.teamAbbr, 44)}
          <VStack alignment="leading" spacing={1}>
            <Text modifiers={[font({ size: 17, weight: 'heavy' }), foregroundStyle(white), lineLimit(1)]}>{props.teamName}</Text>
            <Text modifiers={[font({ size: 12 }), foregroundStyle(dim)]}>No game scheduled</Text>
          </VStack>
        </HStack>
        <Spacer />
      </VStack>
    );
  }

  const team = (file: string, abbr: string, sub: string, size: number) => (
    <VStack spacing={2}>
      {crest(file, abbr, size)}
      <Text modifiers={[font({ size: 13, weight: 'heavy' }), foregroundStyle(white), lineLimit(1)]}>{abbr}</Text>
      <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(dim), lineLimit(1)]}>{sub !== '' ? sub : ' '}</Text>
    </VStack>
  );
  const versus = <Text modifiers={[font({ size: 11, weight: 'heavy' }), kerning(0.8), foregroundStyle(dim)]}>{props.home ? 'VS' : '@'}</Text>;

  if (small) {
    return (
      <VStack alignment="leading" spacing={0} modifiers={[padding({ all: 2 }), background, widgetURL(url)]}>
        {header}
        <Spacer />
        <HStack spacing={6}>
          {team(props.logo, props.teamAbbr, props.record, 38)}
          {versus}
          {team(props.oppLogo, props.oppAbbr, props.home ? 'Away' : 'Home', 38)}
        </HStack>
        <Spacer />
        <Text modifiers={[font({ size: 11, weight: 'bold' }), kerning(0.6), foregroundStyle(scored ? red : dim), lineLimit(1), minimumScaleFactor(0.7)]}>
          {scored ? props.clock.toUpperCase() : props.live ? 'TIP-OFF' : props.day.toUpperCase()}
        </Text>
        {scored ? (
          <Text modifiers={[font({ size: 22, weight: 'heavy' }), foregroundStyle(white), lineLimit(1), minimumScaleFactor(0.6)]}>
            {props.myScore + ' – ' + props.oppScore}
          </Text>
        ) : props.timeText ? (
          <Text modifiers={[font({ size: 20, weight: 'heavy' }), foregroundStyle(props.accent)]}>{props.timeText}</Text>
        ) : (
          <Text modifiers={[font({ size: 20, weight: 'heavy' }), foregroundStyle(props.live ? red : props.accent)]} date={when} dateStyle="time" />
        )}
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={0} modifiers={[padding({ all: 2 }), background, widgetURL(url)]}>
      {header}
      <Spacer />
      <HStack spacing={14}>
        {team(props.logo, props.teamAbbr, props.record, 52)}
        {versus}
        {team(props.oppLogo, props.oppAbbr, props.home ? 'Away' : 'Home', 52)}
        <Spacer />
        <VStack alignment="trailing" spacing={2}>
          <Text modifiers={[font({ size: 11, weight: 'bold' }), kerning(0.8), foregroundStyle(scored ? red : dim), lineLimit(1)]}>
            {scored ? props.clock.toUpperCase() : props.live ? 'TIP-OFF' : props.day.toUpperCase()}
          </Text>
          {scored ? (
            <Text modifiers={[font({ size: 34, weight: 'heavy' }), foregroundStyle(white), lineLimit(1), minimumScaleFactor(0.6)]}>
              {props.myScore + ' – ' + props.oppScore}
            </Text>
          ) : props.timeText ? (
            <Text modifiers={[font({ size: 30, weight: 'heavy' }), foregroundStyle(props.accent)]}>{props.timeText}</Text>
          ) : (
            <Text modifiers={[font({ size: 30, weight: 'heavy' }), foregroundStyle(props.live ? red : props.accent)]} date={when} dateStyle="time" />
          )}
          {props.live ? (
            <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(dim)]}>{scored ? 'Tap for the game' : 'Tap for the live score'}</Text>
          ) : props.countdownText ? (
            <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(dim), lineLimit(1)]}>{props.countdownText}</Text>
          ) : (
            <Text
              modifiers={[
                font({ size: 11, weight: 'semibold' }),
                foregroundStyle(dim),
                lineLimit(1),
                multilineTextAlignment('trailing'),
                frame({ maxWidth: 120, alignment: 'trailing' }),
              ]}
              date={when}
              dateStyle="relative"
            />
          )}
        </VStack>
      </HStack>
      <Spacer />
    </VStack>
  );
};

export default createWidget<NextGameProps>('NextGameWidget', NextGameWidget, SAMPLE_PROPS);
