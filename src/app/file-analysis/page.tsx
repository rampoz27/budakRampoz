import AppLayout from '@/components/AppLayout';
import FileAnalysisWorkspace from './components/FileAnalysisWorkspace';

export default function FileAnalysisPage() {
  return (
    <AppLayout activeRoute="/file-analysis">
      <FileAnalysisWorkspace />
    </AppLayout>
  );
}