import { OptionSheet } from '@/components';
import { CALENDAR_MODES, type CalendarMode } from '../../constants';

/** "Calendar view": Day, Month or Agenda, in the shared option sheet. */
export function ViewSheet({
  visible,
  mode,
  onPick,
  onClose,
}: {
  visible: boolean;
  mode: CalendarMode;
  onPick: (mode: CalendarMode) => void;
  onClose: () => void;
}) {
  return <OptionSheet visible={visible} title="Calendar view" options={CALENDAR_MODES} value={mode} onPick={onPick} onClose={onClose} />;
}
