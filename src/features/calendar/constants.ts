import type { ComponentType } from 'react';

import { ViewAgendaIcon, ViewDayIcon, ViewMonthIcon } from '@/components';

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const PAST = 30;
/** The floating Today pill: its height and its distance above the safe area, and the room the day list leaves under its last card. */
export const TODAY_PILL_HEIGHT = 36;
export const TODAY_PILL_BOTTOM = 14;
export const TODAY_PILL_CLEARANCE = TODAY_PILL_BOTTOM + TODAY_PILL_HEIGHT + 22;
export const FUTURE = 35;
export const PILL = 52;
export const PILL_GAP = 6;
export const PILL_HEIGHT = 68;
export const STRIP_PADDING = 16;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];


export type CalendarMode = 'day' | 'month' | 'agenda';

/** The calendar's three views, in the order the content slides between them. */
export const CALENDAR_MODES: { key: CalendarMode; label: string; Icon: ComponentType<{ color: string; size?: number }> }[] = [
  { key: 'day', label: 'Day', Icon: ViewDayIcon },
  { key: 'month', label: 'Month', Icon: ViewMonthIcon },
  { key: 'agenda', label: 'Agenda', Icon: ViewAgendaIcon },
];
