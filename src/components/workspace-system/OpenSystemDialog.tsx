import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { workspaceOperations, Workspace } from '../../db/database';

interface OpenSystemDialogProps {
  onClose: () => void;
  onOpenSystem: (workspaceId: string) => void;
}

export function OpenSystemDialog({ onClose, onOpenSystem }: OpenSystemDialogProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');

  useEffect(() => {
    const loadWorkspaces = async () => {
      const allWorkspaces = await workspaceOperations.getAll();
      setWorkspaces(allWorkspaces);
    };
    loadWorkspaces();
  }, []);

  const handleOpen = () => {
    if (selectedWorkspaceId) {
      onOpenSystem(selectedWorkspaceId);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-auto"
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
            Open Existing System
          </h2>
        </div>

        {/* Content */}
        <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingBottom: '40px' }}>
          <div className="space-y-2">
            <Label className="text-base font-semibold text-gray-800">
              Select System
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

          {workspaces.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No systems available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 rounded-b-lg" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '32px', paddingBottom: '32px' }}>
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              style={{ height: '48px', paddingLeft: '40px', paddingRight: '40px' }}
              className="text-base font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleOpen}
              disabled={!selectedWorkspaceId}
              style={{ height: '48px', paddingLeft: '40px', paddingRight: '40px' }}
              className="text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              Open
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
