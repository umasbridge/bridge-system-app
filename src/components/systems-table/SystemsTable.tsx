import { useState, useEffect } from 'react';
import { SystemsTableRow } from './SystemsTableRow';
import { Undo } from 'lucide-react';

export interface RowData {
  id: string;
  bid: string;
  bidHtmlContent?: string;
  bidFillColor?: string;
  meaning: string;
  meaningHtmlContent?: string;
  children: RowData[];
  collapsed?: boolean;
}

interface GridlineOptions {
  enabled: boolean;
  color: string;
  width: number;
}

interface SystemsTableProps {
  breadcrumbMode?: boolean;
  initialRows?: RowData[];
  gridlines?: GridlineOptions;
  initialLevelWidths?: { [level: number]: number };
  initialMeaningWidth?: number;
  onRowsChange?: (rows: RowData[]) => void;
  onLevelWidthsChange?: (levelWidths: { [level: number]: number }) => void;
  onMeaningWidthChange?: (meaningWidth: number) => void;
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

export function SystemsTable({
  breadcrumbMode = false,
  initialRows,
  gridlines,
  initialLevelWidths,
  initialMeaningWidth,
  onRowsChange,
  onLevelWidthsChange,
  onMeaningWidthChange,
  onCellFocusChange,
  workspaceId,
  elementId
}: SystemsTableProps) {
  const [rows, setRows] = useState<RowData[]>(
    initialRows || [
      {
        id: '1',
        bid: '',
        bidFillColor: undefined,
        meaning: '',
        children: []
      }
    ]
  );

  const [history, setHistory] = useState<RowData[][]>([]);
  const [showUndoHighlight, setShowUndoHighlight] = useState(false);
  const [isTableHovered, setIsTableHovered] = useState(false);
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [levelWidths, setLevelWidths] = useState<{ [level: number]: number}>(
    initialLevelWidths || { 0: 80 }
  );

  const [meaningWidth, setMeaningWidth] = useState<number>(initialMeaningWidth || 680); // Total table width (80 + 600)

  const generateId = () => Math.random().toString(36).substring(7);

  const saveToHistory = (currentRows: RowData[]) => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(currentRows))]);
    
    // Clear any existing timeout
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
    }
    
    // Set new timeout to clear history after 1 minute
    const timeoutId = setTimeout(() => {
      setHistory([]);
      setShowUndoHighlight(false);
    }, 60000); // 60000ms = 1 minute
    
    setUndoTimeoutId(timeoutId);
  };

  const undo = () => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      
      const previousState = prev[prev.length - 1];
      setRows(previousState);
      return prev.slice(0, -1);
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateRow = (
    id: string, 
    updates: Partial<Pick<RowData, 'bid' | 'bidHtmlContent' | 'bidFillColor' | 'meaning' | 'meaningHtmlContent'>>
  ) => {
    // Clear undo history on any edit action
    setHistory([]);
    setShowUndoHighlight(false);
    
    // Clear the timeout as well
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
      setUndoTimeoutId(null);
    }
    
    const updateRecursive = (rows: RowData[]): RowData[] => {
      return rows.map(row => {
        if (row.id === id) {
          return { ...row, ...updates };
        }
        if (row.children.length > 0) {
          return { ...row, children: updateRecursive(row.children) };
        }
        return row;
      });
    };
    const updatedRows = updateRecursive(rows);
    setRows(updatedRows);
    onRowsChange?.(updatedRows);
  };

  const updateLevelWidth = (level: number, width: number) => {
    const newLevelWidths = { ...levelWidths, [level]: width };
    setLevelWidths(newLevelWidths);
    onLevelWidthsChange?.(newLevelWidths);
  };

  const updateMeaningWidth = (width: number) => {
    setMeaningWidth(width);
    onMeaningWidthChange?.(width);
  };

  const getLevelWidth = (level: number): number => {
    return levelWidths[level] || 80;
  };

  const getIndentWidth = (level: number): number => {
    let total = 0;
    for (let i = 0; i < level; i++) {
      total += getLevelWidth(i);
    }
    return total;
  };

  const addSiblingRow = (id: string) => {
    // Clear undo history on add action
    setHistory([]);
    setShowUndoHighlight(false);
    
    // Clear the timeout as well
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
      setUndoTimeoutId(null);
    }
    
    const addRecursive = (rows: RowData[]): RowData[] => {
      const index = rows.findIndex(row => row.id === id);
      if (index !== -1) {
        const currentRow = rows[index];
        const newRow: RowData = {
          id: generateId(),
          bid: '',
          bidFillColor: currentRow.bidFillColor,
          meaning: '',
          children: []
        };
        return [...rows.slice(0, index + 1), newRow, ...rows.slice(index + 1)];
      }
      return rows.map(row => ({
        ...row,
        children: addRecursive(row.children)
      }));
    };
    const updatedRows = addRecursive(rows);
    setRows(updatedRows);
    onRowsChange?.(updatedRows);
  };

  const addChildRow = (id: string) => {
    // Clear undo history on add action
    setHistory([]);
    setShowUndoHighlight(false);
    
    // Clear the timeout as well
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
      setUndoTimeoutId(null);
    }
    
    const addRecursive = (rows: RowData[]): RowData[] => {
      return rows.map(row => {
        if (row.id === id) {
          const inheritedColor = row.children.length > 0 
            ? row.children[row.children.length - 1].bidFillColor 
            : undefined;
          
          const newChild: RowData = {
            id: generateId(),
            bid: '',
            bidFillColor: inheritedColor,
            meaning: '',
            children: []
          };
          return { ...row, children: [...row.children, newChild] };
        }
        if (row.children.length > 0) {
          return { ...row, children: addRecursive(row.children) };
        }
        return row;
      });
    };
    const updatedRows = addRecursive(rows);
    setRows(updatedRows);
    onRowsChange?.(updatedRows);
  };

  const addParentSiblingRow = (id: string) => {
    // Clear undo history on add action
    setHistory([]);
    setShowUndoHighlight(false);
    
    // Clear the timeout as well
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
      setUndoTimeoutId(null);
    }
    
    const addRecursive = (rows: RowData[], level: number = 0): { rows: RowData[], found: boolean } => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const childIndex = row.children.findIndex(child => child.id === id);
        if (childIndex !== -1) {
          const newRow: RowData = {
            id: generateId(),
            bid: '',
            bidFillColor: row.bidFillColor,
            meaning: '',
            children: []
          };
          const newRows = [...rows.slice(0, i + 1), newRow, ...rows.slice(i + 1)];
          return { rows: newRows, found: true };
        }
      }
      
      const newRows = rows.map(row => {
        if (row.children.length > 0) {
          const result = addRecursive(row.children, level + 1);
          if (result.found) {
            return { ...row, children: result.rows };
          }
        }
        return row;
      });
      
      const found = newRows.some(row => row !== rows.find(r => r.id === row.id));
      return { rows: newRows, found };
    };
    
    const result = addRecursive(rows);
    if (result.found) {
      setRows(result.rows);
      onRowsChange?.(result.rows);
    }
  };

  const deleteRow = (id: string) => {
    saveToHistory(rows);
    const deleteRecursive = (rows: RowData[]): RowData[] => {
      return rows
        .filter(row => row.id !== id)
        .map(row => ({
          ...row,
          children: deleteRecursive(row.children)
        }));
    };
    const updatedRows = deleteRecursive(rows);
    setRows(updatedRows);
    onRowsChange?.(updatedRows);

    // Show highlight after delete
    setShowUndoHighlight(true);
    setTimeout(() => setShowUndoHighlight(false), 2000);
  };

  const toggleCollapsed = (id: string) => {
    const toggleRecursive = (rows: RowData[]): RowData[] => {
      return rows.map(row => {
        if (row.id === id) {
          return { ...row, collapsed: !row.collapsed };
        }
        if (row.children.length > 0) {
          return { ...row, children: toggleRecursive(row.children) };
        }
        return row;
      });
    };
    const updatedRows = toggleRecursive(rows);
    setRows(updatedRows);
    onRowsChange?.(updatedRows);
  };

  return (
    <div
      className="inline-block"
      onMouseEnter={() => setIsTableHovered(true)}
      onMouseLeave={() => setIsTableHovered(false)}
    >
      <div>
        {rows.map(row => (
          <SystemsTableRow
            key={row.id}
            row={row}
            level={0}
            getLevelWidth={getLevelWidth}
            getIndentWidth={getIndentWidth}
            onUpdateLevelWidth={updateLevelWidth}
            onUpdate={updateRow}
            onAddSibling={addSiblingRow}
            onAddChild={addChildRow}
            onAddParentSibling={addParentSiblingRow}
            onDelete={deleteRow}
            onToggleCollapsed={toggleCollapsed}
            breadcrumbMode={breadcrumbMode}
            meaningWidth={meaningWidth}
            onUpdateMeaningWidth={updateMeaningWidth}
            gridlines={gridlines}
            onCellFocusChange={onCellFocusChange}
            workspaceId={workspaceId}
            elementId={elementId}
          />
        ))}
      </div>
      
      {/* Undo Button - At Bottom - Visible only when there's something to undo */}
      {history.length > 0 && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={undo}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm border rounded transition-all ${
              showUndoHighlight
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
            title="Undo Delete (Ctrl+Z or Cmd+Z)"
          >
            <Undo className="h-3.5 w-3.5" />
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
