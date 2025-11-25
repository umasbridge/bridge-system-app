import { useState, useRef, useEffect } from 'react';
import { Resizable } from 're-resizable';
import { RichTextCell } from './RichTextCell';
import { ColorPicker } from './ColorPicker';
import type { RowData } from './SystemsTable';

interface GridlineOptions {
  enabled: boolean;
  color: string;
  width: number;
}

interface SystemsTableRowProps {
  row: RowData;
  level: number;
  getLevelWidth: (level: number) => number;
  getIndentWidth: (level: number) => number;
  onUpdateLevelWidth: (level: number, width: number) => void;
  onUpdate: (id: string, updates: Partial<Pick<RowData, 'bid' | 'bidHtmlContent' | 'bidFillColor' | 'meaning' | 'meaningHtmlContent'>>) => void;
  onAddSibling: (id: string) => void;
  onAddChild: (id: string) => void;
  onAddParentSibling: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleCollapsed: (id: string) => void;
  breadcrumbMode: boolean;
  meaningWidth: number;
  onUpdateMeaningWidth: (width: number) => void;
  gridlines?: GridlineOptions;
  onCellFocusChange?: (
    rowId: string,
    column: 'bid' | 'meaning',
    isFocused: boolean,
    applyFormatFn?: (format: any) => void,
    applyHyperlinkFn?: (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page') => void,
    selectedText?: string
  ) => void;
  workspaceId?: string;
  elementId?: string;
  isViewMode?: boolean;
}

export function SystemsTableRow({
  row,
  level,
  getLevelWidth,
  getIndentWidth,
  onUpdateLevelWidth,
  onUpdate,
  onAddSibling,
  onAddChild,
  onAddParentSibling,
  onDelete,
  onToggleCollapsed,
  breadcrumbMode,
  meaningWidth,
  onUpdateMeaningWidth,
  gridlines,
  onCellFocusChange,
  workspaceId,
  elementId,
  isViewMode = false
}: SystemsTableRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isCellSelected, setIsCellSelected] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const bidColumnWidth = getLevelWidth(level);
  const indentWidth = getIndentWidth(level);
  const actualMeaningWidth = meaningWidth - indentWidth - bidColumnWidth;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isHovered) return;

      // Don't trigger shortcuts when user is typing in a contenteditable cell
      const target = e.target as HTMLElement;
      if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === '+') {
        e.preventDefault();
        // Check if it's ++ (double plus)
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
    const newWidth = bidColumnWidth + d.width;
    onUpdateLevelWidth(level, newWidth);
    // Don't update meaningWidth - it should stay constant so the meaning column shrinks/grows inversely
  };

  const handleColorSelect = (color: string | undefined) => {
    onUpdate(row.id, { bidFillColor: color });
    setShowColorPicker(false);
    setIsCellSelected(false);
  };

  const handleCornerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsCellSelected(!isCellSelected);
    setShowColorPicker(!isCellSelected); // Show picker when selecting, hide when deselecting
  };

  // Close selection when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isCellSelected) return;

      const target = e.target as HTMLElement;

      // Check if clicking on the corner indicator, color picker, or collapse triangle
      const isCornerIndicator = target.closest('[title="Click to select cell for fill color"]');
      const isColorPicker = target.closest('.absolute.left-0.top-full'); // Color picker container
      const isCollapseTriangle = target.closest('[title="Expand"]') || target.closest('[title="Collapse"]');

      // If clicking on corner indicator, color picker, or collapse triangle, don't deselect
      if (isCornerIndicator || isColorPicker || isCollapseTriangle) {
        return;
      }

      // Otherwise, deselect
      setIsCellSelected(false);
      setShowColorPicker(false);
    };

    if (isCellSelected) {
      // Use capture phase to catch events before they're stopped by child handlers
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
        {/* Indent Space - empty vacant space with no borders */}
        {indentWidth > 0 && (
          <div
            style={{
              width: `${indentWidth}px`
            }}
            className="flex-shrink-0"
          />
        )}

        {/* Bid Column - Resizable */}
        <Resizable
          size={{ width: bidColumnWidth, height: 'auto' }}
          onResizeStop={handleResizeStop}
          enable={{
            right: true,
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
          <div className="pl-1.5 pr-1 py-1.5 flex items-center relative" data-column-type="bid">
            <div className="flex-1 relative">
              <RichTextCell
                key={`${row.id}-${bidColumnWidth}`}
                value={row.bid}
                htmlValue={row.bidHtmlContent}
                onChange={(text, html) => onUpdate(row.id, { bid: text, bidHtmlContent: html })}
                placeholder="Bid"
                minHeight={20}
                columnWidth={bidColumnWidth}
                onFocusChange={(isFocused, applyFormatFn, applyHyperlinkFn, selectedText) => {
                  if (onCellFocusChange) {
                    onCellFocusChange(row.id, 'bid', isFocused, applyFormatFn, applyHyperlinkFn, selectedText);
                  }
                }}
                workspaceId={workspaceId}
                elementId={`${elementId}-${row.id}-bid`}
                readOnly={isViewMode}
              />

              {/* Collapse/Expand Triangle - Vertex at bottom right corner, shows when row has children */}
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
                    bottom: '-6px', // Extend to align with cell bottom border (compensate for py-1.5 padding)
                    right: '-4px', // Extend to align with cell edge (compensate for pr-1 padding)
                    width: '12px',
                    height: '12px',
                    backgroundColor: row.collapsed ? '#3B82F6' : '#3B82F6',
                    clipPath: row.collapsed
                      ? 'polygon(0 0, 100% 100%, 0 100%)' // Right-pointing: vertex at right
                      : 'polygon(0 0, 100% 0, 100% 100%)', // Down-pointing: vertex at bottom-right
                    zIndex: 10,
                    pointerEvents: 'auto',
                  }}
                />
              )}

              {/* Corner Indicator - Click to select cell for fill color */}
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

            {/* Color Picker Popover */}
            {showColorPicker && !isViewMode && (
              <div className="absolute top-full left-0 mt-1 z-50">
                <ColorPicker
                  currentColor={row.bidFillColor}
                  onColorSelect={handleColorSelect}
                  onClose={() => {
                    setShowColorPicker(false);
                    setIsCellSelected(false);
                  }}
                />
              </div>
            )}
          </div>
        </Resizable>

        {/* Meaning Column - Resizable */}
        <Resizable
          key={`meaning-${meaningWidth}-${indentWidth}-${bidColumnWidth}`}
          size={{ width: actualMeaningWidth, height: 'auto' }}
          onResizeStop={(_e: any, _direction: any, _ref: any, d: any) => {
            const newWidth = meaningWidth + d.width;
            onUpdateMeaningWidth(newWidth);
          }}
          enable={{
            right: true,
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
          className="pr-1 py-1.5 pl-2 relative"
          style={{
            width: actualMeaningWidth,
            backgroundColor: 'white',
            borderBottom: gridlines?.enabled
              ? `${gridlines.width}px ${gridlines.style || 'solid'} ${gridlines.color}`
              : '1px solid #D1D5DB',
            borderLeft: gridlines?.enabled
              ? `${gridlines.width}px ${gridlines.style || 'solid'} ${gridlines.color}`
              : '1px solid #D1D5DB',
          }}
        >
          <RichTextCell
            value={row.meaning}
            htmlValue={row.meaningHtmlContent}
            onChange={(text, html) => onUpdate(row.id, { meaning: text, meaningHtmlContent: html })}
            placeholder="Meaning"
            minHeight={20}
            columnWidth={actualMeaningWidth}
            onFocusChange={(isFocused, applyFormatFn, applyHyperlinkFn, selectedText) => {
              if (onCellFocusChange) {
                onCellFocusChange(row.id, 'meaning', isFocused, applyFormatFn, applyHyperlinkFn, selectedText);
              }
            }}
            workspaceId={workspaceId}
            elementId={`${elementId}-${row.id}-meaning`}
            readOnly={isViewMode}
          />

          {/* Action Buttons - Inside meaning column, extreme right */}
          {isHovered && !isViewMode && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2 bg-white/90 px-2 py-1 rounded shadow-sm">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSibling(row.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="text-xs px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-100"
                title="Add Row (+)"
              >
                +
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(row.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="text-xs px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-100"
                title="Add Response (Shift +)"
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
                  className="text-xs px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-100"
                  title="Add Parent Row (-)"
                >
                  -
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(row.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="text-xs px-2 py-0.5 border border-red-300 text-red-600 rounded hover:bg-red-50"
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
            <SystemsTableRow
              key={child.id}
              row={child}
              level={level + 1}
              getLevelWidth={getLevelWidth}
              getIndentWidth={getIndentWidth}
              onUpdateLevelWidth={onUpdateLevelWidth}
              onUpdate={onUpdate}
              onAddSibling={onAddSibling}
              onAddChild={onAddChild}
              onAddParentSibling={onAddParentSibling}
              onDelete={onDelete}
              onToggleCollapsed={onToggleCollapsed}
              breadcrumbMode={breadcrumbMode}
              meaningWidth={meaningWidth}
              onUpdateMeaningWidth={onUpdateMeaningWidth}
              gridlines={gridlines}
              onCellFocusChange={onCellFocusChange}
              workspaceId={workspaceId}
              elementId={elementId}
              isViewMode={isViewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
