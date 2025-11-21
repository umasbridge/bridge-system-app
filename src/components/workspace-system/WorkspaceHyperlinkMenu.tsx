import { useState } from 'react';
import { MessageSquare, FileText, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface WorkspaceHyperlinkMenuProps {
  position: { x: number; y: number };
  selectedText: string;
  onClose: () => void;
  onApply: (workspaceName: string, linkType: 'comment' | 'new-page') => void;
  existingWorkspaces: string[];
}

export function WorkspaceHyperlinkMenu({ 
  position, 
  selectedText, 
  onClose, 
  onApply,
  existingWorkspaces 
}: WorkspaceHyperlinkMenuProps) {
  const [workspaceName, setWorkspaceName] = useState(selectedText || '');
  const [selectedLinkType, setSelectedLinkType] = useState<'comment' | 'new-page' | null>(null);

  const handleApply = () => {
    if (workspaceName.trim() && selectedLinkType) {
      onApply(workspaceName.trim(), selectedLinkType);
      onClose();
    }
  };

  return (
    <div
      data-hyperlink-menu
      className="fixed z-[60] bg-white rounded-lg shadow-2xl border border-gray-200"
      style={{
        left: position.x + 20,
        top: position.y - 10,
        minWidth: '300px',
        maxWidth: '400px'
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        // Only prevent default on non-input elements to allow typing
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT') {
          e.preventDefault();
        }
        e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium">Create Hyperlink</p>
          {selectedText && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              "{selectedText}"
            </p>
          )}
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Workspace Name Input */}
        <div className="space-y-2">
          <Label htmlFor="workspace-name">Workspace Name</Label>
          <Input
            id="workspace-name"
            type="text"
            placeholder="Enter workspace name"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className="w-full"
            autoFocus
          />
          {existingWorkspaces.length > 0 && (
            <p className="text-xs text-gray-500">
              Existing workspaces: {existingWorkspaces.join(', ')}
            </p>
          )}
        </div>

        {/* Link Type Selection */}
        <div className="space-y-2">
          <Label>Link Type</Label>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setSelectedLinkType('comment')}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:border-blue-300 ${
                selectedLinkType === 'comment' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200'
              }`}
            >
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">Comment Box</p>
                <p className="text-xs text-gray-500">Opens as a popup overlay</p>
              </div>
            </button>

            <button
              onClick={() => setSelectedLinkType('new-page')}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:border-purple-300 ${
                selectedLinkType === 'new-page' 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200'
              }`}
            >
              <FileText className="h-5 w-5 text-purple-600" />
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">New Page</p>
                <p className="text-xs text-gray-500">Opens in new tab/window</p>
              </div>
            </button>
          </div>
        </div>

        {/* Apply Button */}
        <Button 
          onClick={handleApply} 
          className="w-full"
          disabled={!workspaceName.trim() || !selectedLinkType}
        >
          Create Link
        </Button>
      </div>
    </div>
  );
}
