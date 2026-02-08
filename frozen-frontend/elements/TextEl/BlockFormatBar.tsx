import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextFormat, TextElMode } from '@/types';

interface BlockFormatBarProps {
  mode: TextElMode;
  onFormat: (format: TextFormat) => void;
}

/**
 * Block-level formatting bar - shown when cursor is inside TextEl
 * Contains: alignment, lists (block-level operations that don't need selection)
 */
export function BlockFormatBar({
  mode,
  onFormat,
}: BlockFormatBarProps) {
  const allowBullets = mode === 'default' || mode === 'cell';

  // Prevent mousedown from stealing focus from contenteditable
  const preventFocusLoss = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div
      data-block-format-bar
      className="flex items-center gap-0.5 py-1 px-2 bg-gray-50 border-b border-gray-200 rounded-t"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      {/* Alignment */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onMouseDown={preventFocusLoss}
        onClick={() => onFormat({ textAlign: 'left' })}
        title="Align Left"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onMouseDown={preventFocusLoss}
        onClick={() => onFormat({ textAlign: 'center' })}
        title="Align Center"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onMouseDown={preventFocusLoss}
        onClick={() => onFormat({ textAlign: 'right' })}
        title="Align Right"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </Button>

      {/* Lists (only for default mode) */}
      {allowBullets && (
        <>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={preventFocusLoss}
            onClick={() => onFormat({ listType: 'bullet' })}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={preventFocusLoss}
            onClick={() => onFormat({ listType: 'number' })}
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
