import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Resizable } from 're-resizable';
import { TextEl } from '@/components/elements/TextEl';
import { ColorPicker } from './ColorPicker';
import type { RowData, GridlineOptions, HyperlinkTarget } from '@/types';

// Default row min height
const DEFAULT_ROW_MIN_HEIGHT = 29;

interface BidTableRowProps {
  row: RowData;
  level: number;
  getLevelWidth: (level: number) => number;
  getIndentWidth: (level: number) => number;
  onUpdateLevelWidth: (level: number, width: number) => void;
  onUpdate: (id: string, updates: Partial<Pick<RowData, 'bid' | 'bidHtml' | 'bidFillColor' | 'meaning' | 'meaningHtml' | 'isMerged'>>) => void;
  onAddSibling: (id: string) => void;
  onAddSiblingAbove: (id: string) => void;
  onAddChild: (id: string) => void;
  onAddParentSibling: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleCollapsed: (id: string) => void;
  onToggleMerge: (id: string) => void;
  meaningWidth: number;
  onUpdateMeaningWidth: (width: number) => void;
  gridlines?: GridlineOptions;
  isViewMode?: boolean;
  isActive?: boolean;
  onRowFocus?: (rowId: string | null) => void;
  onCopyRow?: (rowId: string) => void;
  onPasteRow?: (rowId: string) => void;
  availablePages?: Array<{ id: string; name: string }>;
  onHyperlinkClick?: (target: HyperlinkTarget) => void;
  maxWidth?: number;
  rowMinHeight?: number;
}

