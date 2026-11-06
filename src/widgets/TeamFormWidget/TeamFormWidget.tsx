import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  background,
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  padding,
  resizable,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { FormGameProps, TeamFormProps } from '@/lib/widgets';
import { SAMPLE_FORM } from './constants';

/**
 * Home-screen widget: the selected team's last five results with its record and standing, and its best player (ESPN's own rating:
 * his points, rebounds and assists per game): at the top right on medium, in a row of his own on small. The streak has no badge of its
 * own: the last results below show it.
 * Runs in WidgetKit's own runtime: pure, synchronous, and nothing outside this function but the imports above.
 */
const TeamFormLayout = (props: TeamFormProps, environment: WidgetEnvironment) => {
  'widget';
  const small = environment.widgetFamily === 'systemSmall';
  const white = '#F2F4F7';
  const dim = '#F2F4F7A6';
  const green = '#34D399';
  const red = '#F87171';
  const hasStar = props.starName !== '';
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

  // The headshot in a circle (cropped from the top, so the face stays), or the initial when there is none.
  const face = (size: number) =>
    props.starAvatar !== '' ? (
      <Image
        uiImage={props.starAvatar}
        modifiers={[resizable(), aspectRatio({ contentMode: 'fill' }), frame({ width: size, height: size, alignment: 'top' }), background('#FFFFFF1F'), clipShape('circle')]}
      />
    ) : (
      <Text modifiers={[font({ size: size * 0.4, weight: 'heavy' }), foregroundStyle(white), frame({ width: size, height: size }), background('#FFFFFF1F'), clipShape('circle')]}>
        {props.starName.charAt(0)}
      </Text>
    );

  const dotSize = small ? 26 : 34;
  const dot = (g: FormGameProps, i: number) => (
    <VStack key={i} spacing={3}>
      <Text
        modifiers={[
          font({ size: dotSize * 0.46, weight: 'heavy' }),
          foregroundStyle(g.result === 'W' ? green : red),
          frame({ width: dotSize, height: dotSize }),
          background(g.result === 'W' ? '#34D39933' : '#F8717133'),
          clipShape('circle'),
        ]}>
        {g.result}
      </Text>
      <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(white), lineLimit(1)]}>{(g.home ? 'vs ' : '@ ') + g.opp}</Text>
      {small ? null : <Text modifiers={[font({ size: 9, weight: 'semibold' }), foregroundStyle(dim), lineLimit(1)]}>{g.score}</Text>}
    </VStack>
  );

  const results =
    props.games.length === 0 ? (
      <Text modifiers={[font({ size: 13 }), foregroundStyle(dim)]}>No games played yet</Text>
    ) : (
      <HStack spacing={small ? 6 : 12}>{props.games.map(dot)}</HStack>
    );

  if (small) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 2 }), surface, widgetURL('courtside://')]}>
        <HStack spacing={8}>
          {crest(30)}
          <Text modifiers={[font({ size: 16, weight: 'heavy' }), foregroundStyle(white), lineLimit(1)]}>{props.teamAbbr + '  ' + props.record}</Text>
        </HStack>
        {hasStar ? (
          <HStack spacing={6}>
            {face(24)}
            <VStack alignment="leading" spacing={0}>
              <Text modifiers={[font({ size: 11, weight: 'heavy' }), foregroundStyle(white), lineLimit(1)]}>{props.starName}</Text>
              <Text modifiers={[font({ size: 9, weight: 'semibold' }), foregroundStyle(dim), lineLimit(1), minimumScaleFactor(0.7)]}>
                {props.starPpg + ' PPG · ' + props.starRpg + ' RPG'}
              </Text>
            </VStack>
          </HStack>
        ) : null}
        <Spacer />
        {results}
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 2 }), surface, widgetURL('courtside://')]}>
      <HStack spacing={10}>
        {crest(44)}
        <VStack alignment="leading" spacing={3}>
          <HStack spacing={8}>
            <Text modifiers={[font({ size: 22, weight: 'heavy' }), foregroundStyle(white), lineLimit(1)]}>{props.teamAbbr}</Text>
            <Text modifiers={[font({ size: 22, weight: 'heavy' }), foregroundStyle(dim), lineLimit(1)]}>{props.record}</Text>
          </HStack>
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(dim), lineLimit(1), minimumScaleFactor(0.8)]}>
            {props.standing !== '' ? props.standing : ' '}
          </Text>
        </VStack>
        <Spacer />
        {hasStar ? (
          <HStack spacing={6}>
            <VStack alignment="trailing" spacing={1}>
              <Text modifiers={[font({ size: 12, weight: 'heavy' }), foregroundStyle(white), lineLimit(1)]}>{props.starName}</Text>
              <Text modifiers={[font({ size: 11, weight: 'heavy' }), foregroundStyle(props.accent), lineLimit(1)]}>{props.starPpg + ' PPG'}</Text>
              <Text modifiers={[font({ size: 9, weight: 'semibold' }), foregroundStyle(dim), lineLimit(1), minimumScaleFactor(0.7)]}>
                {props.starRpg + ' RPG · ' + props.starApg + ' APG'}
              </Text>
            </VStack>
            {face(34)}
          </HStack>
        ) : null}
      </HStack>
      <Spacer />
      {results}
    </VStack>
  );
};

export const TeamFormWidget = createWidget<TeamFormProps>('TeamFormWidget', TeamFormLayout, SAMPLE_FORM);

export default TeamFormWidget;
