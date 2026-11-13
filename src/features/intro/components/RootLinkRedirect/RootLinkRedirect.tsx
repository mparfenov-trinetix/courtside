import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';

import { useTeamStore } from '@/state';

/**
 * A link to the bare app (`courtside://`, which the Team form and Upcoming games widgets used to carry) lands on the route `/`, which is only
 * the blank page under the intro. On a launch the intro covers it and goes on to the home card, but when the app is already running the
 * intro is over and nothing moves on: the person gets an empty screen. So once the intro is gone, a visit to `/` goes where the intro would
 * have: the home card, or the team picker if no team was ever chosen.
 */
export function RootLinkRedirect({ introOver }: { introOver: boolean }) {
  const pathname = usePathname();
  const { hydrated, favoriteTeamId } = useTeamStore();
  useEffect(() => {
    if (!introOver || pathname !== '/' || !hydrated) return;
    router.replace(favoriteTeamId ? '/home' : '/onboarding');
  }, [introOver, pathname, hydrated, favoriteTeamId]);
  return null;
}
