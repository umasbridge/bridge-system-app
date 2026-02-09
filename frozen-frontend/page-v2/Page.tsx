import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Copy, Trash2 } from 'lucide-react';
import { TextEl } from '@/components/elements/TextEl';
import { BidTable } from '@/components/elements/BidTable';
import { TitleBar } from './TitleBar';
import { DescBar } from './DescBar';
import { PageFormatPanel } from './PageFormatPanel';
import type { Page as PageType, Element, TextElement, BidTableElement, GridlineOptions, HyperlinkTarget, RowData } from '@/types';

const A4_WIDTH = 794;
const PAGE_PADDING = 40; // p-5 = 20px each side
const MAX_CONTENT_WIDTH = A4_WIDTH - PAGE_PADDING;
const MIN_PAGE_WIDTH = 300;
const TITLE_ID = '__title__';

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

interface PageProps {
  page: PageType;
  onPageChange?: (updates: Partial<PageType>) => void;
  onElementChange?: (elementId: string, updates: Partial<Element>) => void;
  onAddElement?: (type: 'text' | 'bidtable') => void;
  onDeleteElement?: (elementId: string) => void;
  onMoveElement?: (elementId: string, direction: 'up' | 'down') => void;
  onPasteTable?: (rows: RowData[], name: string, options?: { width?: number; levelWidths?: Record<number, number>; gridlines?: any; defaultRowHeight?: number }) => void;
  isViewMode?: boolean;
  onExit?: () => void;
  availablePages?: Array<{ id: string; name: string }>;
  onHyperlinkClick?: (target: HyperlinkTarget) => void;
  embedded?: boolean; // When true, uses 100% width instead of fixed A4 width
  parentSideMargin?: number; // Override side margin (inherit from main page)
}

/**
 * Page - Unified page component
 *
 * Types:
 * - comment: Popup conventions (fits content up to A4)
 * - system: Chapter pages (A4 height with scroll)
 * - system + isMain: Main page with TitleBar + DescBar
 */
