import { useState } from 'react';
import { X } from 'lucide-react';
import { TextEl } from '@/components/elements/TextEl';
import type { GridlineOptions, HyperlinkTarget } from '@/types';

// Total row height should be mygap (43px)
// py-1.5 padding = 6px top + 6px bottom = 12px
// borders = 1px top + 1px bottom = 2px
// So content minHeight = 43 - 12 - 2 = 29px
const DEFAULT_ROW_MIN_HEIGHT = 29;

interface BidTableNameHeaderProps {
  name: string;
  htmlContent?: string;
  onUpdate: (name: string, htmlContent?: string) => void;
  onDelete: () => void;
  tableWidth: number;
  gridlines?: GridlineOptions;
  isViewMode?: boolean;
  availablePages?: Array<{ id: string; name: string }>;
  onHyperlinkClick?: (target: HyperlinkTarget) => void;
  rowMinHeight?: number;
}

export function BidTableNameHeader({
  name,
  htmlContent,
  onUpdate,
  onDelete,
  tableWidth,
  gridlines,
  isViewMode,
  availablePages = [],
  onHyperlinkClick,
  rowMinHeight,
}: BidTableNameHeaderProps) {
  const headerWidth = tableWidth;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '100%',
        backgroundColor: 'white',
        borderBottom: gridlines?.enabled
          ? `${gridlines.width}px ${gridlines.style || 'solid'} ${gridlines.color}`
          : '1px solid #D1D5DB',
        borderLeft: gridlines?.enabled
          ? `${gridlines.width}px ${gridlines.style || 'solid'} ${gridlines.color}`
          : '1px solid #D1D5DB',
        borderTop: gridlines?.enabled
          ? `${gridlines.width}px ${gridlines.style || 'solid'} ${gridlines.color}`
          : '1px solid #D1D5DB',
      }}
    >
      <div className="px-2 py-1.5">
        <TextEl
          mode="cell"
          value={name}
          htmlValue={htmlContent}
          onChange={(text, html) => onUpdate(text, html)}
          placeholder="Table name"
          minHeight={rowMinHeight ?? DEFAULT_ROW_MIN_HEIGHT}
          readOnly={isViewMode}
          availablePages={availablePages}
          onHyperlinkClick={onHyperlinkClick}
        />
      </div>

      {/* Delete Button - Shows on hover (hidden in view mode) */}
      {isHovered && !isViewMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-white/90 border border-red-300 text-red-600 rounded hover:bg-red-50 shadow-sm"
          title="Delete name row"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
