import { useState, useRef, useEffect } from 'react';
import { Palette, ChevronRight, ChevronDown } from 'lucide-react';
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
    applyHyperlinkFn?: (workspaceName: string, linkType: 'comment' | 'new-page') => void,
    selectedText?: string
  ) => void;
  workspaceId?: string;
  elementId?: string;
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
  elementId
}: SystemsTableRowProps) {
  const [isHovered, setIsHovered] = useState(false);
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
  };

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
          }}
        >
          <div className="pl-1.5 pr-1 py-1.5 flex items-center relative" data-column-type="bid">
            {/* Collapse/Expand Icon - Shows when row has children */}
            {row.children.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapsed(row.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="mr-1 p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                title={row.collapsed ? "Expand" : "Collapse"}
              >
                {row.collapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-gray-600" />
                )}
              </button>
            )}

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
              />
            </div>

            {/* Color Picker Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`ml-1 p-1 rounded hover:bg-gray-200 transition-opacity ${
                isHovered || showColorPicker ? 'opacity-100' : 'opacity-0'
              }`}
              title="Set fill color"
            >
              <Palette className="h-3 w-3 text-gray-600" />
            </button>
            
            {/* Color Picker Popover */}
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 z-50">
                <ColorPicker
                  currentColor={row.bidFillColor}
                  onColorSelect={handleColorSelect}
                  onClose={() => setShowColorPicker(false)}
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
          />

          {/* Action Buttons - Inside meaning column, extreme right */}
          {isHovered && (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
