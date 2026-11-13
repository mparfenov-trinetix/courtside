import { AroundScreen } from '@/features/around';

// The League wire is the injuries and moves panes of Around the league; the old route shows the injuries.
export default function Wire() {
  return <AroundScreen pane="injuries" />;
}
