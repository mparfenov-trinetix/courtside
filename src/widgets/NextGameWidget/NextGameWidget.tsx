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
import type { NextGameProps } from '@/lib/widgets';
import { SAMPLE_PROPS } from './constants';

/**
 * Home-screen widget: the selected team's next fixture.
 *
 * Runs in WidgetKit's own runtime: it must be pure, synchronous, and reference nothing outside this function
 * (no imports at runtime beyond the components above, no module-level constants, no hooks).
 */
const NextGameLayout = (props: NextGameProps, environment: WidgetEnvironment) => {
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

export const NextGameWidget = createWidget<NextGameProps>('NextGameWidget', NextGameLayout, SAMPLE_PROPS);

export default NextGameWidget;
