import { useState } from 'react';
import { X } from 'lucide-react';
import { RichTextCell } from './RichTextCell';

interface GridlineOptions {
  enabled: boolean;
  color: string;
  width: number;
  style?: 'solid' | 'dashed' | 'dotted' | 'double';
}

interface SystemsTableNameHeaderProps {
  name: string;
  onUpdate: (name: string, htmlContent?: string) => void;
  onDelete: () => void;
  meaningWidth: number;
  gridlines?: GridlineOptions;
}

export function SystemsTableNameHeader({
  name,
  onUpdate,
  onDelete,
  meaningWidth,
  gridlines
}: SystemsTableNameHeaderProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: `${meaningWidth}px`,
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
        <RichTextCell
          value={name}
          htmlValue={undefined}
          onChange={(text, html) => onUpdate(text, html)}
          placeholder="Table name"
          minHeight={20}
          columnWidth={meaningWidth}
        />
      </div>

      {/* Delete Button - Shows on hover */}
      {isHovered && (
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
