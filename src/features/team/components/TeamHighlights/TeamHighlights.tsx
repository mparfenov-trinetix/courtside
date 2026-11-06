import { Highlights } from '@/components';
import { useAfterSettle, useGameVideos } from '@/hooks';
import type { Game } from '@/lib/espn';

/** How many of the team's latest finished games are looked at. */
const RECENT = 4;

/**
 * The full-game highlights of the team's latest games, newest first. Placeholders hold the row's place while the clips are read (the
 * wait is the settle pause plus a few requests), so nothing below it moves when they arrive. Hidden when there is no finished game.
 */
export function TeamHighlights({ games, accent }: { games: Game[]; accent: string }) {
  // After the page has settled: a few requests and parses that would otherwise land on the first frames and the first scroll.
  const ready = useAfterSettle();
  const { perGame, pending } = useGameVideos(games.slice(0, RECENT).map((g) => g.id), ready);
  const clips = perGame.flatMap((videos) => videos.filter((v) => v.fullGame).slice(0, 1));
  return <Highlights title="Team highlights" videos={clips} accent={accent} loading={games.length > 0 && (!ready || pending)} />;
}
