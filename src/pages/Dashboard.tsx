import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FolderOpen, FilePlus, Upload, Settings, Search, BookOpen, Database } from 'lucide-react';
import { auth } from '../lib/mockAuth';
import { workspaceOperations, elementOperations } from '../lib/supabase-db';
import { Button } from '../components/ui/button';
import { CreateSystemDialog } from '../components/workspace-system/CreateSystemDialog';
import { OpenSystemDialog } from '../components/workspace-system/OpenSystemDialog';
import { UploadSystemDocDialog } from '../components/workspace-system/UploadSystemDocDialog';
import { seedFantunes } from '../lib/seed-fantunes';
import logoImg from '../assets/logo.png';

export function Dashboard() {
  const navigate = useNavigate();
  const user = auth.getCurrentUser();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showUploadSystemDocDialog, setShowUploadSystemDocDialog] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedFantunes = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    try {
      const workspaceId = await seedFantunes();
      alert('Fantunes system created successfully!');
      navigate(`/workspace/${workspaceId}?mode=view`);
    } catch (err) {
      console.error('Failed to seed Fantunes:', err);
      alert('Failed to create Fantunes system. Check console for details.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  const handleCreateFromScratch = async (systemName: string) => {
    // Create workspace with the given name as a system
    const newWorkspace = await workspaceOperations.create(systemName, true);

    // Set the title HTML content to display the name properly
    await workspaceOperations.update(newWorkspace.id, {
      titleHtmlContent: `<span style="font-weight: 700">${systemName}</span>`
    });

    // Auto-create TOC table element with initial rows
    const initialRows = [
      {
        id: crypto.randomUUID(),
        bid: '',
        bidHtmlContent: '',
        meaning: '',
        meaningHtmlContent: '',
        children: []
      }
    ];

    const tocElement = {
      id: crypto.randomUUID(),
      workspaceId: newWorkspace.id,
      type: 'systems-table',
      name: `${systemName}_TOC`,
      position: { x: 50, y: 50 },
      size: { width: 800, height: 400 },
      zIndex: 1,
      showName: true,
      nameHtmlContent: `<span style="font-weight: 700">Table of Contents</span>`,
      initialRows: initialRows,
      meaningWidth: 600,
      levelWidths: { 0: 80 },
      gridlines: { enabled: false, color: '#D1D5DB', width: 1 }
    };
    await elementOperations.create(tocElement as any);

    setShowCreateDialog(false);
    navigate(`/workspace/${newWorkspace.id}?mode=edit`);
  };

  const handleCreateFromTemplate = async (templateId: string, newName: string) => {
    console.log('handleCreateFromTemplate called with:', { templateId, newName });

    try {
      // Get the template workspace
      console.log('Fetching template workspace...');
      const template = await workspaceOperations.getById(templateId);
      console.log('Template workspace:', template);

      if (!template) {
        console.error('Template workspace not found for ID:', templateId);
        alert('Template workspace not found. Please try again.');
        setShowCreateDialog(false);
        return;
      }

      // Create new workspace with the new name (as a system)
      console.log('Creating new workspace with name:', newName);
      const newWorkspace = await workspaceOperations.create(newName, true);
      console.log('New workspace created:', newWorkspace);

      // Set the title HTML content to display the name properly
      await workspaceOperations.update(newWorkspace.id, {
        titleHtmlContent: `<span style="font-weight: 700">${newName}</span>`
      });

      // Copy all elements from template to new workspace
      console.log('Fetching elements from template...');
      const templateElements = await elementOperations.getByWorkspaceId(templateId);
      console.log('Found', templateElements.length, 'elements to copy');

      for (const element of templateElements) {
        const newElement = {
          ...element,
          id: crypto.randomUUID(),
          workspaceId: newWorkspace.id
        };
        console.log('Copying element:', element.id, '->', newElement.id);
        await elementOperations.create(newElement);
      }

      console.log('All elements copied. Navigating to new workspace...');
      setShowCreateDialog(false);
      navigate(`/workspace/${newWorkspace.id}?mode=edit`);
    } catch (err) {
      console.error('Failed to create from template:', err);
      alert('Failed to create system from template. Check console for details.');
      setShowCreateDialog(false);
    }
  };

  const handleOpenSystem = (workspaceId: string) => {
    setShowOpenDialog(false);
    navigate(`/workspace/${workspaceId}?mode=view`);
  };

  const handleCreateFromConventions = async (systemName: string, mdContent: string) => {
    // Create and download the .md file
    const fileName = `${systemName.replace(/\s+/g, '_')}.md`;
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`Downloaded: ${fileName}`);
    setShowCreateDialog(false);
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
        <div className="flex items-center" style={{ gap: '120px', marginTop: '384px' }}>
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
          <div
            onClick={() => setShowUploadSystemDocDialog(true)}
            className="w-64 h-64 rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors shadow-lg"
            style={{ backgroundColor: '#16a34a' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
          >
            <Upload className="w-16 h-16 text-white" />
            <span className="text-white text-xl font-semibold text-center px-4">Upload System Doc</span>
          </div>
          <div
            onClick={() => navigate('/manage-elements')}
            className="w-64 h-64 rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors shadow-lg"
            style={{ backgroundColor: '#6b7280' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
          >
            <Settings className="w-16 h-16 text-white" />
            <span className="text-white text-xl font-semibold text-center px-4">Manage System Elements</span>
          </div>
          <div
            onClick={() => navigate('/practice')}
            className="w-64 h-64 rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors shadow-lg"
            style={{ backgroundColor: '#f59e0b' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
          >
            <Search className="w-16 h-16 text-white" />
            <span className="text-white text-xl font-semibold text-center px-4">System Query</span>
          </div>
          <div
            onClick={() => navigate('/conventions')}
            className="w-64 h-64 rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors shadow-lg"
            style={{ backgroundColor: '#8b5cf6' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
          >
            <BookOpen className="w-16 h-16 text-white" />
            <span className="text-white text-xl font-semibold text-center px-4">Conventions Library</span>
          </div>
          <div
            onClick={handleSeedFantunes}
            className={`w-64 h-64 rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors shadow-lg ${isSeeding ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ backgroundColor: '#dc2626' }}
            onMouseEnter={(e) => !isSeeding && (e.currentTarget.style.backgroundColor = '#b91c1c')}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
          >
            <Database className="w-16 h-16 text-white" />
            <span className="text-white text-xl font-semibold text-center px-4">
              {isSeeding ? 'Creating...' : 'Seed Fantunes'}
            </span>
          </div>
        </div>

        {/* Create System Dialog */}
        {showCreateDialog && (
          <CreateSystemDialog
            onClose={() => setShowCreateDialog(false)}
            onCreateFromScratch={handleCreateFromScratch}
            onCreateFromTemplate={handleCreateFromTemplate}
            onCreateFromConventions={handleCreateFromConventions}
          />
        )}

        {/* Open System Dialog */}
        {showOpenDialog && (
          <OpenSystemDialog
            onClose={() => setShowOpenDialog(false)}
            onOpenSystem={handleOpenSystem}
          />
        )}

        {/* Upload System Doc Dialog */}
        {showUploadSystemDocDialog && (
          <UploadSystemDocDialog
            onClose={() => setShowUploadSystemDocDialog(false)}
            onImportComplete={(workspaceId) => {
              setShowUploadSystemDocDialog(false);
              navigate(`/workspace/${workspaceId}?mode=edit`);
            }}
          />
        )}
      </main>
    </div>
  );
}
