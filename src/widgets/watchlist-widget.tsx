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
  minimumScaleFactor,
  padding,
  resizable,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type WatchlistGameProps = {
  away: string;
  home: string;
  /** Logo file URIs inside the shared widget folder; empty when one couldn't be downloaded (the abbreviation shows instead). */
  awayLogo: string;
  homeLogo: string;
  /** Empty before tip-off. */
  awayScore: string;
  homeScore: string;
  /** "Q4 3:12", "Final", or the start time ("Thu 7:00 PM"). */
  status: string;
  live: boolean;
};

export type WatchlistPlayerProps = {
  name: string;
  /** Headshot file URI inside the shared widget folder; empty when it couldn't be downloaded. */
  avatar: string;
  /** "28 pts · 7 reb · 5 ast" from his latest game. */
  line: string;
  /** "W 112-104" for that game. */
  result: string;
};

export type WatchlistProps = {
  games: WatchlistGameProps[];
  players: WatchlistPlayerProps[];
};

export const SAMPLE_WATCHLIST: WatchlistProps = {
  games: [
    { away: 'DEN', home: 'LAL', awayLogo: '', homeLogo: '', awayScore: '98', homeScore: '101', status: 'Q4 3:12', live: true },
    { away: 'BOS', home: 'MIA', awayLogo: '', homeLogo: '', awayScore: '', homeScore: '', status: 'Thu 7:30 PM', live: false },
    { away: 'PHI', home: 'DET', awayLogo: '', homeLogo: '', awayScore: '104', homeScore: '108', status: 'Final', live: false },
  ],
  players: [
    { name: 'Luka Doncic', avatar: '', line: '41 pts · 10 reb · 8 ast', result: 'W 127-120' },
    { name: 'Nikola Jokic', avatar: '', line: '28 pts · 14 reb · 9 ast', result: 'L 98-101' },
    { name: 'Stephen Curry', avatar: '', line: '36 pts · 6 reb · 6 ast', result: 'W 118-110' },
  ],
};

/**
 * Home-screen widget: the games and players you starred. Medium: games on the left, players on the right. Large: both in one
 * column, with more rows.
 * Runs in WidgetKit's own runtime: pure, synchronous, and nothing outside this function but the imports above.
 */
const WatchlistWidget = (props: WatchlistProps, environment: WidgetEnvironment) => {
  'widget';
  const large = environment.widgetFamily === 'systemLarge';
  const white = '#F2F4F7';
  const dim = '#F2F4F7A6';
  const gold = '#FBBF24';
  const red = '#F87171';
  const rows = large ? 4 : 3;
  const games = props.games.slice(0, rows);
  const players = props.players.slice(0, rows);
  const surface = containerBackground(
    { type: 'linearGradient', colors: ['#16273F', '#0D1B2E'], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    'widget',
  );

  const title = (text: string) => (
    <Text modifiers={[font({ size: 10, weight: 'heavy' }), kerning(1.2), foregroundStyle(gold)]}>{text}</Text>
  );

  // A team's logo, or its abbreviation when the logo isn't available.
  const crest = (file: string, abbr: string, size: number) =>
    file !== '' ? (
      <Image uiImage={file} modifiers={[resizable(), aspectRatio({ contentMode: 'fit' }), frame({ width: size, height: size })]} />
    ) : (
      <Text modifiers={[font({ size: 11, weight: 'heavy' }), foregroundStyle(white), lineLimit(1), minimumScaleFactor(0.6), frame({ width: size, height: size })]}>
        {abbr}
      </Text>
    );

  // The headshot in a circle (cropped from the top, so the face stays), or the initial when there is none.
  const face = (file: string, name: string, size: number) =>
    file !== '' ? (
      <Image
        uiImage={file}
        modifiers={[resizable(), aspectRatio({ contentMode: 'fill' }), frame({ width: size, height: size, alignment: 'top' }), background('#FFFFFF1F'), clipShape('circle')]}
      />
    ) : (
      <Text modifiers={[font({ size: size * 0.4, weight: 'heavy' }), foregroundStyle(white), frame({ width: size, height: size }), background('#FFFFFF1F'), clipShape('circle')]}>
        {name.charAt(0)}
      </Text>
    );

  // Keys must differ between the two lists: they share a parent, and equal keys make one row stand in for the other.
  const gameRow = (g: WatchlistGameProps, i: number) => {
    // A finished game dims the loser's score, so the result reads at a glance.
    const done = g.status === 'Final';
    const awayWon = Number(g.awayScore) > Number(g.homeScore);
    const homeWon = Number(g.homeScore) > Number(g.awayScore);
    const score = (value: string, lost: boolean) => (
      <Text modifiers={[font({ size: 16, weight: 'heavy' }), foregroundStyle(done && lost ? dim : white)]}>{value}</Text>
    );
    return (
      <VStack key={'game' + i} alignment="leading" spacing={1}>
        {/* The two sides sit together around a dash, centred in the row, not pushed to its edges. */}
        <HStack spacing={6}>
          <Spacer />
          {crest(g.awayLogo, g.away, 22)}
          {score(g.awayScore, homeWon)}
          <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(dim)]}>{g.awayScore === '' ? '@' : '–'}</Text>
          {score(g.homeScore, awayWon)}
          {crest(g.homeLogo, g.home, 22)}
          <Spacer />
        </HStack>
        <HStack>
          <Spacer />
          <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(g.live ? red : dim), lineLimit(1)]}>
            {g.awayScore === '' ? g.away + ' @ ' + g.home + ' · ' + g.status : g.status}
          </Text>
          <Spacer />
        </HStack>
      </VStack>
    );
  };

  const playerRow = (p: WatchlistPlayerProps, i: number) => (
    <HStack key={'player' + i} spacing={8}>
      {face(p.avatar, p.name, 30)}
      <VStack alignment="leading" spacing={1}>
        <Text modifiers={[font({ size: 13, weight: 'heavy' }), foregroundStyle(white), lineLimit(1)]}>{p.name}</Text>
        <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(dim), lineLimit(1), minimumScaleFactor(0.7)]}>
          {p.result !== '' ? p.line + ' · ' + p.result : p.line}
        </Text>
      </VStack>
    </HStack>
  );

  const empty = games.length === 0 && players.length === 0;
  if (empty) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 2 }), surface, widgetURL('courtside://watchlist')]}>
        {title('★ WATCHLIST')}
        <Spacer />
        <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(white)]}>Nothing starred yet</Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(dim)]}>Star a player or a game in the app to follow it here.</Text>
        <Spacer />
      </VStack>
    );
  }

  if (large) {
    return (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 2 }), surface, widgetURL('courtside://watchlist')]}>
        {title('★ WATCHLIST')}
        {games.length > 0 ? title('GAMES') : null}
        {games.map(gameRow)}
        {players.length > 0 ? title('PLAYERS') : null}
        {players.map(playerRow)}
        <Spacer />
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 2 }), surface, widgetURL('courtside://watchlist')]}>
      {title('★ WATCHLIST')}
      <HStack alignment="top" spacing={16}>
        <VStack alignment="leading" spacing={7}>
          {games.map(gameRow)}
        </VStack>
        <VStack alignment="leading" spacing={7}>
          {players.map(playerRow)}
        </VStack>
      </HStack>
      <Spacer />
    </VStack>
  );
};

export default createWidget<WatchlistProps>('WatchlistWidget', WatchlistWidget, SAMPLE_WATCHLIST);
