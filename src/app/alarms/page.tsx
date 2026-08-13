import AppLayout from '@/components/AppLayout';
import AlarmsWorkspace from './components/AlarmsWorkspace';

export default function AlarmsPage() {
  return (
    <AppLayout activeRoute="/alarms">
      <AlarmsWorkspace />
    </AppLayout>
  );
}
