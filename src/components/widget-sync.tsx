import { useWidgetSync } from '@/widgets/use-widget-sync';

/** Renders nothing; mounted once under the providers so the widget stays current. */
export function WidgetSync() {
  useWidgetSync();
  return null;
}
