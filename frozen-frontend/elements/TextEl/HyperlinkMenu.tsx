import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HyperlinkTarget, HyperlinkMode } from '@/types';
import { Search, BookOpen, ChevronDown } from 'lucide-react';

interface HyperlinkMenuProps {
  availablePages: Array<{ id: string; name: string }>;
  selectedText: string;
  position: { x: number; y: number };
  onApply: (target: HyperlinkTarget) => void;
  onClose: () => void;
}

export function HyperlinkMenu({
  availablePages,
  selectedText,
  position,
  onApply,
  onClose,
}: HyperlinkMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    availablePages.length > 0 ? availablePages[0].id : null
  );
  const [selectedMode, setSelectedMode] = useState<HyperlinkMode>('popup');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: position.x, y: position.y });
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredPages = availablePages.filter(page =>
    page.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPage = availablePages.find(p => p.id === selectedPageId);

  // Position menu outside the page container (to the right)
  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Find the page container (the white page area)
      const pageEl = menuRef.current.closest('[class*="relative"]')?.closest('[style*="max-width"]')
        || document.querySelector('[class*="bg-white"][class*="shadow"]')
        || document.querySelector('.bg-background');

      let newX: number;
      let newY = position.y - 40; // Align roughly with the selection

      if (pageEl) {
        const pageRect = pageEl.getBoundingClientRect();
        // Place to the right of the page with a gap
        newX = pageRect.right + 16;

        // If not enough room on the right, place to the left
        if (newX + menuRect.width > viewportWidth - 10) {
          newX = pageRect.left - menuRect.width - 16;
        }
        // If still no room, fall back to right-aligned in viewport
        if (newX < 10) {
          newX = viewportWidth - menuRect.width - 10;
        }
      } else {
        // Fallback: right side of viewport
        newX = viewportWidth - menuRect.width - 20;
      }

      // Keep within vertical bounds
      if (newY + menuRect.height > viewportHeight - 10) {
        newY = viewportHeight - menuRect.height - 10;
      }
      if (newY < 10) {
        newY = 10;
      }

      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position]);

  // Focus search input when search opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

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

  const handleSelectPage = (pageId: string) => {
    setSelectedPageId(pageId);
    setDropdownOpen(false);
  };

  return (
    <div
      ref={menuRef}
      data-hyperlink-menu
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-5 px-5"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        width: 340,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      {/* Link to + dropdown + search icon */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[13px] font-medium text-gray-500 shrink-0">Link to</span>
        <button
          className="flex-1 flex items-center justify-between border border-gray-300 rounded-md px-2.5 py-1.5 text-[13px] bg-gray-50 hover:bg-gray-100 cursor-pointer min-w-0"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <span className={`truncate ${selectedPage ? 'text-gray-900' : 'text-gray-400'}`}>
            {selectedPage ? selectedPage.name : 'Select page...'}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-gray-500 shrink-0 ml-1 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        <button
          className={`shrink-0 w-[30px] h-[30px] flex items-center justify-center border rounded-md cursor-pointer ${
            showSearch ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={() => {
            setShowSearch(!showSearch);
            if (showSearch) setSearchQuery('');
          }}
          title="Search pages"
        >
          <Search className="h-3.5 w-3.5 text-gray-500" />
        </button>
      </div>

      {/* Search bar (shown when search icon clicked) */}
      {showSearch && (
        <div className="mb-3">
          <Input
            ref={searchInputRef}
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-[13px]"
          />
        </div>
      )}

      {/* Page list dropdown */}
      {dropdownOpen && (
        <div className="border border-gray-200 rounded-md max-h-[160px] overflow-y-auto mb-4">
          {filteredPages.length === 0 ? (
            <div className="py-2 text-[13px] text-gray-400 text-center">
              {availablePages.length === 0 ? 'No pages available' : 'No matching pages'}
            </div>
          ) : (
            filteredPages.map(page => (
              <button
                key={page.id}
                className={`w-full px-3 py-2 text-left text-[13px] border-b border-gray-100 last:border-b-0 ${
                  selectedPageId === page.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleSelectPage(page.id)}
              >
                {page.name}
              </button>
            ))
          )}
        </div>
      )}

      {/* Conventions Library button */}
      <button
        className="w-full flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2.5 text-[13px] text-gray-500 bg-gray-50 hover:bg-gray-100 cursor-pointer"
        style={{ marginBottom: 28 }}
        onClick={() => {/* TODO: open conventions library */}}
      >
        <BookOpen className="h-3.5 w-3.5 text-gray-500" />
        <span>Conventions Library</span>
      </button>

      {/* Mode selection */}
      <div className="flex items-center gap-2" style={{ marginBottom: 28 }}>
        {(['popup', 'split', 'newpage'] as HyperlinkMode[]).map((mode) => (
          <button
            key={mode}
            className={`px-3 py-1.5 rounded text-xs cursor-pointer ${
              selectedMode === mode
                ? 'bg-blue-600 text-white border border-blue-600'
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
            onClick={() => setSelectedMode(mode)}
          >
            {mode === 'popup' ? 'Popup' : mode === 'split' ? 'Split' : 'New Page'}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="text-[13px] h-8" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="text-[13px] h-8"
          onClick={handleApply}
          disabled={!selectedPageId}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
