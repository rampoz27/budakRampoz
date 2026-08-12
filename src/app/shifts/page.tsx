import AppLayout from '@/components/AppLayout';
import ShiftsWorkspace from './components/ShiftsWorkspace';

export default function ShiftsPage() {
  return (
    <AppLayout activeRoute="/shifts">
      <ShiftsWorkspace />
    </AppLayout>
  );
}
