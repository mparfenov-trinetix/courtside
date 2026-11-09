import { Redirect } from 'expo-router';

// The Rosters screen is now the Teams screen; an old link still lands on it.
export default function Roster() {
  return <Redirect href="/teams" />;
}