export function Page({
  page,
  onPageChange,
  onElementChange,
  onAddElement,
  onDeleteElement,
  onMoveElement,
  onPasteTable,
  isViewMode = false,
  onExit,
  availablePages = [],
  onHyperlinkClick,
  embedded = false,
  parentSideMargin,
}: PageProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [copiedTable, setCopiedTable] = useState<{ rows: RowData[]; name: string; width?: number; levelWidths?: Record<number, number>; gridlines?: any; defaultRowHeight?: number } | null>(null);
  const [pageFormatPosition, setPageFormatPosition] = useState<{ x: number; y: number } | null>(null);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showBorderColorPicker, setShowBorderColorPicker] = useState(false);
  const [showFillColorPicker, setShowFillColorPicker] = useState(false);
  const [showGridlineColorPicker, setShowGridlineColorPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset color pickers when selection changes
  useEffect(() => {
    setShowBorderColorPicker(false);
    setShowFillColorPicker(false);
    setShowGridlineColorPicker(false);
  }, [selectedElementId]);

  // Check for copied table in sessionStorage
  useEffect(() => {
    const checkCopiedTable = () => {
      const copied = sessionStorage.getItem('copiedBidTable');
      if (copied) {
        try {
          setCopiedTable(JSON.parse(copied));
        } catch {
          setCopiedTable(null);
        }
      } else {
        setCopiedTable(null);
      }
    };

    checkCopiedTable();
    // Listen for storage events (cross-tab)
    window.addEventListener('storage', checkCopiedTable);
    // Also check periodically for same-tab updates
    const interval = setInterval(checkCopiedTable, 500);

    return () => {
      window.removeEventListener('storage', checkCopiedTable);
      clearInterval(interval);
    };
  }, []);

  // Click outside to deselect and close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelectedElementId(null);
      }
      // Close insert menu only if click is outside it
      const insertMenu = document.querySelector('[data-insert-menu]');
      if (!insertMenu || !insertMenu.contains(e.target as Node)) {
        setShowInsertMenu(false);
      }
      // Close page format panel if click is outside it
      const panel = document.querySelector('[data-page-format-panel]');
      if (panel && !panel.contains(e.target as Node)) {
        setPageFormatPosition(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Border click detection on the content area (8px from edge → open format panel)
  const handleContentAreaClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isViewMode) return;
    const area = contentAreaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    const edge = 8;
    const isOnBorder = x < edge || x > w - edge || y < edge || y > h - edge;
    if (isOnBorder) {
      e.stopPropagation();
      setPageFormatPosition({ x: e.clientX, y: e.clientY });
      setSelectedElementId(null);
    } else {
      // Deselect if click landed on the content area or its padding wrapper,
      // not inside an element's interactive area (those stopPropagation themselves)
      const target = e.target as HTMLElement;
      const isOnContentArea = target === e.currentTarget || target.parentElement === e.currentTarget;
      if (isOnContentArea) {
        setSelectedElementId(null);
      }
    }
  }, [isViewMode]);

  // Handle hyperlink click — deselect element before navigating
  const handleHyperlinkClick = useCallback((target: HyperlinkTarget) => {
    setSelectedElementId(null);
    onHyperlinkClick?.(target);
  }, [onHyperlinkClick]);

  // Handle paste table
  const handlePasteTable = useCallback(() => {
    if (copiedTable && onPasteTable) {
      onPasteTable(copiedTable.rows, copiedTable.name, {
        width: copiedTable.width,
        levelWidths: copiedTable.levelWidths,
        gridlines: copiedTable.gridlines,
        defaultRowHeight: copiedTable.defaultRowHeight,
      });
    }
  }, [copiedTable, onPasteTable]);

  // Handle copy table
  const handleCopyElement = useCallback((element: Element) => {
    if (element.type === 'bidtable') {
      const tableEl = element as BidTableElement;
      const tableCopy = {
        rows: JSON.parse(JSON.stringify(tableEl.rows)),
        name: tableEl.name || 'Copied Table',
        width: tableEl.width,
        levelWidths: tableEl.levelWidths,
        gridlines: tableEl.gridlines,
        defaultRowHeight: tableEl.defaultRowHeight,
      };
      sessionStorage.setItem('copiedBidTable', JSON.stringify(tableCopy));
    }
  }, []);

  const isMainSystem = page.type === 'system' && page.isMain;

  // Sort elements by order
  const sortedElements = [...page.elements].sort((a, b) => a.order - b.order);

  // Calculate dynamic page width from widest element
  const leftMargin = parentSideMargin ?? page.leftMargin ?? 20; // inherit from parent or page setting
  const rightMargin = page.topMargin ?? 20; // topMargin field repurposed as right margin
  const wrapperPadding = 8; // 4px padding on each side of bidtable wrapper
  const dynamicPageWidth = useMemo(() => {
    let widestElement = 0;
    for (const el of page.elements) {
      if (el.type === 'bidtable') {
        const tableEl = el as BidTableElement;
        const bidW = (tableEl.levelWidths[0] || 80);
        const totalW = Math.max(tableEl.width || 400, bidW + 20) + wrapperPadding;
        widestElement = Math.max(widestElement, totalW);
      } else if (el.type === 'text') {
        const textEl = el as TextElement;
        if (textEl.width) {
          widestElement = Math.max(widestElement, textEl.width);
        }
      }
    }
    if (widestElement === 0) return MIN_PAGE_WIDTH;
    return Math.max(widestElement + leftMargin + rightMargin, MIN_PAGE_WIDTH);
  }, [page.elements, leftMargin, rightMargin]);

  // Handle element updates
  const handleElementUpdate = useCallback((elementId: string, updates: Partial<Element>) => {
    onElementChange?.(elementId, updates);
  }, [onElementChange]);

  // Handle element selection via mousedown capture phase
  // (capture phase fires before children's stopPropagation can block bubbling)
  const handleElementMouseDown = (_e: React.MouseEvent, elementId: string) => {
    setSelectedElementId(elementId);
  };

  // Render a single element with controls
  const renderElement = (element: Element, index: number, total: number) => {
    const isFirst = index === 0;
    const isLast = index === total - 1;
    const isSelected = selectedElementId === element.id;

    // Render element controls toolbar (shows above selected element)
    const renderControls = () => {
      if (isViewMode || !isSelected) return null;

      const textEl = element.type === 'text' ? element as TextElement : null;

      return (
        <div
          style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.95)', border: '1px solid #d1d5db', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', padding: '2px 4px', zIndex: 20 }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Text element format controls */}
          {textEl && (
            <>
              {/* Border width buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                {BORDER_WIDTHS.map(w => (
                  <button
                    key={w}
                    onClick={() => handleElementUpdate(element.id, { borderWidth: w } as Partial<TextElement>)}
                    style={{
                      width: '20px', height: '20px', fontSize: '10px',
                      border: (textEl.borderWidth ?? 2) === w ? '2px solid #3b82f6' : '1px solid #d1d5db',
                      borderRadius: '3px',
                      backgroundColor: (textEl.borderWidth ?? 2) === w ? '#eff6ff' : 'white',
                      color: (textEl.borderWidth ?? 2) === w ? '#2563eb' : '#374151',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}
                    title={`Border width: ${w}px`}
                  >
                    {w}
                  </button>
                ))}
              </div>
              {/* Border color swatch */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => { setShowBorderColorPicker(!showBorderColorPicker); setShowFillColorPicker(false); }}
                  style={{
                    width: '20px', height: '20px',
                    backgroundColor: textEl.borderColor || '#d1d5db',
                    border: '2px solid #9ca3af', borderRadius: '3px', cursor: 'pointer',
                  }}
                  title="Border color"
                />
                {showBorderColorPicker && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '6px', zIndex: 30, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px' }}>
                    {BORDER_COLORS.map(color => (
                      <button
                        key={color}
                        style={{ width: '22px', height: '22px', backgroundColor: color, border: textEl.borderColor === color ? '2px solid #3b82f6' : '1px solid #d1d5db', borderRadius: '3px', cursor: 'pointer' }}
                        onClick={() => { handleElementUpdate(element.id, { borderColor: color } as Partial<TextElement>); setShowBorderColorPicker(false); }}
                      />
                    ))}
                  </div>
                )}
              </div>
              {/* Fill color swatch */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => { setShowFillColorPicker(!showFillColorPicker); setShowBorderColorPicker(false); }}
                  style={{
                    width: '20px', height: '20px',
                    backgroundColor: textEl.fillColor === 'transparent' || !textEl.fillColor ? 'white' : textEl.fillColor,
                    backgroundImage: textEl.fillColor === 'transparent' || !textEl.fillColor
                      ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                      : 'none',
                    backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                    border: '2px solid #9ca3af', borderRadius: '3px', cursor: 'pointer',
                  }}
                  title="Fill color"
                />
                {showFillColorPicker && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '6px', zIndex: 30, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px' }}>
                    {FILL_COLORS.map(color => (
                      <button
                        key={color}
                        style={{
                          width: '22px', height: '22px',
                          backgroundColor: color === 'transparent' ? 'white' : color,
                          backgroundImage: color === 'transparent'
                            ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                            : 'none',
                          backgroundSize: '6px 6px', backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                          border: textEl.fillColor === color ? '2px solid #3b82f6' : '1px solid #d1d5db',
                          borderRadius: '3px', cursor: 'pointer',
                        }}
                        onClick={() => { handleElementUpdate(element.id, { fillColor: color } as Partial<TextElement>); setShowFillColorPicker(false); }}
                        title={color === 'transparent' ? 'No fill' : color}
                      />
                    ))}
                  </div>
                )}
              </div>
              {/* Separator */}
              <div style={{ width: '1px', height: '16px', backgroundColor: '#d1d5db', margin: '0 2px' }} />
            </>
          )}
          {/* Row height (for tables) */}
          {element.type === 'bidtable' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginRight: '4px' }}>
              <span style={{ fontSize: '11px', color: '#6B7280', whiteSpace: 'nowrap' }}>Row H:</span>
              <input
                type="number"
                min={20}
                max={60}
                value={(element as BidTableElement).defaultRowHeight ?? 29}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  const val = Math.min(60, Math.max(20, Number(e.target.value)));
                  handleElementUpdate(element.id, { defaultRowHeight: val } as Partial<BidTableElement>);
                }}
                style={{ width: '40px', height: '22px', fontSize: '11px', padding: '0 2px', border: '1px solid #D1D5DB', borderRadius: '3px', textAlign: 'center' }}
              />
            </div>
          )}
          {/* Gridline color (for tables) */}
          {element.type === 'bidtable' && (() => {
            const tbl = element as BidTableElement;
            const glColor = tbl.gridlines?.enabled ? tbl.gridlines.color : '#D1D5DB';
            return (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => { setShowGridlineColorPicker(!showGridlineColorPicker); }}
                  style={{
                    width: '20px', height: '20px',
                    backgroundColor: glColor,
                    border: '2px solid #9ca3af', borderRadius: '3px', cursor: 'pointer',
                  }}
                  title="Gridline color"
                />
                {showGridlineColorPicker && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '6px', zIndex: 30, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px' }}>
                    {BORDER_COLORS.map(color => (
                      <button
                        key={color}
                        style={{ width: '22px', height: '22px', backgroundColor: color, border: glColor === color ? '2px solid #3b82f6' : '1px solid #d1d5db', borderRadius: '3px', cursor: 'pointer' }}
                        onClick={() => {
                          const gl: GridlineOptions = { enabled: true, color, width: tbl.gridlines?.width || 1, style: tbl.gridlines?.style || 'solid' };
                          handleElementUpdate(element.id, { gridlines: gl } as Partial<BidTableElement>);
                          setShowGridlineColorPicker(false);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          {/* Copy (for tables) */}
          {element.type === 'bidtable' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleCopyElement(element); }}
              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
              title="Copy table"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
          {/* Move up */}
          {onMoveElement && !isFirst && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveElement(element.id, 'up'); }}
              className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              title="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          )}
          {/* Move down */}
          {onMoveElement && !isLast && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveElement(element.id, 'down'); }}
              className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              title="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
          {/* Delete */}
          {onDeleteElement && (
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteElement(element.id); setSelectedElementId(null); }}
              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
              title="Delete element"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    };

    switch (element.type) {
      case 'text': {
        const textEl = element as TextElement;
        return (
          <div
            key={element.id}
            className="relative"
          >
            {renderControls()}
            <TextEl
              mode={textEl.mode}
              value={textEl.content}
              htmlValue={textEl.htmlContent}
              onChange={(text, html) => handleElementUpdate(element.id, {
                content: text,
                htmlContent: html,
              } as Partial<TextElement>)}
              readOnly={isViewMode}
              availablePages={availablePages}
              onHyperlinkClick={handleHyperlinkClick}
              borderColor={textEl.borderColor}
              borderWidth={textEl.borderWidth}
              fillColor={textEl.fillColor}
              isSelected={isSelected}
              onSelect={() => setSelectedElementId(element.id)}
              onFocus={() => setSelectedElementId(null)}
              width={textEl.width}
              maxWidth={MAX_CONTENT_WIDTH}
              onWidthChange={(w) => handleElementUpdate(element.id, { width: w } as Partial<TextElement>)}
            />
          </div>
        );
      }

      case 'bidtable': {
        const tableEl = element as BidTableElement;
        return (
          <div
            key={element.id}
            className="relative"
          >
            {renderControls()}
            <BidTable
              initialRows={tableEl.rows}
              initialName={tableEl.name}
              initialNameHtml={tableEl.nameHtml}
              initialShowName={tableEl.showName}
              initialLevelWidths={tableEl.levelWidths}
              width={tableEl.width}
              gridlines={tableEl.gridlines}
              onRowsChange={(rows) => handleElementUpdate(element.id, { rows } as Partial<BidTableElement>)}
              onNameChange={(name) => handleElementUpdate(element.id, { name } as Partial<BidTableElement>)}
              onNameHtmlChange={(nameHtml) => handleElementUpdate(element.id, { nameHtml } as Partial<BidTableElement>)}
              onShowNameChange={(showName) => handleElementUpdate(element.id, { showName } as Partial<BidTableElement>)}
              onLevelWidthsChange={(levelWidths) => handleElementUpdate(element.id, { levelWidths } as Partial<BidTableElement>)}
              onWidthChange={(width) => handleElementUpdate(element.id, { width } as Partial<BidTableElement>)}
              isViewMode={isViewMode}
              availablePages={availablePages}
              onHyperlinkClick={handleHyperlinkClick}
              maxWidth={MAX_CONTENT_WIDTH}
              defaultRowHeight={tableEl.defaultRowHeight}
              onDefaultRowHeightChange={(height) => handleElementUpdate(element.id, { defaultRowHeight: height } as Partial<BidTableElement>)}
              isSelected={isSelected}
              onSelect={() => setSelectedElementId(element.id)}
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  // Compute content area border
  const hasPageBorder = page.pageBorderWidth && page.pageBorderColor && page.pageBorderColor !== 'transparent';
  const contentBorderStyle = hasPageBorder
    ? `${page.pageBorderWidth}px solid ${page.pageBorderColor}`
    : 'none';

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full overflow-hidden relative ${embedded ? '' : 'rounded-sm shadow-lg'}`}
      style={{
        width: dynamicPageWidth,
        maxHeight: '100%',
        backgroundColor: 'white',
        border: embedded ? 'none' : '2px solid #d1d5db',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setSelectedElementId(null); }}
    >
      {/* Title Bar + Exit button — same for all pages */}
      <div data-popup-header style={{ position: 'relative', flexShrink: 0 }}>
        <TitleBar
          title={page.title}
          titleHtml={page.titleHtml}
          onChange={(title, titleHtml) => onPageChange?.({ title, titleHtml })}
          readOnly={isViewMode}
          isSelected={selectedElementId === TITLE_ID}
          onSelect={() => setSelectedElementId(TITLE_ID)}
          onFocus={() => setSelectedElementId(null)}
          width={page.titleWidth}
          maxWidth={MAX_CONTENT_WIDTH}
          onWidthChange={(w) => onPageChange?.({ titleWidth: w })}
          paddingLeft={leftMargin}
          paddingRight={rightMargin}
        />
        {onExit && (
          <button
            onClick={onExit}
            style={{ position: 'absolute', top: '2px', right: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#6b7280', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', zIndex: 5 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
            title={isMainSystem ? 'Exit to dashboard' : 'Close'}
          >
            ×
          </button>
        )}
      </div>

      {/* Description Bar - for main system pages (always visible, outside content border) */}
      {isMainSystem && page.description !== undefined && (
        <DescBar
          description={page.description || ''}
          descriptionHtml={page.descriptionHtml}
          onChange={(description, descriptionHtml) => onPageChange?.({ description, descriptionHtml })}
          readOnly={isViewMode}
          onFocus={() => setSelectedElementId(null)}
        />
      )}

      {/* Content Area - scrollable, gets page border (top/bottom lines only) + background */}
      <div
        ref={contentAreaRef}
        className="flex-1 overflow-auto"
        style={{
          backgroundColor: page.backgroundColor || 'white',
          borderTop: contentBorderStyle !== 'none' ? contentBorderStyle : '1px solid #e5e7eb',
          borderBottom: contentBorderStyle !== 'none' ? contentBorderStyle : '1px solid #e5e7eb',
        }}
        onClick={handleContentAreaClick}
      >
        <div
          style={{
            paddingTop: '20px',
            paddingLeft: `${leftMargin}px`,
            paddingRight: `${rightMargin}px`,
            paddingBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: `${page.elementSpacing ?? 43}px`,
          }}
        >
          {sortedElements.map((element, index) => renderElement(element, index, sortedElements.length))}
        </div>
      </div>

      {/* Bottom Button Bar — Insert + Paste (document editing operations only) */}
      {(() => {
        const showInsert = !isViewMode && !!onAddElement;
        const showPaste = !isViewMode && !!copiedTable && !!onPasteTable;
        if (!showInsert && !showPaste) return null;

        return (
          <div style={{ background: 'white', borderTop: '1px solid #e5e7eb', flexShrink: 0, padding: `12px ${leftMargin}px` }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {showInsert && (
                <div style={{ position: 'relative' }}>
                  <Button
                    onClick={() => setShowInsertMenu(prev => !prev)}
                    variant="outline"
                  >
                    Insert
                  </Button>
                  {showInsertMenu && (
                    <div
                      data-insert-menu
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        marginBottom: '4px',
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        zIndex: 30,
                        minWidth: '120px',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        onClick={() => { onAddElement!('bidtable'); setShowInsertMenu(false); }}
                        style={{ display: 'block', width: '100%', padding: '8px 12px', fontSize: '14px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        Table
                      </button>
                      <button
                        onClick={() => { onAddElement!('text'); setShowInsertMenu(false); }}
                        style={{ display: 'block', width: '100%', padding: '8px 12px', fontSize: '14px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        Text
                      </button>
                    </div>
                  )}
                </div>
              )}
              {showPaste && (
                <Button
                  onClick={handlePasteTable}
                  variant="outline"
                  style={{ borderColor: '#22c55e', color: '#15803d' }}
                >
                  Paste
                </Button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Page Format Panel */}
      {pageFormatPosition && !isViewMode && onPageChange && (
        <PageFormatPanel
          page={page}
          onUpdate={(updates) => onPageChange(updates)}
          onClose={() => setPageFormatPosition(null)}
          position={pageFormatPosition}
        />
      )}
    </div>
  );
}
