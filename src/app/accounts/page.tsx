import AppLayout from '@/components/AppLayout';
import AccountsWorkspace from './components/AccountsWorkspace';

export default function AccountsPage() {
  return (
    <AppLayout activeRoute="/accounts">
      <AccountsWorkspace />
    </AppLayout>
  );
}
