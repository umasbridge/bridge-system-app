import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HyperlinkTarget, HyperlinkMode } from '@/types';
import { X, ExternalLink, Columns, MessageSquare } from 'lucide-react';

interface HyperlinkMenuProps {
  availablePages: Array<{ id: string; name: string }>;
  selectedText: string;
  position: { x: number; y: number };
  onApply: (target: HyperlinkTarget) => void;
  onClose: () => void;
}

const LINK_MODES: Array<{ mode: HyperlinkMode; label: string; icon: React.ReactNode; description: string }> = [
  {
    mode: 'popup',
    label: 'Popup',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Open as a popup overlay',
  },
  {
    mode: 'split',
    label: 'Split View',
    icon: <Columns className="h-4 w-4" />,
    description: 'Open in side-by-side view',
  },
  {
    mode: 'newpage',
    label: 'New Page',
    icon: <ExternalLink className="h-4 w-4" />,
    description: 'Navigate to the page',
  },
];

export function HyperlinkMenu({
  availablePages,
  selectedText,
  position,
  onApply,
  onClose,
}: HyperlinkMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<HyperlinkMode>('popup');
  const [adjustedPosition, setAdjustedPosition] = useState({ x: position.x, y: position.y });
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredPages = availablePages.filter(page =>
    page.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let newX = position.x - 160;
      let newY = position.y + 20;

      // Check right edge
      if (newX + rect.width > viewportWidth - 10) {
        newX = viewportWidth - rect.width - 10;
      }
      // Check left edge
      if (newX < 10) {
        newX = 10;
      }
      // Check bottom edge - if menu would go below viewport, show above selection
      if (newY + rect.height > viewportHeight - 10) {
        newY = position.y - rect.height - 10;
      }
      // Check top edge
      if (newY < 10) {
        newY = 10;
      }

      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position]);

  const handleApply = () => {
    if (!selectedPageId) return;
    const page = availablePages.find(p => p.id === selectedPageId);
    if (!page) return;

    onApply({
      pageId: selectedPageId,
      pageName: page.name,
      mode: selectedMode,
    });
  };

  return (
    <div
      ref={menuRef}
      data-hyperlink-menu
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">Create Link</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected text preview */}
      <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
        <span className="text-gray-500">Selected: </span>
        <span className="font-medium">{selectedText || '(no text selected)'}</span>
      </div>

      {/* Page search */}
      <div className="mb-3">
        <Label className="text-xs text-gray-500 mb-1 block">Link to Page</Label>
        <Input
          placeholder="Search pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Page list */}
      <div className="max-h-48 overflow-y-auto mb-3 border border-gray-200 rounded">
        {filteredPages.length === 0 ? (
          <div className="p-2 text-sm text-gray-500 text-center">
            {availablePages.length === 0 ? 'No pages available' : 'No matching pages'}
          </div>
        ) : (
          filteredPages.map(page => (
            <button
              key={page.id}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                selectedPageId === page.id ? 'bg-blue-50 text-blue-700' : ''
              }`}
              onClick={() => setSelectedPageId(page.id)}
            >
              {page.name}
            </button>
          ))
        )}
      </div>

      {/* Link mode selection */}
      <div className="mb-4">
        <Label className="text-xs text-gray-500 mb-2 block">Open As</Label>
        <div className="grid grid-cols-3 gap-2">
          {LINK_MODES.map(({ mode, label, icon }) => (
            <button
              key={mode}
              className={`flex flex-col items-center gap-1 p-2 rounded border text-xs ${
                selectedMode === mode
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedMode(mode)}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleApply}
          disabled={!selectedPageId}
        >
          Apply Link
        </Button>
      </div>
    </div>
  );
}
