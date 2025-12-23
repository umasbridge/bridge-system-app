import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { workspaceOperations, Workspace } from '../../lib/supabase-db';

interface CreateSystemDialogProps {
  onClose: () => void;
  onCreateFromScratch: () => void;
  onCreateFromTemplate: (templateId: string, newName: string) => void;
}

export function CreateSystemDialog({ onClose, onCreateFromScratch, onCreateFromTemplate }: CreateSystemDialogProps) {
  const [mode, setMode] = useState<'select' | 'template'>('select');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const loadWorkspaces = async () => {
      const allWorkspaces = await workspaceOperations.getAll();
      // Only show top-level systems as templates, not linked workspaces
      const systems = allWorkspaces.filter(w => w.isSystem);
      setWorkspaces(systems);
    };
    loadWorkspaces();
  }, []);

  const handleCreateFromTemplate = () => {
    console.log('CreateSystemDialog handleCreateFromTemplate:', { selectedWorkspaceId, newName: newName.trim() });
    if (selectedWorkspaceId && newName.trim()) {
      onCreateFromTemplate(selectedWorkspaceId, newName.trim());
    } else {
      console.error('Missing required fields:', { selectedWorkspaceId, newName });
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-[9999] pointer-events-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleBackdropClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-[580px] max-h-[80vh] overflow-y-auto"
        style={{ position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '48px', paddingBottom: '40px' }}>
          <h2 style={{ fontSize: '30px', fontWeight: '800', textAlign: 'center', color: '#111827' }}>
            Create New System
          </h2>
        </div>

        {/* Mode Selection */}
        {mode === 'select' && (
          <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingBottom: '40px' }}>
            <div className="flex flex-col gap-4">
              <Button
                onClick={onCreateFromScratch}
                className="h-16 text-base font-semibold"
                variant="outline"
              >
                Create from Scratch
              </Button>
              <Button
                onClick={() => setMode('template')}
                className="h-16 text-base font-semibold"
                variant="outline"
              >
                Use Existing System as Template
              </Button>
            </div>
          </div>
        )}

        {/* Create from Template */}
        {mode === 'template' && (
          <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingBottom: '40px' }}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold text-gray-800">
                  Select Template System
                </Label>
                <select
                  value={selectedWorkspaceId}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                  className="w-full h-12 rounded-md border-2 border-gray-300 bg-white px-4 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">Choose a system...</option>
                  {workspaces.map(workspace => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.title || 'Untitled System'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedWorkspaceId && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-gray-800">
                    New System Name
                  </Label>
                  <Input
                    type="text"
                    placeholder="Enter new system name..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-12 px-4 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 rounded-b-lg" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '32px', paddingBottom: '32px' }}>
          <div className="flex gap-4 justify-end">
            {mode === 'template' && (
              <Button
                type="button"
                onClick={() => setMode('select')}
                variant="outline"
                style={{ height: '48px', paddingLeft: '40px', paddingRight: '40px' }}
                className="text-base font-semibold"
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              style={{ height: '48px', paddingLeft: '40px', paddingRight: '40px' }}
              className="text-base font-semibold"
            >
              Cancel
            </Button>
            {mode === 'template' && (
              <Button
                type="button"
                onClick={handleCreateFromTemplate}
                disabled={!selectedWorkspaceId || !newName.trim()}
                style={{ height: '48px', paddingLeft: '40px', paddingRight: '40px' }}
                className="text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
