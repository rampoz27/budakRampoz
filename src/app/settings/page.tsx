import AppLayout from '@/components/AppLayout';
import SettingsWorkspace from './components/SettingsWorkspace';

export default function SettingsPage() {
  return (
    <AppLayout activeRoute="/settings">
      <SettingsWorkspace />
    </AppLayout>
  );
}