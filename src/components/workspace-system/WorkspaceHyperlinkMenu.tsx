import { useState, useMemo } from 'react';
import { MessageSquare, Columns, FileText, X, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface WorkspaceHyperlinkMenuProps {
  position: { x: number; y: number };
  selectedText: string;
  onClose: () => void;
  onApply: (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page') => void;
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
  const [selectedLinkType, setSelectedLinkType] = useState<'comment' | 'split-view' | 'new-page' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExistingList, setShowExistingList] = useState(false);

  // Filter workspaces based on search query
  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return existingWorkspaces;
    const query = searchQuery.toLowerCase();
    return existingWorkspaces.filter(ws => ws.toLowerCase().includes(query));
  }, [existingWorkspaces, searchQuery]);

  const handleApply = () => {
    if (workspaceName.trim() && selectedLinkType) {
      onApply(workspaceName.trim(), selectedLinkType);
      onClose();
    }
  };

  return (
    <div
      data-hyperlink-menu
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-200"
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
            placeholder="Enter workspace name or select from list"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className="w-full"
            autoFocus
          />

          {/* Existing Workspaces Section */}
          {existingWorkspaces.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowExistingList(!showExistingList)}
                className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                {showExistingList ? 'Hide' : 'Show'} existing workspaces ({existingWorkspaces.length})
              </button>

              {showExistingList && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Search Input */}
                  <div className="p-2 border-b border-gray-200 bg-gray-50">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search workspaces..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Scrollable Workspace List */}
                  <div className="max-h-40 overflow-y-auto">
                    {filteredWorkspaces.length > 0 ? (
                      filteredWorkspaces.map((ws, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setWorkspaceName(ws);
                            setShowExistingList(false);
                            setSearchQuery('');
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                            workspaceName === ws ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {ws}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-gray-500 italic">
                        No workspaces match "{searchQuery}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
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
              onClick={() => setSelectedLinkType('split-view')}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:border-green-300 ${
                selectedLinkType === 'split-view'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200'
              }`}
            >
              <Columns className="h-5 w-5 text-green-600" />
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">Split View</p>
                <p className="text-xs text-gray-500">Opens side-by-side</p>
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
