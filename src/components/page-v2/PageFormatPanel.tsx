import { useState, useRef, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, ChevronDown } from 'lucide-react';
import type { Page } from '@/types';

interface PageFormatPanelProps {
  page: Page;
  onUpdate: (updates: Partial<Page>) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

const BORDER_COLORS = [
  '#000000', '#374151', '#6b7280', '#9ca3af', '#d1d5db',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
];

const FILL_COLORS = [
  'transparent', '#ffffff', '#f9fafb', '#f3f4f6', '#e5e7eb',
  '#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7',
  '#dbeafe', '#e0e7ff', '#f3e8ff', '#fce7f3',
];

const BORDER_WIDTHS = [0, 1, 2, 3, 4];

const DEFAULT_ELEMENT_SPACING = 43;
const DEFAULT_LEFT_MARGIN = 20;
const DEFAULT_TOP_MARGIN = 20;

export function PageFormatPanel({ page, onUpdate, onClose, position }: PageFormatPanelProps) {
  const [showBorderColor, setShowBorderColor] = useState(false);
  const [showFillColor, setShowFillColor] = useState(false);
  const [showMargins, setShowMargins] = useState(false);
  const [showSpacing, setShowSpacing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ left: position.x, top: position.y + 10 });

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    // Use the page container's bottom (scrollable content area) rather than viewport
    const scrollParent = el.closest('.overflow-auto');
    const bottomLimit = scrollParent
      ? scrollParent.getBoundingClientRect().bottom
      : window.innerHeight - 10;
    let left = Math.max(10, position.x);
    let top = position.y + 10;
    // If overflows right, shift left
    if (left + rect.width > vw - 10) left = vw - rect.width - 10;
    // If overflows bottom, position above click point
    if (top + rect.height > bottomLimit) top = position.y - rect.height - 10;
    // Clamp
    left = Math.max(10, left);
    top = Math.max(10, top);
    setAdjustedPos({ left, top });
  }, [position, showMargins, showSpacing, showBorderColor, showFillColor]);

  const borderWidth = page.pageBorderWidth ?? 0;
  const borderColor = page.pageBorderColor || '#000000';
  const backgroundColor = page.backgroundColor || 'transparent';
  const leftMargin = page.leftMargin ?? DEFAULT_LEFT_MARGIN;
  const topMargin = page.topMargin ?? DEFAULT_TOP_MARGIN;
  const elementSpacing = page.elementSpacing ?? DEFAULT_ELEMENT_SPACING;

  return (
    <div
      ref={panelRef}
      data-page-format-panel
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-64"
      style={{
        left: adjustedPos.left,
        top: adjustedPos.top,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-sm">Page Format</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Line Width */}
      <div className="mb-4">
        <Label className="text-xs text-gray-500 mb-2 block">Line Width</Label>
        <div className="flex gap-1">
          {BORDER_WIDTHS.map(w => (
            <button
              key={w}
              className={`w-8 h-8 rounded border text-xs ${
                borderWidth === w
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => onUpdate({
                pageBorderWidth: w,
                pageBorderColor: w === 0 ? 'transparent' : (borderColor === 'transparent' ? '#000000' : borderColor),
              })}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Line Color */}
      <div className="mb-4">
        <Label className="text-xs text-gray-500 mb-2 block">Line Color</Label>
        <div className="relative">
          <button
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded w-full hover:bg-gray-50"
            onClick={() => {
              setShowBorderColor(!showBorderColor);
              setShowFillColor(false);
            }}
          >
            <span
              className="w-5 h-5 rounded border border-gray-300"
              style={{ backgroundColor: borderColor === 'transparent' ? '#000000' : borderColor }}
            />
            <span className="text-sm flex-1 text-left">
              {borderColor === 'transparent' ? '#000000' : borderColor}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
          {showBorderColor && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg p-2 z-10 grid grid-cols-5 gap-1">
              {BORDER_COLORS.map(color => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onUpdate({ pageBorderColor: color, pageBorderWidth: Math.max(1, borderWidth) });
                    setShowBorderColor(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fill Color */}
      <div className="mb-4">
        <Label className="text-xs text-gray-500 mb-2 block">Background</Label>
        <div className="relative">
          <button
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded w-full hover:bg-gray-50"
            onClick={() => {
              setShowFillColor(!showFillColor);
              setShowBorderColor(false);
            }}
          >
            <span
              className="w-5 h-5 rounded border border-gray-300"
              style={{
                backgroundColor: backgroundColor === 'transparent' ? 'white' : backgroundColor,
                backgroundImage: backgroundColor === 'transparent'
                  ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                  : 'none',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
              }}
            />
            <span className="text-sm flex-1 text-left">
              {backgroundColor === 'transparent' ? 'None' : backgroundColor}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
          {showFillColor && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg p-2 z-10 grid grid-cols-4 gap-1">
              {FILL_COLORS.map(color => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: color === 'transparent' ? 'white' : color,
                    backgroundImage: color === 'transparent'
                      ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                      : 'none',
                    backgroundSize: '6px 6px',
                    backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                  }}
                  onClick={() => {
                    onUpdate({ backgroundColor: color });
                    setShowFillColor(false);
                  }}
                  title={color === 'transparent' ? 'No fill' : color}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Margins - collapsible */}
      <div className="mb-4">
        <button
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2"
          onClick={() => setShowMargins(!showMargins)}
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${showMargins ? '' : '-rotate-90'}`} />
          Margins ({leftMargin}px / {topMargin}px)
        </button>
        {showMargins && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Side</span>
                <input
                  type="number"
                  value={leftMargin}
                  onChange={(e) => onUpdate({ leftMargin: Math.max(0, Math.min(200, Number(e.target.value))) })}
                  min="0" max="200"
                  style={{ width: '100%', height: '28px', padding: '2px 6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Top</span>
                <input
                  type="number"
                  value={topMargin}
                  onChange={(e) => onUpdate({ topMargin: Math.max(0, Math.min(200, Number(e.target.value))) })}
                  min="0" max="200"
                  style={{ width: '100%', height: '28px', padding: '2px 6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>
            </div>
            <div className="flex gap-1">
              {[10, 20, 40, 60].map(m => (
                <button
                  key={m}
                  className={`flex-1 py-1 rounded border text-xs ${
                    leftMargin === m && topMargin === m
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => onUpdate({ leftMargin: m, topMargin: m })}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Element Spacing - collapsible */}
      <div className="mb-2">
        <button
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2"
          onClick={() => setShowSpacing(!showSpacing)}
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${showSpacing ? '' : '-rotate-90'}`} />
          Element Spacing ({elementSpacing}px)
        </button>
        {showSpacing && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <input
                type="range"
                min="0" max="100"
                value={elementSpacing}
                onChange={(e) => onUpdate({ elementSpacing: Number(e.target.value) })}
                style={{ flex: 1, accentColor: '#3b82f6' }}
              />
              <input
                type="number"
                value={elementSpacing}
                onChange={(e) => onUpdate({ elementSpacing: Math.max(0, Math.min(100, Number(e.target.value))) })}
                min="0" max="100"
                style={{ width: '48px', height: '28px', padding: '2px 6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', textAlign: 'center' }}
              />
            </div>
            <div className="flex gap-1">
              {[20, 30, 43, 60].map(s => (
                <button
                  key={s}
                  className={`flex-1 py-1 rounded border text-xs ${
                    elementSpacing === s
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => onUpdate({ elementSpacing: s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
