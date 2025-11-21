import { WorkspaceSystem } from './components/workspace-system';
import { WorkspaceProvider } from './components/systems-table/WorkspaceManager';

export default function App() {
  return (
    <WorkspaceProvider>
      <WorkspaceSystem />
    </WorkspaceProvider>
  );
}
