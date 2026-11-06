import { Highlights } from '@/components';
import { useAfterSettle, useGameVideos } from '@/hooks';
import { videosAbout, type GameLogEntry } from '@/lib/espn';

/** How many of his latest games are looked at. */
const RECENT = 6;

/**
 * Clips of him from his latest games (ESPN has no per-player video feed, so each game's clips are read and the ones whose headline
 * names him are kept), newest game first. Placeholders hold the row's place while the clips are read; hidden when he has none.
 */
export function PlayerHighlights({ name, log, accent }: { name: string; log: GameLogEntry[]; accent: string }) {
  // After the page has settled: a few requests and parses that would otherwise land on the first frames and the first scroll.
  const ready = useAfterSettle();
  const { perGame, pending } = useGameVideos(log.slice(0, RECENT).map((g) => g.gameId), ready);
  const clips = perGame.flatMap((videos) => videosAbout(videos, name));
  return <Highlights title="Highlights" videos={clips} accent={accent} parentPadding={16} loading={log.length > 0 && (!ready || pending)} />;
}