export function BidTableRow({
  row,
  level,
  getLevelWidth,
  getIndentWidth,
  onUpdateLevelWidth,
  onUpdate,
  onAddSibling,
  onAddSiblingAbove,
  onAddChild,
  onAddParentSibling,
  onDelete,
  onToggleCollapsed,
  onToggleMerge,
  meaningWidth,
  onUpdateMeaningWidth,
  gridlines,
  isViewMode = false,
  isActive = true,
  onRowFocus,
  onCopyRow,
  onPasteRow,
  availablePages = [],
  onHyperlinkClick,
  maxWidth,
  rowMinHeight,
}: BidTableRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isBottomBorderHovered, setIsBottomBorderHovered] = useState(false);
  const [isCellSelected, setIsCellSelected] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const rowRef = useRef<HTMLDivElement>(null);
  const bidCellRef = useRef<HTMLDivElement>(null);

  const bidColumnWidth = getLevelWidth(level);
  const indentWidth = getIndentWidth(level);
  const actualMeaningWidth = Math.max(20, meaningWidth - indentWidth - bidColumnWidth);

  // Keyboard shortcuts for row operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isHovered) return;

      const target = e.target as HTMLElement;
      if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === '+') {
        e.preventDefault();
        if (e.shiftKey) {
          onAddChild(row.id);
        } else {
          onAddSibling(row.id);
        }
      } else if (e.key === '-') {
        e.preventDefault();
        if (level > 0) {
          onAddParentSibling(row.id);
        }
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        onDelete(row.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHovered, row.id, level, onAddSibling, onAddChild, onAddParentSibling, onDelete]);

  const handleResizeStop = (_e: any, _direction: any, _ref: any, d: any) => {
    let newWidth = bidColumnWidth + d.width;
    if (maxWidth) {
      const currentTotal = bidColumnWidth + actualMeaningWidth;
      const newTotal = newWidth + actualMeaningWidth;
      if (newTotal > maxWidth) {
        newWidth = maxWidth - actualMeaningWidth;
      }
    }
    onUpdateLevelWidth(level, Math.max(20, newWidth));
  };

  const handleColorSelect = (color: string | undefined) => {
    onUpdate(row.id, { bidFillColor: color });
    setShowColorPicker(false);
    setIsCellSelected(false);
  };

  const handleCornerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isCellSelected && bidCellRef.current) {
      const rect = bidCellRef.current.getBoundingClientRect();
      setColorPickerPosition({ x: rect.left, y: rect.bottom + 4 });
    }

    setIsCellSelected(!isCellSelected);
    setShowColorPicker(!isCellSelected);
  };

  // Close selection when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isCellSelected) return;

      const target = e.target as HTMLElement;
      const isCornerIndicator = target.closest('[title="Click to select cell for fill color"]');
      const isColorPicker = target.closest('[data-color-picker]');
      const isCollapseTriangle = target.closest('[title="Expand"]') || target.closest('[title="Collapse"]');

      if (isCornerIndicator || isColorPicker || isCollapseTriangle) {
        return;
      }

      setIsCellSelected(false);
      setShowColorPicker(false);
    };

    if (isCellSelected) {
      document.addEventListener('mousedown', handleClickOutside, true);
      return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }
  }, [isCellSelected]);

  return (
    <div>
      {/* Main Row */}
      <div
        ref={rowRef}
        className="flex items-stretch relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Indent Space */}
        {indentWidth > 0 && (
          <div
            style={{ width: `${indentWidth}px` }}
            className="flex-shrink-0"
          />
        )}

        {/* Bid Column - Resizable (hidden when merged) */}
        {!row.isMerged && (
          <Resizable
            size={{ width: bidColumnWidth, height: 'auto' }}
            onResizeStop={handleResizeStop}
            enable={{
              right: isActive,
              top: false,
              bottom: false,
              left: false,
              topRight: false,
              bottomRight: false,
              bottomLeft: false,
              topLeft: false,
            }}
            handleStyles={{
              right: {
                width: '4px',
                right: '0',
                cursor: 'col-resize',
              },
            }}
            handleClasses={{
              right: 'hover:bg-blue-400',
            }}
            className="flex-shrink-0"
            style={{
              backgroundColor: row.bidFillColor || 'white',
              borderBottom: gridlines?.enabled
                ? `${gridlines.width}px ${gridlines.style || 'solid'} ${gridlines.color}`
                : '1px solid #D1D5DB',
              borderLeft: gridlines?.enabled
                ? `${gridlines.width}px ${gridlines.style || 'solid'} ${gridlines.color}`
                : '1px solid #D1D5DB',
              borderTop: gridlines?.enabled
                ? `${gridlines.width}px ${gridlines.style || 'solid'} ${gridlines.color}`
                : '1px solid #D1D5DB',
              boxShadow: isCellSelected ? 'inset 0 0 0 2px #3B82F6' : 'none',
            }}
          >
            <div ref={bidCellRef} className="pl-1.5 pr-1 py-1.5 flex items-center relative" data-column-type="bid">
              <div className="flex-1 relative">
                {/* TextEl for bid cell */}
                <TextEl
                  mode="cell"
                  value={row.bid}
                  htmlValue={row.bidHtml}
                  onChange={(text, html) => onUpdate(row.id, { bid: text, bidHtml: html })}
                  placeholder="Bid"
                  minHeight={rowMinHeight ?? DEFAULT_ROW_MIN_HEIGHT}
                  readOnly={isViewMode}
                  onFocus={() => onRowFocus?.(row.id)}
                  availablePages={availablePages}
                  onHyperlinkClick={onHyperlinkClick}
                />

                {/* Collapse/Expand Triangle */}
                {row.children.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleCollapsed(row.id);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="absolute cursor-pointer hover:opacity-80 transition-opacity"
                    title={row.collapsed ? "Expand" : "Collapse"}
                    data-collapse-triangle="true"
                    style={{
                      bottom: '-6px',
                      right: '-4px',
                      width: '12px',
                      height: '12px',
                      backgroundColor: '#3B82F6',
                      clipPath: row.collapsed
                        ? 'polygon(0 0, 100% 100%, 0 100%)'
                        : 'polygon(0 0, 100% 0, 100% 100%)',
                      zIndex: 10,
                      pointerEvents: 'auto',
                    }}
                  />
                )}

                {/* Corner Indicator for fill color */}
                {!isViewMode && (
                  <div
                    onClick={handleCornerClick}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`absolute top-0 right-0 w-3 h-3 cursor-pointer transition-opacity ${
                      isHovered || isCellSelected ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      backgroundColor: isCellSelected ? '#3B82F6' : '#9CA3AF',
                      clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
                    }}
                    title="Click to select cell for fill color"
                  />
                )}
              </div>

              {/* Color Picker Portal */}
              {showColorPicker && !isViewMode && createPortal(
                <div
                  data-color-picker
                  style={{
                    position: 'fixed',
                    left: colorPickerPosition.x,
                    top: colorPickerPosition.y,
                    zIndex: 9999
                  }}
                >
                  <ColorPicker
                    currentColor={row.bidFillColor}
                    onColorSelect={handleColorSelect}
                    onClose={() => {
                      setShowColorPicker(false);
                      setIsCellSelected(false);
                    }}
                  />
                </div>,
                document.body
              )}
            </div>
          </Resizable>
        )}

        {/* Meaning Column - Resizable */}
        <Resizable
          key={`meaning-${meaningWidth}-${indentWidth}-${bidColumnWidth}-${row.isMerged}`}
          size={{ width: row.isMerged ? bidColumnWidth + actualMeaningWidth : actualMeaningWidth, height: 'auto' }}
          onResizeStop={(_e: any, _direction: any, _ref: any, d: any) => {
            let newMeaningWidth = meaningWidth + d.width;
            if (maxWidth) {
              const bidW = getLevelWidth(0);
              const maxMeaningWidth = maxWidth - bidW + bidW; // meaningWidth determines total, so cap it
              // Total table width at level 0 = bidW0 + max(20, meaningWidth - bidW0) ≈ meaningWidth when meaningWidth > bidW0 + 20
              if (newMeaningWidth > maxWidth) {
                newMeaningWidth = maxWidth;
              }
            }
            onUpdateMeaningWidth(Math.max(40, newMeaningWidth));
          }}
          enable={{
            right: isActive,
            top: false,
            bottom: false,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
          handleStyles={{
            right: {
              width: '4px',
              right: '0',
              cursor: 'col-resize',
            },
          }}
          handleClasses={{
            right: 'hover:bg-blue-400',
          }}
          className="pr-1 py-1.5 pl-2"
          style={{
            position: 'relative',
            width: row.isMerged ? bidColumnWidth + actualMeaningWidth : actualMeaningWidth,
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
          {/* TextEl for meaning cell */}
          <TextEl
            mode="cell"
            value={row.meaning}
            htmlValue={row.meaningHtml}
            onChange={(text, html) => onUpdate(row.id, { meaning: text, meaningHtml: html })}
            placeholder="Meaning"
            minHeight={rowMinHeight ?? DEFAULT_ROW_MIN_HEIGHT}
            readOnly={isViewMode}
            onFocus={() => onRowFocus?.(row.id)}
            availablePages={availablePages}
            onHyperlinkClick={onHyperlinkClick}
          />

          {/* Bottom Border Hover Zone for action menu */}
          {!isViewMode && (
            <div
              className="cursor-pointer"
              style={{
                position: 'absolute',
                right: '0',
                bottom: '0',
                height: '12px',
                width: '120px',
                zIndex: 5
              }}
              onMouseEnter={() => setIsBottomBorderHovered(true)}
              onMouseLeave={() => setIsBottomBorderHovered(false)}
            />
          )}

          {/* Action Buttons - Bottom right hover menu */}
          {isBottomBorderHovered && !isViewMode && (
            <div
              className="flex gap-1 bg-white px-1.5 py-0.5 rounded shadow-md border border-gray-200"
              style={{
                position: 'absolute',
                right: '4px',
                bottom: '0',
                transform: 'translateY(50%)',
                zIndex: 20
              }}
              onMouseEnter={() => setIsBottomBorderHovered(true)}
              onMouseLeave={() => setIsBottomBorderHovered(false)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSiblingAbove(row.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="text-xs px-1.5 py-0.5 border border-gray-300 rounded hover:bg-gray-100"
                title="Add Row Above"
              >
                +↑
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSibling(row.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="text-xs px-1.5 py-0.5 border border-gray-300 rounded hover:bg-gray-100"
                title="Add Row Below"
              >
                +↓
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(row.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="text-xs px-1.5 py-0.5 border border-gray-300 rounded hover:bg-gray-100"
                title="Add Response (Child Row)"
              >
                ++
              </button>
              {level > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddParentSibling(row.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="text-xs px-1.5 py-0.5 border border-gray-300 rounded hover:bg-gray-100"
                  title="Add Parent Row (-)"
                >
                  -
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMerge(row.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`text-xs px-1.5 py-0.5 border rounded ${
                  row.isMerged
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-100'
                }`}
                title={row.isMerged ? "Unmerge cells" : "Merge bid and meaning cells"}
              >
                ⇔
              </button>
              {onCopyRow && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyRow(row.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="text-xs px-1.5 py-0.5 border border-gray-300 rounded hover:bg-gray-100"
                  title="Copy row (Ctrl+Shift+C)"
                >
                  📋
                </button>
              )}
              {onPasteRow && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPasteRow(row.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="text-xs px-1.5 py-0.5 border border-green-300 text-green-600 rounded hover:bg-green-50"
                  title="Paste row below (Ctrl+Shift+V)"
                >
                  📥
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(row.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="text-xs px-1.5 py-0.5 border border-red-300 text-red-600 rounded hover:bg-red-50"
                title="Delete (x)"
              >
                x
              </button>
            </div>
          )}
        </Resizable>
      </div>

      {/* Render Children - Only if not collapsed */}
      {row.children.length > 0 && !row.collapsed && (
        <div>
          {row.children.map((child) => (
            <BidTableRow
              key={child.id}
              row={child}
              level={level + 1}
              getLevelWidth={getLevelWidth}
              getIndentWidth={getIndentWidth}
              onUpdateLevelWidth={onUpdateLevelWidth}
              onUpdate={onUpdate}
              onAddSibling={onAddSibling}
              onAddSiblingAbove={onAddSiblingAbove}
              onAddChild={onAddChild}
              onAddParentSibling={onAddParentSibling}
              onDelete={onDelete}
              onToggleCollapsed={onToggleCollapsed}
              onToggleMerge={onToggleMerge}
              meaningWidth={meaningWidth}
              onUpdateMeaningWidth={onUpdateMeaningWidth}
              gridlines={gridlines}
              isViewMode={isViewMode}
              isActive={isActive}
              onRowFocus={onRowFocus}
              onCopyRow={onCopyRow}
              onPasteRow={onPasteRow}
              availablePages={availablePages}
              onHyperlinkClick={onHyperlinkClick}
              maxWidth={maxWidth}
              rowMinHeight={rowMinHeight}
            />
          ))}
        </div>
      )}
    </div>
  );
}
