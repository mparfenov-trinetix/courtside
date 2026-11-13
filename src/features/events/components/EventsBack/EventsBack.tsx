import { router } from 'expo-router';

import { ArrowLeftIcon, IconButton } from '@/components';
import { palette } from '@/lib/theme';

/** The way back to the Events hub, beside the menu button of each event screen (the Cup, the All-Star Weekend, the Draft, the Awards): they are drawer screens, so there is no back arrow of their own. */
export function EventsBack() {
  return (
    <IconButton label="Back to Events" onPress={() => router.navigate('/events')}>
      <ArrowLeftIcon color={palette.chalk} />
    </IconButton>
  );
}
