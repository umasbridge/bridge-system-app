import { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  Unlink,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextFormat, TextElMode } from '@/types';

interface TextFormatPanelProps {
  mode: TextElMode;
  onFormat: (format: TextFormat) => void;
  onOpenHyperlink: () => void;
  onRemoveHyperlink: () => void;
  isHyperlinkSelected: boolean;
  position: { x: number; y: number };
}

const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

// Bold colors for text
const TEXT_COLORS = [
  '#000000', '#374151', '#6b7280', '#9ca3af',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
];

// Translucent highlighter colors
const HIGHLIGHT_COLORS = [
  '#fef08a', // yellow (classic highlighter)
  '#bbf7d0', // green
  '#fecaca', // red/pink
  '#bfdbfe', // blue
  '#e9d5ff', // purple
  '#fed7aa', // orange
  '#99f6e4', // teal
  '#fce7f3', // pink
];

/**
 * Inline text formatting panel - shown when text is selected
 * Contains: bold, italic, underline, strikethrough, font size, colors, hyperlinks
 */
export function TextFormatPanel({
  mode,
  onFormat,
  onOpenHyperlink,
  onRemoveHyperlink,
  isHyperlinkSelected,
  position,
}: TextFormatPanelProps) {
  const [showFontSize, setShowFontSize] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showBgColor, setShowBgColor] = useState(false);

  const allowHyperlinks = mode !== 'title';

  return (
    <div
      data-format-panel
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex items-center gap-0.5"
      style={{
        left: Math.max(10, position.x - 120),
        top: Math.max(10, position.y - 45),
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      {/* Bold */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat({ bold: true })}
        title="Bold (Cmd+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>

      {/* Italic */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat({ italic: true })}
        title="Italic (Cmd+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>

      {/* Underline */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat({ underline: true })}
        title="Underline (Cmd+U)"
      >
        <Underline className="h-4 w-4" />
      </Button>

      {/* Strikethrough */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onFormat({ strikethrough: true })}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Font Size Dropdown */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => {
            setShowFontSize(!showFontSize);
            setShowTextColor(false);
            setShowBgColor(false);
          }}
        >
          Size
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
        {showFontSize && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg py-1 z-10">
            {FONT_SIZES.map(size => (
              <button
                key={size}
                className="block w-full px-3 py-1 text-left text-sm hover:bg-gray-100"
                onClick={() => {
                  onFormat({ fontSize: size });
                  setShowFontSize(false);
                }}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Text Color */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => {
            setShowTextColor(!showTextColor);
            setShowFontSize(false);
            setShowBgColor(false);
          }}
          title="Text Color"
        >
          <span className="w-4 h-4 border border-gray-300 rounded" style={{ background: 'linear-gradient(to bottom right, #ef4444, #3b82f6)' }} />
        </Button>
        {showTextColor && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg p-2 z-10 grid grid-cols-4 gap-1">
            {TEXT_COLORS.map(color => (
              <button
                key={color}
                className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => {
                  onFormat({ color });
                  setShowTextColor(false);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Background Color */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => {
            setShowBgColor(!showBgColor);
            setShowFontSize(false);
            setShowTextColor(false);
          }}
          title="Highlight Color"
        >
          <span className="w-4 h-4 border border-gray-300 rounded bg-yellow-200" />
        </Button>
        {showBgColor && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg p-2 z-10 grid grid-cols-4 gap-1">
            {HIGHLIGHT_COLORS.map(color => (
              <button
                key={color}
                className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => {
                  onFormat({ backgroundColor: color });
                  setShowBgColor(false);
                }}
              />
            ))}
            <button
              className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform bg-white text-xs"
              onClick={() => {
                onFormat({ backgroundColor: 'transparent' });
                setShowBgColor(false);
              }}
              title="Remove highlight"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Hyperlink (not for title mode) */}
      {allowHyperlinks && (
        <>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          {isHyperlinkSelected ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500"
              onClick={onRemoveHyperlink}
              title="Remove Link"
            >
              <Unlink className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onOpenHyperlink}
              title="Add Link"
            >
              <Link className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
