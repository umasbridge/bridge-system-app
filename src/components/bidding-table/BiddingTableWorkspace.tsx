import { useState, useRef, useEffect, useCallback } from 'react';
import { BiddingTable, RowData } from './BiddingTable';
import { Button } from '../ui/button';
import { ResizableElement } from '../element-look-and-feel/ResizableElement';
import { BiddingTableFormatPanel } from './BiddingTableFormatPanel';
import { BaseElement } from '../element-look-and-feel/types';

interface GridlineOptions {
  enabled: boolean;
  color: string;
  width: number;
}

interface TableElement extends BaseElement {
  type: 'bidding-table';
  initialRows?: RowData[];
  gridlines?: GridlineOptions;
}

interface TableWrapperProps {
  table: TableElement;
  isSelected: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onSelect: () => void;
  onUpdate: (updates: Partial<BaseElement>) => void;
  onDelete: () => void;
  onFormat: () => void;
  onRowsChange: (rows: RowData[]) => void;
  onContentSizeChange: (width: number, height: number) => void;
}

function TableWrapper({
  table,
  isSelected,
  containerRef,
  onSelect,
  onUpdate,
  onDelete,
  onFormat,
  onRowsChange,
  onContentSizeChange
}: TableWrapperProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    // Create a ResizeObserver to watch for content size changes
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use borderBoxSize for more accurate measurements including borders
        const borderBoxSize = entry.borderBoxSize?.[0];
        if (borderBoxSize) {
          const width = Math.ceil(borderBoxSize.inlineSize);
          const height = Math.ceil(borderBoxSize.blockSize);
          onContentSizeChange(width, height);
        } else {
          // Fallback to contentRect
          const { width, height } = entry.contentRect;
          const borderWidth = (table.borderWidth || 0) * 2;
          onContentSizeChange(Math.ceil(width) + borderWidth, Math.ceil(height) + borderWidth);
        }
      }
    });

    resizeObserverRef.current.observe(contentRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [onContentSizeChange, table.borderWidth]);

  return (
    <ResizableElement
      element={table}
      isSelected={isSelected}
      containerRef={containerRef}
      showFormatButton={true}
      actions={{
        onSelect,
        onUpdate,
        onDelete,
        onFormat
      }}
      data-table-element
    >
      <div 
        ref={contentRef}
        className="inline-block overflow-visible"
        style={{
          border: table.borderWidth && table.borderWidth > 0 && table.borderColor !== 'transparent'
            ? `${table.borderWidth}px solid ${table.borderColor}`
            : 'none'
        }}
      >
        <BiddingTable 
          initialRows={table.initialRows} 
          gridlines={table.gridlines}
          onRowsChange={onRowsChange}
        />
      </div>
    </ResizableElement>
  );
}

/**
 * BiddingTableWorkspace Component
 * 
 * A complete workspace for creating and managing multiple bidding tables.
 * Tables can be freely positioned, dragged, and resized.
 * 
 * Usage:
 * ```tsx
 * import { BiddingTableWorkspace } from './components/bidding-table';
 * 
 * function App() {
 *   return <BiddingTableWorkspace />;
 * }
 * ```
 */
export function BiddingTableWorkspace({ hideControls = false }: { hideControls?: boolean }) {
  const [tables, setTables] = useState<TableElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formatPanelId, setFormatPanelId] = useState<string | null>(null);
  const [deletedTable, setDeletedTable] = useState<TableElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track current rows for each table so we can restore them properly
  const tableRowsRef = useRef<Map<string, RowData[]>>(new Map());

  const handleInsertTable = () => {
    const newTable: TableElement = {
      id: Math.random().toString(36).substring(7),
      type: 'bidding-table',
      position: { x: 20, y: 100 + tables.length * 50 },
      size: { width: 680, height: 200 },
      zIndex: tables.length,
      borderColor: 'transparent',
      borderWidth: 0,
      gridlines: {
        enabled: false,
        color: '#D1D5DB',
        width: 1
      }
    };
    setTables([...tables, newTable]);
  };

  const handleUpdate = (id: string, updates: Partial<BaseElement>) => {
    setTables(tables.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDelete = (id: string) => {
    const tableToDelete = tables.find(t => t.id === id);
    if (!tableToDelete) return;
    
    // Get the current rows for this table before deleting
    const currentRows = tableRowsRef.current.get(id);
    const tableWithCurrentRows = {
      ...tableToDelete,
      initialRows: currentRows
    };
    
    setTables(tables.filter(t => t.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (formatPanelId === id) setFormatPanelId(null);
    
    // Show undo button at the deleted table's position with the current rows
    setDeletedTable(tableWithCurrentRows);
    
    // Remove from rows tracking
    tableRowsRef.current.delete(id);
    
    // Auto-hide after 20 seconds
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    undoTimerRef.current = setTimeout(() => {
      setDeletedTable(null);
    }, 20000);
  };

  const handleUndo = () => {
    if (deletedTable) {
      setTables(prev => [...prev, deletedTable]);
      // Restore rows tracking
      if (deletedTable.initialRows) {
        tableRowsRef.current.set(deletedTable.id, deletedTable.initialRows);
      }
      setDeletedTable(null);
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    }
  };

  const handleRowsChange = (tableId: string, rows: RowData[]) => {
    tableRowsRef.current.set(tableId, rows);
  };

  const handleTableContentSizeChange = (tableId: string, width: number, height: number) => {
    setTables(tables => tables.map(t => 
      t.id === tableId 
        ? { ...t, size: { width, height } } 
        : t
    ));
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedId(null);
    }
  };

  const selectedTable = tables.find(t => t.id === formatPanelId);

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Button Section */}
      {!hideControls && (
        <div className="relative z-10 bg-gray-50 border-b border-gray-200">
          <div className="max-w-4xl mx-auto pt-8 pb-4">
            <div className="flex gap-2">
              <Button onClick={handleInsertTable}>
                Insert Bidding Table
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas for tables */}
      <div 
        ref={containerRef}
        className={`relative w-full ${hideControls ? 'min-h-screen' : 'min-h-[calc(100vh-80px)]'}`}
        onClick={handleContainerClick}
      >
        {tables.map((table) => (
          <TableWrapper
            key={table.id}
            table={table}
            isSelected={selectedId === table.id}
            containerRef={containerRef}
            onSelect={() => setSelectedId(table.id)}
            onUpdate={(updates) => handleUpdate(table.id, updates)}
            onDelete={() => handleDelete(table.id)}
            onFormat={() => setFormatPanelId(table.id)}
            onRowsChange={(rows) => handleRowsChange(table.id, rows)}
            onContentSizeChange={(width, height) => handleTableContentSizeChange(table.id, width, height)}
          />
        ))}

        {/* Format Panel */}
        {selectedTable && formatPanelId && (
          <BiddingTableFormatPanel
            element={selectedTable}
            onUpdate={(updates) => handleUpdate(formatPanelId, updates)}
            onClose={() => setFormatPanelId(null)}
          />
        )}

        {/* Undo Button - appears at deleted table's position */}
        {deletedTable && (
          <div
            className="absolute pointer-events-auto"
            style={{
              left: `${deletedTable.position.x}px`,
              top: `${deletedTable.position.y}px`,
              zIndex: 10000
            }}
          >
            <Button
              onClick={handleUndo}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              Undo Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
