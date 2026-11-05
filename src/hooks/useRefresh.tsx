import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { palette } from '@/lib/theme';

/** Refetches the given keys (prefix match, so `['team']` covers `['team', id]`) and tracks the pull's own spinner. */
function useRefreshing(keys: readonly QueryKey[], minMs = 0) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // `minMs` keeps the spinner up at least that long, so a fast refresh is still seen.
    Promise.all([...keys.map((queryKey) => queryClient.refetchQueries({ queryKey })), new Promise((resolve) => setTimeout(resolve, minMs))])
      .then(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
      .finally(() => setRefreshing(false));
  };

  return { refreshing, onRefresh };
}

/**
 * Pull-to-refresh for a screen. Pass the query keys to refetch (prefix match, so
 * `['team']` covers `['team', id]`). The spinner is driven by the pull itself, not
 * by the query's fetching flag, so background polling of live games never flashes it.
 *
 * Pass `enabled: false` for data that can no longer change (a finished game, a past season):
 * no control is returned, so the scroll view has no pull gesture at all.
 */
export function useRefresh(keys: readonly QueryKey[], enabled = true) {
  const { refreshing, onRefresh } = useRefreshing(keys);
  if (!enabled) return undefined;
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.muted} />;
}

/**
 * Refreshing without the native control, for a screen that triggers it itself (here: letting go of a far enough pull)
 * and draws its own feedback from `refreshing`. `minMs` is how long that feedback stays up at least, however quickly
 * the data comes back. Calling `refresh` while one is running does nothing.
 */
export function useManualRefresh(keys: readonly QueryKey[], minMs = 0) {
  const { refreshing, onRefresh } = useRefreshing(keys, minMs);
  const refresh = () => {
    if (!refreshing) onRefresh();
  };
  return { refreshing, refresh };
}
