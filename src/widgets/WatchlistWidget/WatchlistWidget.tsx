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
import type { WatchlistGameProps, WatchlistPlayerProps, WatchlistProps } from '@/lib/widgets';
import { SAMPLE_WATCHLIST } from './constants';

/**
 * Home-screen widget: the games and players you starred. What it holds decides the layout, so no part of it is left empty.
 * Medium: games on the left and players on the right; only games, as game cards (like the Calendar's) across the whole width;
 * only players, one full-width column or two. Large: games (big rows, or two to a row from the fourth) with the players that still
 * fit under them; only players, each with his points, rebounds and assists in columns.
 * Runs in WidgetKit's own runtime: pure, synchronous, and nothing outside this function but the imports above.
 */
const WatchlistLayout = (props: WatchlistProps, environment: WidgetEnvironment) => {
  'widget';
  const large = environment.widgetFamily === 'systemLarge';
  const white = '#F2F4F7';
  const dim = '#F2F4F7A6';
  const gold = '#FBBF24';
  const red = '#F87171';
  const hasGames = props.games.length > 0;
  const hasPlayers = props.players.length > 0;
  const gamesOnly = hasGames && !hasPlayers;
  const playersOnly = !large && hasPlayers && !hasGames;
  const playersOnlyLarge = large && hasPlayers && !hasGames;
  const mixedLarge = large && hasGames && hasPlayers;
  const gamesWanted = props.games.slice(0, large ? 6 : 3);
  // Large with players: up to three games get big rows, four to six go two to a row, smaller. With only games, both sizes use cards.
  const grid = large && !gamesOnly && gamesWanted.length > 3;
  const logoSize = grid ? 28 : large ? 34 : 24;
  const scoreSize = grid ? 20 : large ? 26 : 17;
  const scoreWidth = grid ? 33 : large ? 50 : 29;
  // Wide enough for the "@" of a game still to come, which a narrower column cut off.
  const dashSize = large && !grid ? 16 : 12;
  const dashWidth = large && !grid ? 20 : 15;
  const sideGap = grid ? 4 : large ? 8 : 4;
  const statusSize = grid || !large ? 10 : 12;
  // A grid cell is as wide as its contents, so the two columns line up.
  const cellWidth = 2 * logoSize + 2 * scoreWidth + dashWidth + 4 * sideGap;
  // Large with both: the players come first and the games take what is left (the page does not scroll, an overfull one cuts off its top).
  // Heights in points: the title and the two headings, a player row, a game row (big or in the grid). At least one game always stays, so
  // three games and three players show two games and all three players.
  const gameHeight = grid ? 42 : 50;
  const avail = 330 - 23 - 44;
  const playersFit = Math.max(1, Math.min(6, Math.floor((avail - gameHeight + 10) / 48)));
  const playersShown = Math.min(props.players.length, playersFit);
  const left = avail - (playersShown * 48 - 10);
  const gamesFit = grid ? Math.max(1, Math.floor((left + 8) / 50)) * 2 : Math.max(1, Math.floor((left + 10) / 60));
  const games = mixedLarge ? gamesWanted.slice(0, gamesFit) : gamesWanted;
  const players = props.players.slice(0, large ? (playersOnlyLarge ? 6 : playersShown) : playersOnly ? 6 : 3);
  // Medium with only players: up to three in one full-width column, four to six in two columns.
  const columns = playersOnly && players.length > 3;
  const roomyText = large || (playersOnly && !columns);
  // Large with only players: the fewer there are, the bigger each row.
  const statRows = playersOnlyLarge || (playersOnly && !columns);
  const faceSize = statRows
    ? large
      ? players.length <= 4 ? 48 : players.length === 5 ? 42 : 38
      : players.length === 1 ? 52 : players.length === 2 ? 42 : 32
    : large ? 38 : roomyText ? 32 : 30;
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
      <Text modifiers={[font({ size: size * 0.42, weight: 'heavy' }), foregroundStyle(white), lineLimit(1), minimumScaleFactor(0.6), frame({ width: size, height: size })]}>
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
    // Each score has a column of its own (away hugs the dash from the right, home from the left), so logos and dashes line up from row to row
    // whatever the digits: centring every row by its own width pushed 107 - 103 and 117 - 116 to different places.
    const score = (value: string, lost: boolean, side: 'leading' | 'trailing') => (
      <Text
        modifiers={[
          font({ size: scoreSize, weight: 'heavy' }),
          foregroundStyle(done && lost ? dim : white),
          lineLimit(1),
          minimumScaleFactor(0.7),
          frame({ width: scoreWidth, alignment: side }),
        ]}>
        {value}
      </Text>
    );
    return (
      <VStack key={'game' + i} alignment="leading" spacing={1} modifiers={grid ? [frame({ width: cellWidth })] : []}>
        <HStack spacing={sideGap}>
          <Spacer />
          {crest(g.awayLogo, g.away, logoSize)}
          {score(g.awayScore, homeWon, 'trailing')}
          <Text modifiers={[font({ size: dashSize, weight: 'bold' }), foregroundStyle(dim), frame({ width: dashWidth })]}>
            {g.awayScore === '' ? '@' : '–'}
          </Text>
          {score(g.homeScore, awayWon, 'leading')}
          {crest(g.homeLogo, g.home, logoSize)}
          <Spacer />
        </HStack>
        <HStack>
          <Spacer />
          <Text modifiers={[font({ size: statusSize, weight: 'semibold' }), foregroundStyle(g.live ? red : dim), lineLimit(1), minimumScaleFactor(0.7)]}>
            {g.awayScore === '' ? g.away + ' @ ' + g.home + ' · ' + g.status : g.status}
          </Text>
          <Spacer />
        </HStack>
      </VStack>
    );
  };

  // The Calendar's game card, in small: a row washed with the away team's color on the left and the home team's on the right, each side
  // with its crest and abbreviation, the score and the clock (or the tip-off time) between them. With only games they fill the widget, medium
  // (one to three) or large (up to six); the fewer there are, the bigger each card.
  // Sizes by how many there are: crest, name, name width, score, score width, small text, vertical padding.
  const n = games.length;
  const sz = large
    ? n <= 2 ? [36, 16, 40, 28, 50, 12, 16] : n <= 4 ? [34, 15, 38, 26, 46, 11, 10] : [28, 14, 34, 20, 36, 9, 6]
    : n === 1 ? [34, 15, 38, 28, 46, 11, 6] : n === 2 ? [30, 15, 38, 22, 40, 10, 5] : [24, 14, 34, 16, 34, 8, 3];
  const cardGap = large ? (n <= 2 ? 12 : n <= 4 ? 8 : 6) : n >= 3 ? 4 : 8;
  const cardSpacing = large && n <= 2 ? 4 : 6;
  const cardRow = (g: WatchlistGameProps, i: number) => {
    const done = g.status === 'Final';
    const started = g.awayScore !== '';
    const awayWon = Number(g.awayScore) > Number(g.homeScore);
    const homeWon = Number(g.homeScore) > Number(g.awayScore);
    const a = g.awayColor !== '' ? g.awayColor : '#8A96A8';
    const h = g.homeColor !== '' ? g.homeColor : '#8A96A8';
    const crestSize = sz[0];
    const nameSize = sz[1];
    const nameWidth = sz[2];
    const bigScore = sz[3];
    const bigWidth = sz[4];
    const smallSize = sz[5];
    // "Thu 7:30 PM" to come: the time is the headline and the day sits under it, as on the Calendar's card.
    const space = g.status.indexOf(' ');
    const day = space > 0 ? g.status.slice(0, space) : '';
    const time = space > 0 ? g.status.slice(space + 1) : g.status;
    const score = (value: string, lost: boolean, side: 'leading' | 'trailing') => (
      <Text
        modifiers={[
          font({ size: bigScore, weight: 'heavy' }),
          foregroundStyle(done && lost ? dim : white),
          lineLimit(1),
          minimumScaleFactor(0.7),
          frame({ width: bigWidth, alignment: side }),
        ]}>
        {value}
      </Text>
    );
    const name = (abbr: string, side: 'leading' | 'trailing', lost: boolean) => (
      <Text
        modifiers={[
          font({ size: nameSize, weight: 'heavy' }),
          foregroundStyle(done && lost ? dim : white),
          lineLimit(1),
          minimumScaleFactor(0.7),
          frame({ width: nameWidth, alignment: side }),
        ]}>
        {abbr}
      </Text>
    );
    return (
      <HStack
        key={'card' + i}
        spacing={cardSpacing}
        modifiers={[
          padding({ horizontal: 10, vertical: sz[6] }),
          background({ type: 'linearGradient', colors: [a + '59', a + '0F', h + '0F', h + '59'], startPoint: { x: 0, y: 0.5 }, endPoint: { x: 1, y: 0.5 } }),
          clipShape('roundedRectangle', 12),
        ]}>
        {crest(g.awayLogo, g.away, crestSize)}
        {name(g.away, 'leading', homeWon)}
        <Spacer />
        <VStack spacing={0} modifiers={[frame({ width: 2 * bigWidth + 14 })]}>
          {started ? (
            <HStack spacing={3}>
              {score(g.awayScore, homeWon, 'trailing')}
              <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(dim), frame({ width: 8 })]}>–</Text>
              {score(g.homeScore, awayWon, 'leading')}
            </HStack>
          ) : (
            <Text modifiers={[font({ size: bigScore * 0.85, weight: 'heavy' }), foregroundStyle(white), lineLimit(1), minimumScaleFactor(0.6)]}>{time}</Text>
          )}
          <Text modifiers={[font({ size: smallSize, weight: 'semibold' }), foregroundStyle(g.live ? red : dim), lineLimit(1), minimumScaleFactor(0.7)]}>
            {started ? g.status : day !== '' ? day : ' '}
          </Text>
        </VStack>
        <Spacer />
        {name(g.home, 'trailing', awayWon)}
        {crest(g.homeLogo, g.home, crestSize)}
      </HStack>
    );
  };

  const playerRow = (p: WatchlistPlayerProps, i: number) => (
    <HStack key={'player' + i} spacing={large ? 10 : 8}>
      {face(p.avatar, p.name, faceSize)}
      <VStack alignment="leading" spacing={1}>
        <Text modifiers={[font({ size: roomyText ? 15 : 13, weight: 'heavy' }), foregroundStyle(white), lineLimit(1)]}>{p.name}</Text>
        <Text modifiers={[font({ size: roomyText ? 12 : 10, weight: 'semibold' }), foregroundStyle(dim), lineLimit(1), minimumScaleFactor(0.7)]}>
          {p.result !== '' ? p.line + ' · ' + p.result : p.line}
        </Text>
      </VStack>
    </HStack>
  );

  // With only players the whole width is used: his points, rebounds and assists of his last game each in a column.
  const statWidth = large ? 46 : 38;
  const stat = (label: string, value: string) => (
    <VStack key={label} spacing={0} modifiers={[frame({ width: statWidth })]}>
      <Text modifiers={[font({ size: large ? 22 : 18, weight: 'heavy' }), foregroundStyle(white), lineLimit(1), minimumScaleFactor(0.6)]}>{value}</Text>
      <Text modifiers={[font({ size: large ? 9 : 8, weight: 'heavy' }), kerning(0.8), foregroundStyle(dim)]}>{label}</Text>
    </VStack>
  );
  const statRow = (p: WatchlistPlayerProps, i: number) => (
    <HStack key={'stat' + i} spacing={large ? 12 : 10}>
      {face(p.avatar, p.name, faceSize)}
      <VStack alignment="leading" spacing={1}>
        <Text modifiers={[font({ size: large || players.length <= 2 ? 16 : 14, weight: 'heavy' }), foregroundStyle(white), lineLimit(1), minimumScaleFactor(0.8)]}>{p.name}</Text>
        {p.result !== '' ? <Text modifiers={[font({ size: large ? 12 : 10, weight: 'semibold' }), foregroundStyle(dim), lineLimit(1)]}>{p.result}</Text> : null}
      </VStack>
      <Spacer />
      {stat('PTS', p.pts)}
      {stat('REB', p.reb)}
      {stat('AST', p.ast)}
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

  const gameBlock = grid
    ? [0, 2, 4].filter((s) => s < games.length).map((s) => (
        <HStack key={'pair' + s} spacing={8}>
          <Spacer />
          {gameRow(games[s], s)}
          {games[s + 1] ? gameRow(games[s + 1], s + 1) : <Text modifiers={[frame({ width: cellWidth })]}>{''}</Text>}
          <Spacer />
        </HStack>
      ))
    : games.map(gameRow);

  if (playersOnlyLarge) {
    return (
      <VStack alignment="leading" spacing={players.length <= 4 ? 14 : players.length === 5 ? 10 : 8} modifiers={[padding({ all: 2 }), surface, widgetURL('courtside://watchlist')]}>
        {title('★ WATCHLIST')}
        {players.map(statRow)}
        <Spacer />
      </VStack>
    );
  }

  if (gamesOnly) {
    return (
      <VStack alignment="leading" spacing={cardGap} modifiers={[padding({ all: 2 }), surface, widgetURL('courtside://watchlist')]}>
        <Spacer />
        {games.map(cardRow)}
        <Spacer />
      </VStack>
    );
  }

  if (large) {
    return (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 2 }), surface, widgetURL('courtside://watchlist')]}>
        {title('★ WATCHLIST')}
        {games.length > 0 ? title('GAMES') : null}
        {gameBlock}
        {players.length > 0 ? title('PLAYERS') : null}
        {players.map(playerRow)}
        <Spacer />
      </VStack>
    );
  }

  // Up to three players: a row each across the whole width, no title (the rows say what they are).
  if (playersOnly && !columns) {
    return (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 2 }), surface, widgetURL('courtside://watchlist')]}>
        <Spacer />
        {players.map(statRow)}
        <Spacer />
      </VStack>
    );
  }

  if (playersOnly) {
    return (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 2 }), surface, widgetURL('courtside://watchlist')]}>
        {title('★ WATCHLIST')}
        <HStack alignment="top" spacing={16}>
          <VStack alignment="leading" spacing={7}>
            {players.slice(0, 3).map(playerRow)}
          </VStack>
          <VStack alignment="leading" spacing={7}>
            {players.slice(3).map((p, i) => playerRow(p, i + 3))}
          </VStack>
        </HStack>
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

export const WatchlistWidget = createWidget<WatchlistProps>('WatchlistWidget', WatchlistLayout, SAMPLE_WATCHLIST);

export default WatchlistWidget;
