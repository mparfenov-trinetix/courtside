import type { Game, TeamDetail } from '@/lib/espn';
import { FORM_GAMES, GAME_LENGTH_MS } from './constants';
import { streakOf } from './team-form';
import type { LockScreenProps, TeamLike } from './types';

/** Pure: what the Lock Screen widget needs: record and streak, the last five results, the latest score and the next game. */
export function buildLockProps(team: TeamLike, detail: Pick<TeamDetail, 'record'> | undefined, schedule: Game[], now: Date = new Date()): LockScreenProps {
  const played = schedule
    .filter((g) => g.completed && g.result && typeof g.teamScore === 'number' && typeof g.opponentScore === 'number')
    .sort((a, b) => b.date.localeCompare(a.date));
  const next = schedule
    .filter((g) => !g.completed && g.date && Date.parse(g.date) + GAME_LENGTH_MS > now.getTime())
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const latest = played[0];
  const tip = next ? new Date(next.date) : undefined;
  return {
    teamAbbr: team.abbreviation,
    record: detail?.record ?? '',
    streak: streakOf(played.map((g) => g.result as 'W' | 'L')),
    form: played
      .slice(0, FORM_GAMES)
      .reverse()
      .map((g) => g.result as string),
    last: latest ? `${latest.result} ${latest.teamScore}-${latest.opponentScore} ${latest.home ? 'vs' : '@'} ${latest.opponentAbbr}` : '',
    oppAbbr: next?.opponentAbbr ?? '',
    home: next?.home ?? true,
    when: tip ? `${tip.toLocaleDateString(undefined, { weekday: 'short' })} ${tip.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : '',
    time: tip ? tip.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '',
    gameId: next?.id ?? '',
  };
}
