import { TeamHome } from '@/features/team';
import { useScreenTeamStore } from '@/state';

export function HomeScreen() {
  const currentTeamId = useScreenTeamStore((s) => s.currentTeamId);
  return <TeamHome teamId={currentTeamId} />;
}
