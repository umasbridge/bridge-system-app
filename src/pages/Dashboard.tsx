import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, List, Search, LogOut, FileText } from 'lucide-react';
import { auth } from '../lib/mockAuth';
import { workspaceOperations, elementOperations, type Workspace } from '../db/database';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import logoImg from '../assets/logo.png';

interface WorkspaceWithMeta extends Workspace {
  elementCount: number;
}

export function Dashboard() {
  const navigate = useNavigate();
  const user = auth.getCurrentUser();

  const [workspaces, setWorkspaces] = useState<WorkspaceWithMeta[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Load workspaces from IndexedDB
  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    setIsLoading(true);
    try {
      const allWorkspaces = await workspaceOperations.getAll();

      // Get element count for each workspace
      const workspacesWithMeta = await Promise.all(
        allWorkspaces.map(async (ws) => {
          const elements = await elementOperations.getByWorkspaceId(ws.id);
          return {
            ...ws,
            elementCount: elements.length,
          };
        })
      );

      setWorkspaces(workspacesWithMeta);
    } catch (error) {
      console.error('Error loading workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  const handleCreateNew = async () => {
    const newWorkspace = await workspaceOperations.create('');
    navigate(`/workspace/${newWorkspace.id}`);
  };

  const handleTemplateSelect = async (templateName: string) => {
    const newWorkspace = await workspaceOperations.create(templateName);
    setIsTemplateModalOpen(false);
    navigate(`/workspace/${newWorkspace.id}`);
  };

  // Filter workspaces based on search query
  const filteredWorkspaces = workspaces.filter(ws =>
    ws.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format last modified time
  const formatLastModified = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return new Date(timestamp).toLocaleDateString();
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
      <main className="max-w-7xl mx-auto p-8">
        {/* Header with actions */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Your Workspaces</h2>
            <p className="text-neutral-600">
              {filteredWorkspaces.length} {filteredWorkspaces.length === 1 ? 'workspace' : 'workspaces'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <Input
                type="search"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 w-64"
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 border border-neutral-200 rounded-md p-1">
              <Button
                variant={view === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView('grid')}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={view === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView('list')}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Create new */}
            <Button onClick={handleCreateNew}>
              <Plus className="w-4 h-4" />
              New Workspace
            </Button>

            {/* Templates */}
            <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="w-4 h-4" />
                  Templates
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start from Template</DialogTitle>
                  <DialogDescription>
                    Choose a pre-built bidding system template to get started quickly.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 mt-4">
                  {/* Standard American Template */}
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleTemplateSelect('Standard American')}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">Standard American</CardTitle>
                      <CardDescription>
                        5-card majors, 15-17 1NT, strong 2♣, weak 2♦♥♠
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  {/* 2/1 Game Force Template */}
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleTemplateSelect('2/1 Game Force')}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">2/1 Game Force</CardTitle>
                      <CardDescription>
                        Modern tournament standard with game-forcing 2-level responses
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  {/* Precision Club Template */}
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleTemplateSelect('Precision Club')}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">Precision Club</CardTitle>
                      <CardDescription>
                        Strong 1♣ (16+ HCP), 5-card major opening, limited NT ranges
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-neutral-600">Loading workspaces...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredWorkspaces.length === 0 && !searchQuery && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">No workspaces yet</h3>
            <p className="text-neutral-600 mb-6">Create your first workspace or start from a template</p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={handleCreateNew}>
                <Plus className="w-4 h-4" />
                Create Workspace
              </Button>
              <Button variant="outline" onClick={() => setIsTemplateModalOpen(true)}>
                <FileText className="w-4 h-4" />
                Browse Templates
              </Button>
            </div>
          </div>
        )}

        {/* No search results */}
        {!isLoading && filteredWorkspaces.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-neutral-600">No workspaces found matching "{searchQuery}"</p>
          </div>
        )}

        {/* Grid view */}
        {!isLoading && filteredWorkspaces.length > 0 && view === 'grid' && (
          <div className="grid grid-cols-3 gap-6">
            {filteredWorkspaces.map((workspace) => (
              <Card
                key={workspace.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/workspace/${workspace.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-base truncate">{workspace.title}</CardTitle>
                  <CardDescription>
                    {formatLastModified(workspace.updatedAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span>{workspace.elementCount} elements</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* List view */}
        {!isLoading && filteredWorkspaces.length > 0 && view === 'list' && (
          <div className="space-y-2">
            {filteredWorkspaces.map((workspace) => (
              <Card
                key={workspace.id}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => navigate(`/workspace/${workspace.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-neutral-900">{workspace.title}</h3>
                      <p className="text-sm text-neutral-600">
                        {formatLastModified(workspace.updatedAt)} · {workspace.elementCount} elements
                      </p>
                    </div>
                    <div className="text-neutral-400">→</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
