import { TeamHome } from '@/components/team-home';
import { useTeamStore } from '@/state/team-store';

export default function Home() {
  const { currentTeamId } = useTeamStore();
  return <TeamHome teamId={currentTeamId} />;
}
