import { useLiveActivity } from './useLiveActivity';
import { useWatchlistWidgetSync } from './useWatchlistWidgetSync';
import { useWidgetSync } from './useWidgetSync';

/** Renders nothing; mounted once under the providers so the widgets and the Live Activity stay current. */
export function WidgetSync() {
  useWidgetSync();
  useLiveActivity();
  useWatchlistWidgetSync();
  return null;
}
