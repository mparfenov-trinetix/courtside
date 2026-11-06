import { HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  aspectRatio,
  background,
  clipShape,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  minimumScaleFactor,
  padding,
  resizable,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

import type { LiveGameProps } from '@/lib/widgets';

/**
 * The live score of one game, on the lock screen and in the Dynamic Island. The banner is split in the two teams' own
 * colors, each side with its crest and a big score (the leader's brighter); the clock sits between them with a "DET TO"
 * pill during a timeout. A light gold "B" on a crest means that team is in the bonus.
 * Runs in the activity's own runtime: pure, synchronous, and nothing outside this function but the imports above.
 */
const LiveGameLayout = (props: LiveGameProps, environment: LiveActivityEnvironment) => {
  'widget';
  const white = '#F5F7FA';
  const dim = '#F5F7FA8C';
  const amber = '#FBBF24';
  const lightGold = '#FDE68A';
  const red = '#FF6B6B';
  const stale = environment.isStale === true && !props.final;

  const crest = (file: string, abbr: string, size: number) =>
    file !== '' ? (
      <Image uiImage={file} modifiers={[resizable(), aspectRatio({ contentMode: 'fit' }), frame({ width: size, height: size })]} />
    ) : (
      <Text modifiers={[font({ size: size * 0.38, weight: 'heavy' }), foregroundStyle(white), frame({ width: size, height: size })]}>{abbr}</Text>
    );

  // The crest with a small gold "B" at its bottom left when the team is in the bonus.
  const mark = (file: string, abbr: string, size: number, bonus: boolean) =>
    bonus ? (
      <ZStack alignment="bottomLeading">
        {crest(file, abbr, size)}
        <Text
          modifiers={[
            font({ size: size * 0.26, weight: 'semibold' }),
            foregroundStyle('#5B4300'),
            frame({ width: size * 0.32, height: size * 0.32 }),
            background(lightGold),
            clipShape('circle'),
          ]}>
          B
        </Text>
      </ZStack>
    ) : (
      crest(file, abbr, size)
    );

  const score = (value: string, leads: boolean, size: number) => (
    // A three-digit score (100+) must shrink to fit the half it sits in, not be cut to "1…".
    <Text modifiers={[font({ size, weight: 'heavy' }), foregroundStyle(leads || props.final ? white : dim), lineLimit(1), minimumScaleFactor(0.5)]}>
      {value}
    </Text>
  );

  const name = (abbr: string, color: string, size: number) => (
    <Text modifiers={[font({ size, weight: 'heavy' }), kerning(0.5), foregroundStyle(color)]}>{abbr}</Text>
  );

  const clock = (
    <Text modifiers={[font({ size: 13, weight: 'heavy' }), foregroundStyle(props.final || stale ? dim : red), lineLimit(1)]}>
      {props.final ? 'FINAL' : stale ? props.status + ' · paused' : props.status}
    </Text>
  );

  const timeout =
    props.timeout !== '' && !props.final ? (
      <Text
        modifiers={[
          font({ size: 10, weight: 'heavy' }),
          kerning(0.6),
          foregroundStyle(amber),
          padding({ horizontal: 9, vertical: 3 }),
          background('#FBBF2433'),
          clipShape('capsule'),
        ]}>
        {props.timeout}
      </Text>
    ) : null;

  const middle = (
    <VStack spacing={5}>
      {clock}
      {timeout}
    </VStack>
  );

  // One team: crest, name and a big score. `leading` puts the crest on the outer edge.
  const side = (abbr: string, file: string, value: string, leads: boolean, bonus: boolean, text: string, size: number, leading: boolean) => (
    <HStack spacing={10}>
      {leading ? mark(file, abbr, size, bonus) : null}
      <VStack spacing={1} alignment={leading ? 'leading' : 'trailing'}>
        {name(abbr, text, 12)}
        {score(value, leads, size * 0.8)}
      </VStack>
      {leading ? null : mark(file, abbr, size, bonus)}
    </HStack>
  );

  const away = (size: number) => side(props.awayAbbr, props.awayLogo, props.awayScore, props.awayLeads, props.awayBonus, props.awayText, size, true);
  const home = (size: number) => side(props.homeAbbr, props.homeLogo, props.homeScore, props.homeLeads, props.homeBonus, props.homeText, size, false);

  return {
    // Two halves in the teams' colors with the clock in the middle.
    banner: (
      <HStack spacing={0} modifiers={[activityBackgroundTint(props.awayBg)]}>
        <HStack modifiers={[padding({ horizontal: 16, vertical: 14 }), background(props.awayBg)]}>
          {away(52)}
          <Spacer />
        </HStack>
        <VStack modifiers={[padding({ horizontal: 6, vertical: 14 }), background('#0B0F17')]}>{middle}</VStack>
        <HStack modifiers={[padding({ horizontal: 16, vertical: 14 }), background(props.homeBg)]}>
          <Spacer />
          {home(52)}
        </HStack>
      </HStack>
    ),
    compactLeading: (
      <HStack spacing={4}>
        {name(props.awayAbbr, props.awayText, 12)}
        {score(props.awayScore, props.awayLeads, 15)}
      </HStack>
    ),
    compactTrailing: (
      <HStack spacing={4}>
        {score(props.homeScore, props.homeLeads, 15)}
        {name(props.homeAbbr, props.homeText, 12)}
      </HStack>
    ),
    // Smallest form, shared with another activity: the leading team's mark (or the home team's when level).
    minimal: props.awayLeads ? crest(props.awayLogo, props.awayAbbr, 24) : crest(props.homeLogo, props.homeAbbr, 24),
    expandedLeading: (
      <HStack modifiers={[padding({ all: 8 }), background(props.awayBg), clipShape('roundedRectangle', 18)]}>{away(44)}</HStack>
    ),
    expandedTrailing: (
      <HStack modifiers={[padding({ all: 8 }), background(props.homeBg), clipShape('roundedRectangle', 18)]}>{home(44)}</HStack>
    ),
    expandedCenter: middle,
  };
};

export const LiveGameActivity = createLiveActivity<LiveGameProps>('LiveGameActivity', LiveGameLayout);

export default LiveGameActivity;
