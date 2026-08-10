import AppLayout from '@/components/AppLayout';
import CodeSnippetsWorkspace from './components/CodeSnippetsWorkspace';

export default function CodeSnippetsPage() {
  return (
    <AppLayout activeRoute="/code-snippets">
      <CodeSnippetsWorkspace />
    </AppLayout>
  );
}