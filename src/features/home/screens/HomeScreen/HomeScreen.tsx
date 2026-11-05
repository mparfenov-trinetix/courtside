import { TeamHome } from '@/features/team';
import { useTeamStore } from '@/state';

export function HomeScreen() {
  const currentTeamId = useTeamStore((s) => s.currentTeamId);
  return <TeamHome teamId={currentTeamId} />;
}
