import { ViewCardsIcon, ViewInsightsIcon, ViewListIcon, type SheetOption } from '@/components';

export type RosterMode = 'list' | 'cards' | 'insights';

/** The Teams screen's three views, in the order the sheet lists them. */
export const ROSTER_MODES: SheetOption<RosterMode>[] = [
  { key: 'list', label: 'List', hint: 'Every player in a row', Icon: ViewListIcon },
  { key: 'cards', label: 'Cards', hint: 'Swipe through a detailed card for each player', Icon: ViewCardsIcon },
  { key: 'insights', label: 'Insights', hint: 'Starting fives, rankings, the makeup of the roster, two players side by side', Icon: ViewInsightsIcon },
];
