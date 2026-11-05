import { useLiveActivity } from './use-live-activity';
import { useWatchlistWidgetSync } from './use-watchlist-widget-sync';
import { useWidgetSync } from './use-widget-sync';

/** Renders nothing; mounted once under the providers so the widgets and the Live Activity stay current. */
export function WidgetSync() {
  useWidgetSync();
  useLiveActivity();
  useWatchlistWidgetSync();
  return null;
}
