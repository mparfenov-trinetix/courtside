import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { palette } from '@/lib/theme';

/**
 * Pull-to-refresh for a screen. Pass the query keys to refetch (prefix match, so
 * `['team']` covers `['team', id]`). The spinner is driven by the pull itself, not
 * by the query's fetching flag, so background polling of live games never flashes it.
 */
export function useRefresh(keys: readonly QueryKey[]) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all(keys.map((queryKey) => queryClient.refetchQueries({ queryKey })))
      .then(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
      .finally(() => setRefreshing(false));
  };

  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.muted} />;
}
