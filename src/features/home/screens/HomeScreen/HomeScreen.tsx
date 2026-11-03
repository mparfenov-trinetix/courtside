import { TeamHome } from '@/features/team';
import { useTeamStore } from '@/state';

export function HomeScreen() {
  const { currentTeamId } = useTeamStore();
  return <TeamHome teamId={currentTeamId} />;
}
