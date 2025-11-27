import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FolderOpen, FilePlus } from 'lucide-react';
import { auth } from '../lib/mockAuth';
import { workspaceOperations, elementOperations } from '../lib/supabase-db';
import { Button } from '../components/ui/button';
import { CreateSystemDialog } from '../components/workspace-system/CreateSystemDialog';
import { OpenSystemDialog } from '../components/workspace-system/OpenSystemDialog';
import logoImg from '../assets/logo.png';

export function Dashboard() {
  const navigate = useNavigate();
  const user = auth.getCurrentUser();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  const handleCreateFromScratch = async () => {
    const newWorkspace = await workspaceOperations.create('');
    setShowCreateDialog(false);
    navigate(`/workspace/${newWorkspace.id}?mode=edit`);
  };

  const handleCreateFromTemplate = async (templateId: string, newName: string) => {
    // Get the template workspace
    const template = await workspaceOperations.getById(templateId);
    if (!template) return;

    // Create new workspace with the new name
    const newWorkspace = await workspaceOperations.create(newName);

    // Copy all elements from template to new workspace
    const templateElements = await elementOperations.getByWorkspaceId(templateId);
    for (const element of templateElements) {
      const newElement = { ...element, id: Math.random().toString(36).substring(7), workspaceId: newWorkspace.id };
      await elementOperations.create(newElement);
    }

    setShowCreateDialog(false);
    navigate(`/workspace/${newWorkspace.id}?mode=edit`);
  };

  const handleOpenSystem = (workspaceId: string) => {
    setShowOpenDialog(false);
    navigate(`/workspace/${workspaceId}?mode=view`);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoImg} alt="Bridge System App" className="h-10" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600">Welcome, {user?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center">
        <h1
          className="font-bold mb-12 tracking-tight"
          style={{
            fontSize: '7rem',
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            letterSpacing: '0.02em'
          }}
        >
          BRIDGE SYSTEM
        </h1>
        <div className="flex items-center" style={{ gap: '480px', marginTop: '384px' }}>
          <div
            onClick={() => setShowCreateDialog(true)}
            className="w-64 h-64 bg-blue-600 hover:bg-blue-700 rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors shadow-lg"
          >
            <FilePlus className="w-16 h-16 text-white" />
            <span className="text-white text-xl font-semibold text-center px-4">Create New System</span>
          </div>
          <div
            onClick={() => setShowOpenDialog(true)}
            className="w-64 h-64 bg-blue-600 hover:bg-blue-700 rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors shadow-lg"
          >
            <FolderOpen className="w-16 h-16 text-white" />
            <span className="text-white text-xl font-semibold text-center px-4">Open Existing System</span>
          </div>
        </div>

        {/* Create System Dialog */}
        {showCreateDialog && (
          <CreateSystemDialog
            onClose={() => setShowCreateDialog(false)}
            onCreateFromScratch={handleCreateFromScratch}
            onCreateFromTemplate={handleCreateFromTemplate}
          />
        )}

        {/* Open System Dialog */}
        {showOpenDialog && (
          <OpenSystemDialog
            onClose={() => setShowOpenDialog(false)}
            onOpenSystem={handleOpenSystem}
          />
        )}
      </main>
    </div>
  );
}
