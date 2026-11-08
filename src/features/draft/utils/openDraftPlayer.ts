import { findPlayerByName, type NbaDraftPlayer } from '@/lib/espn';
import { openDetail } from '@/navigation';

/**
 * Opens a drafted player's page. From 2019 ESPN's record carries his NBA id (`knownId` is the one already found by name, if any); before
 * that it only has a college page id, so the page is found by his name in ESPN's player search (an exact name, or nothing opens: a
 * draftee who never played is not on ESPN's NBA pages).
 */
export async function openDraftPlayer(player: NbaDraftPlayer, knownId?: string): Promise<void> {
  let id = knownId ?? player.nbaId;
  if (!id) {
    try {
      id = (await findPlayerByName(player.name))?.id;
    } catch {
      return;
    }
  }
  if (id) openDetail({ pathname: '/player/[id]', params: { id, teamId: '' } });
}
