import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import { workspaceOperations, Partner } from '../../db/database';

interface ShareDialogProps {
  workspaceName: string;
  workspaceId: string;
  onClose: () => void;
}

export function ShareDialog({ workspaceName, workspaceId, onClose }: ShareDialogProps) {
  const [name, setName] = useState('');
  const [selectedMode, setSelectedMode] = useState<'viewer' | 'editor'>('viewer');
  const [partners, setPartners] = useState<Partner[]>([]);

  // Load partners from database when dialog opens
  useEffect(() => {
    const loadPartners = async () => {
      const workspace = await workspaceOperations.getById(workspaceId);
      if (workspace?.partners) {
        setPartners(workspace.partners);
      }
    };
    loadPartners();
  }, [workspaceId]);

  const handleAddPartner = async () => {
    if (!name.trim()) {
      return;
    }

    // Add partner with selected mode
    const newPartner: Partner = {
      id: Math.random().toString(36).substring(7),
      name: name.trim(),
      mode: selectedMode
    };

    const updatedPartners = [...partners, newPartner];
    setPartners(updatedPartners);

    // Save to database
    await workspaceOperations.update(workspaceId, { partners: updatedPartners });

    setName('');
    setSelectedMode('viewer'); // Reset to viewer
  };

  const handleRemovePartner = async (id: string) => {
    const updatedPartners = partners.filter(p => p.id !== id);
    setPartners(updatedPartners);

    // Save to database
    await workspaceOperations.update(workspaceId, { partners: updatedPartners });
  };

  const handleToggleMode = async (id: string) => {
    const updatedPartners = partners.map(p =>
      p.id === id
        ? { ...p, mode: p.mode === 'viewer' ? 'editor' : 'viewer' }
        : p
    );
    setPartners(updatedPartners);

    // Save to database
    await workspaceOperations.update(workspaceId, { partners: updatedPartners });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPartner();
    }
  };

  const handleDone = async () => {
    // If there's text in the input field, add it first
    if (name.trim()) {
      await handleAddPartner();
    }
    onClose();
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
        {/* Line 1: Title */}
        <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '48px', paddingBottom: '40px' }}>
          <h2 style={{ fontSize: '30px', fontWeight: '800', textAlign: 'center', color: '#111827' }}>
            Share System: {workspaceName}
          </h2>
        </div>

        {/* Content */}
        <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingBottom: '40px' }}>
          {/* Shared with section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-800">
              Shared with
            </Label>

            {/* Partners List */}
            {partners.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {partner.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{partner.name}</p>
                        <p className="text-xs text-gray-500">
                          {partner.mode === 'viewer' ? 'Viewer' : 'Editor'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleMode(partner.id)}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                        title={`Change to ${partner.mode === 'viewer' ? 'editor' : 'viewer'}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemovePartner(partner.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title="Remove partner"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Partner Input */}
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter partner name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 h-12 px-4 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value as 'viewer' | 'editor')}
                className="h-12 px-4 text-base border-2 border-gray-300 rounded-md bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <Button
                onClick={handleAddPartner}
                className="h-12 w-12 p-0 flex-shrink-0"
                disabled={!name.trim()}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 rounded-b-lg" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '32px', paddingBottom: '32px' }}>
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              onClick={handleDone}
              style={{ height: '48px', paddingLeft: '40px', paddingRight: '40px' }}
              className="text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
