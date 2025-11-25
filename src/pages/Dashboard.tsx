import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FolderOpen, FilePlus } from 'lucide-react';
import { auth } from '../lib/mockAuth';
import { workspaceOperations, elementOperations } from '../db/database';
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
            <h1 className="text-xl font-semibold text-neutral-900">Bridge System</h1>
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
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-neutral-900 mb-8">Welcome to Bridge System</h2>
          <div className="flex flex-col gap-6 items-center">
            <Button
              onClick={() => setShowCreateDialog(true)}
              size="lg"
              className="w-80 h-20 text-lg font-semibold gap-3"
            >
              <FilePlus className="w-6 h-6" />
              Create New System
            </Button>
            <Button
              onClick={() => setShowOpenDialog(true)}
              size="lg"
              variant="outline"
              className="w-80 h-20 text-lg font-semibold gap-3"
            >
              <FolderOpen className="w-6 h-6" />
              Open Existing System
            </Button>
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
