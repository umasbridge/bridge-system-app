import { MessageSquare, Columns, FileText, X } from 'lucide-react';
import { Button } from '../ui/button';

interface HyperlinkMenuProps {
  position: { x: number; y: number };
  selectedText: string;
  selectionRange: { start: number; end: number };
  onClose: () => void;
  onSelect: (option: 'comment' | 'split-view' | 'new-page') => void;
}

export function HyperlinkMenu({ position, selectedText, selectionRange, onClose, onSelect }: HyperlinkMenuProps) {
  return (
    <div
      data-hyperlink-menu
      className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200"
      style={{
        left: position.x,
        top: position.y + 10,
        transform: 'translateX(-50%)',
        minWidth: '180px'
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Header with selected text and close button */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        {selectedText ? (
          <p className="text-xs text-gray-500 truncate max-w-[120px]">
            "{selectedText}"
          </p>
        ) : (
          <p className="text-xs font-medium">Hyperlink</p>
        )}
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 ml-2"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="flex flex-col gap-1 p-2">
        <Button
          onClick={() => onSelect('comment')}
          variant="ghost"
          className="w-full justify-start gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Comment Box
        </Button>
        <Button
          onClick={() => onSelect('split-view')}
          variant="ghost"
          className="w-full justify-start gap-2"
        >
          <Columns className="h-4 w-4" />
          Split View
        </Button>
        <Button
          onClick={() => onSelect('new-page')}
          variant="ghost"
          className="w-full justify-start gap-2"
        >
          <FileText className="h-4 w-4" />
          New Page
        </Button>
      </div>
    </div>
  );
}
