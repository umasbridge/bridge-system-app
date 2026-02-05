import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { workspaceOperations, Workspace } from '../../lib/supabase-db';
import { SYSTEMS, CONVENTIONS, getSystemById, getConventionById } from '../../conventions';

interface CreateSystemDialogProps {
  onClose: () => void;
  onCreateFromScratch: (systemName: string) => void;
  onCreateFromTemplate: (templateId: string, newName: string) => void;
  onCreateFromConventions?: (systemName: string, mdContent: string) => void;
}

export function CreateSystemDialog({ onClose, onCreateFromScratch, onCreateFromTemplate, onCreateFromConventions }: CreateSystemDialogProps) {
  const [mode, setMode] = useState<'select' | 'scratch' | 'template' | 'baseSystem'>('select');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [scratchName, setScratchName] = useState('');

  // Base system selection state
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [systemAnswers, setSystemAnswers] = useState<Record<string, boolean>>({});
  const [selectedConventions, setSelectedConventions] = useState<string[]>([]);
  const [conventionAnswers, setConventionAnswers] = useState<Record<string, boolean>>({});
  const [systemName, setSystemName] = useState('');

  useEffect(() => {
    const loadWorkspaces = async () => {
      const allWorkspaces = await workspaceOperations.getAll();
      // Only show top-level systems as templates, not linked workspaces
      const systems = allWorkspaces.filter(w => w.type === 'bidding_system');
      setWorkspaces(systems);
    };
    loadWorkspaces();
  }, []);

  const handleCreateFromScratch = () => {
    if (scratchName.trim()) {
      onCreateFromScratch(scratchName.trim());
    }
  };

  const handleCreateFromTemplate = () => {
    console.log('CreateSystemDialog handleCreateFromTemplate:', { selectedWorkspaceId, newName: newName.trim() });
    if (selectedWorkspaceId && newName.trim()) {
      onCreateFromTemplate(selectedWorkspaceId, newName.trim());
    } else {
      console.error('Missing required fields:', { selectedWorkspaceId, newName });
    }
  };

  const toggleConvention = (conventionId: string) => {
    setSelectedConventions(prev =>
      prev.includes(conventionId)
        ? prev.filter(id => id !== conventionId)
        : [...prev, conventionId]
    );
  };

  const generateMdContent = (): string => {
    const system = getSystemById(selectedSystemId);
    if (!system) return '';

    const lines: string[] = [];
    lines.push(`# ${systemName.trim()}`);
    lines.push('');
    lines.push('## Description');
    lines.push('');
    lines.push(system.description);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Generate system content using the system's generate function
    const content = system.generate(systemAnswers, selectedConventions, conventionAnswers);
    lines.push(content);

    return lines.join('\n');
  };

  const handleCreateFromBaseSystem = () => {
    if (systemName.trim() && selectedSystemId) {
      const mdContent = generateMdContent();
      console.log('Generated MD content:');
      console.log(mdContent);
      if (onCreateFromConventions) {
        onCreateFromConventions(systemName.trim(), mdContent);
      } else {
        onCreateFromScratch(systemName.trim());
      }
    }
  };

  const getSelectedSystem = () => {
    return getSystemById(selectedSystemId);
  };

  const getAvailableConventions = () => {
    const system = getSelectedSystem();
    if (!system) return [];
    return system.availableConventions
      .map(id => getConventionById(id))
      .filter(Boolean);
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
                onClick={() => setMode('baseSystem')}
                className="h-16 text-base font-semibold"
                variant="outline"
              >
                Build from Base System
              </Button>
              <Button
                onClick={() => setMode('scratch')}
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

        {/* Build from Base System */}
        {mode === 'baseSystem' && (
          <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingBottom: '40px' }}>
            <div className="space-y-4">
              {/* System Name at top */}
              <div className="space-y-2">
                <Label className="text-base font-semibold text-gray-800">
                  System Name
                </Label>
                <Input
                  type="text"
                  placeholder="Enter system name..."
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  className="h-12 px-4 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* Base System Selection */}
              <Label className="text-base font-semibold text-gray-800">
                Base System
              </Label>
              <div className="space-y-3">
                {SYSTEMS.map(system => (
                  <div
                    key={system.id}
                    className={`border rounded-lg ${selectedSystemId === system.id ? 'border-blue-500 bg-blue-50' : ''}`}
                  >
                    <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="baseSystem"
                        checked={selectedSystemId === system.id}
                        onChange={() => {
                          setSelectedSystemId(system.id);
                          setSelectedConventions([]);
                          setSystemAnswers({});
                          setConventionAnswers({});
                        }}
                        className="mt-1 h-5 w-5 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{system.name}</div>
                        <div className="text-sm text-gray-500">{system.description}</div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {/* System-level questions (when a system is selected) */}
              {selectedSystemId && getSelectedSystem()?.systemOptions.length > 0 && (
                <>
                  <Label className="text-base font-semibold text-gray-800">
                    System Options
                  </Label>
                  <div className="space-y-2">
                    {getSelectedSystem()?.systemOptions.map(option => (
                      <div key={option.id} className="flex items-center gap-3 p-3 bg-gray-50 border rounded-lg">
                        <span className="text-sm text-gray-700 flex-1">{option.question}</span>
                        <div className="flex gap-1">
                          <Button
                            variant={systemAnswers[option.id] === true ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={() => setSystemAnswers(prev => ({ ...prev, [option.id]: true }))}
                          >
                            Yes
                          </Button>
                          <Button
                            variant={systemAnswers[option.id] !== true ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={() => setSystemAnswers(prev => ({ ...prev, [option.id]: false }))}
                          >
                            No
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Convention checklist (when a system is selected) */}
              {selectedSystemId && getAvailableConventions().length > 0 && (
                <>
                  <Label className="text-base font-semibold text-gray-800">
                    Conventions to Include
                  </Label>
                  <div className="space-y-3">
                    {getAvailableConventions().map(convention => convention && (
                      <div
                        key={convention.id}
                        className={`border rounded-lg ${selectedConventions.includes(convention.id) ? 'border-blue-500 bg-blue-50' : ''}`}
                      >
                        <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={selectedConventions.includes(convention.id)}
                            onChange={() => toggleConvention(convention.id)}
                            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{convention.name}</div>
                            <div className="text-sm text-gray-500">{convention.description}</div>
                          </div>
                        </label>

                        {/* Convention-specific options */}
                        {selectedConventions.includes(convention.id) && convention.options.length > 0 && (
                          <div className="px-3 pb-3 ml-8 space-y-2">
                            {convention.options.map(option => (
                              <div key={option.id} className="flex items-center gap-3 p-2 bg-white border rounded">
                                <span className="text-sm text-gray-700 flex-1">{option.question}</span>
                                <div className="flex gap-1">
                                  <Button
                                    variant={conventionAnswers[option.id] === true ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-7 px-3 text-xs"
                                    onClick={() => setConventionAnswers(prev => ({ ...prev, [option.id]: true }))}
                                  >
                                    Yes
                                  </Button>
                                  <Button
                                    variant={conventionAnswers[option.id] !== true ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-7 px-3 text-xs"
                                    onClick={() => setConventionAnswers(prev => ({ ...prev, [option.id]: false }))}
                                  >
                                    No
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Create from Scratch - Enter Name */}
        {mode === 'scratch' && (
          <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingBottom: '40px' }}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold text-gray-800">
                  System Name
                </Label>
                <Input
                  type="text"
                  placeholder="Enter system name..."
                  value={scratchName}
                  onChange={(e) => setScratchName(e.target.value)}
                  className="h-12 px-4 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
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
            {/* Back button */}
            {(mode === 'scratch' || mode === 'template' || mode === 'baseSystem') && (
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

            {/* Cancel button */}
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              style={{ height: '48px', paddingLeft: '40px', paddingRight: '40px' }}
              className="text-base font-semibold"
            >
              Cancel
            </Button>

            {/* Save/Create buttons */}
            {mode === 'scratch' && (
              <Button
                type="button"
                onClick={handleCreateFromScratch}
                disabled={!scratchName.trim()}
                style={{ height: '48px', paddingLeft: '40px', paddingRight: '40px' }}
                className="text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create
              </Button>
            )}
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
            {mode === 'baseSystem' && (
              <Button
                type="button"
                onClick={handleCreateFromBaseSystem}
                disabled={!systemName.trim() || !selectedSystemId}
                style={{ height: '48px', paddingLeft: '40px', paddingRight: '40px' }}
                className="text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
              >
                Save
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
