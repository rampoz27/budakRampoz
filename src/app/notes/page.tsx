import AppLayout from '@/components/AppLayout';
import NotesWorkspace from './components/NotesWorkspace';

export default function NotesPage() {
  return (
    <AppLayout activeRoute="/notes">
      <NotesWorkspace />
    </AppLayout>
  );
}
