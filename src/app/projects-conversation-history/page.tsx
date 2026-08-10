import AppLayout from '@/components/AppLayout';
import ProjectsHistoryWorkspace from './components/ProjectsHistoryWorkspace';

export default function ProjectsPage() {
  return (
    <AppLayout activeRoute="/projects-conversation-history">
      <ProjectsHistoryWorkspace />
    </AppLayout>
  );
}