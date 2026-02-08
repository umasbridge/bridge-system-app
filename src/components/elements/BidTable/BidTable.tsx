import { useState, useEffect, useCallback } from 'react';
import { Undo } from 'lucide-react';
import { BidTableRow } from './BidTableRow';
import { BidTableNameHeader } from './BidTableNameHeader';
import type { RowData, GridlineOptions, HyperlinkTarget } from '@/types';

interface BidTableProps {
  initialRows?: RowData[];
  gridlines?: GridlineOptions;
  initialLevelWidths?: Record<number, number>;
  initialMeaningWidth?: number;
  initialName?: string;
  initialNameHtml?: string;
  initialShowName?: boolean;
  onRowsChange?: (rows: RowData[]) => void;
  onLevelWidthsChange?: (levelWidths: Record<number, number>) => void;
  onMeaningWidthChange?: (meaningWidth: number) => void;
  onNameChange?: (name: string) => void;
  onNameHtmlChange?: (htmlContent: string) => void;
  onShowNameChange?: (showName: boolean) => void;
  isViewMode?: boolean;
  isActive?: boolean;
  availablePages?: Array<{ id: string; name: string }>;
  onHyperlinkClick?: (target: HyperlinkTarget) => void;
  maxWidth?: number;
  defaultRowHeight?: number;
  onDefaultRowHeightChange?: (height: number) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

// Helper function to recursively collapse all rows that have children
const collapseAllRows = (rows: RowData[]): RowData[] => {
  return rows.map(row => {
    if (row.children.length > 0) {
      return {
        ...row,
        collapsed: true,
        children: collapseAllRows(row.children)
      };
    }
    return row;
  });
};

export function BidTable({
  initialRows,
  gridlines,
  initialLevelWidths,
  initialMeaningWidth,
  initialName,
  initialNameHtml,
  initialShowName = true,
  onRowsChange,
  onLevelWidthsChange,
  onMeaningWidthChange,
  onNameChange,
  onNameHtmlChange,
  onShowNameChange,
  isViewMode = false,
  isActive = true,
  availablePages = [],
  onHyperlinkClick,
  maxWidth,
  defaultRowHeight,
  onDefaultRowHeightChange,
  isSelected = false,
  onSelect,
}: BidTableProps) {
  const [rows, setRows] = useState<RowData[]>(() => {
    if (initialRows) {
      return collapseAllRows(initialRows);
    }
    return [
      {
        id: '1',
        bid: '',
        bidFillColor: undefined,
        meaning: '',
        children: []
      }
    ];
  });

  const [history, setHistory] = useState<RowData[][]>([]);
  const [showUndoHighlight, setShowUndoHighlight] = useState(false);
  const [undoTimeoutId, setUndoTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [levelWidths, setLevelWidths] = useState<Record<number, number>>(
    initialLevelWidths || { 0: 80 }
  );

  const [meaningWidth, setMeaningWidth] = useState<number>(() => {
    const initial = initialMeaningWidth || 680;
    // Ensure meaning column is usable: meaningWidth must exceed bid column width
    const level0BidWidth = (initialLevelWidths?.[0]) || 80;
    return Math.max(initial, level0BidWidth + 100);
  });
  const [name, setName] = useState<string>(initialName || '');
  const [nameHtml, setNameHtml] = useState<string | undefined>(initialNameHtml);
  const [showName, setShowName] = useState<boolean>(initialShowName);

  // Copy/paste state
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);

  const generateId = () => Math.random().toString(36).substring(7);

  // Helper to find a row by ID
  const findRowById = (rows: RowData[], id: string): RowData | null => {
    for (const row of rows) {
      if (row.id === id) return row;
      if (row.children.length > 0) {
        const found = findRowById(row.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Deep clone a row with new IDs
  const cloneRowWithNewIds = (row: RowData): RowData => {
    return {
      ...row,
      id: generateId(),
      children: row.children.map(child => cloneRowWithNewIds(child))
    };
  };

  // Copy the focused row - stores in sessionStorage for cross-table pasting
  const copyRow = (rowId: string) => {
    const row = findRowById(rows, rowId);
    if (row) {
      const rowCopy = JSON.parse(JSON.stringify(row));
      sessionStorage.setItem('copiedTableRow', JSON.stringify(rowCopy));
      console.log('[BidTable] Copied row to sessionStorage:', row.bid || '(empty bid)');
    }
  };

  // Get copied row from sessionStorage
  const getCopiedRow = (): RowData | null => {
    const stored = sessionStorage.getItem('copiedTableRow');
    if (stored) {
      try {
        return JSON.parse(stored) as RowData;
      } catch {
        return null;
      }
    }
    return null;
  };

  // Helper to check if a row is blank (empty bid and meaning)
  const isRowBlank = (row: RowData): boolean => {
    const bidEmpty = !row.bid && !row.bidHtml;
    const meaningEmpty = !row.meaning && !row.meaningHtml;
    return bidEmpty && meaningEmpty && row.children.length === 0;
  };

  // Paste copied row - replaces target if blank, otherwise inserts below
  const pasteRow = (targetRowId: string) => {
    const copiedRow = getCopiedRow();
    if (!copiedRow) return;

    // Clear undo history on paste action
    setHistory([]);
    setShowUndoHighlight(false);
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
      setUndoTimeoutId(null);
    }

    const targetRow = findRowById(rows, targetRowId);
    const shouldReplace = targetRow && isRowBlank(targetRow);

    const clonedRow = cloneRowWithNewIds(copiedRow);

    const pasteRecursive = (rows: RowData[]): RowData[] => {
      const index = rows.findIndex(row => row.id === targetRowId);
      if (index !== -1) {
        if (shouldReplace) {
          const replacementRow = { ...clonedRow, id: targetRowId };
          return [...rows.slice(0, index), replacementRow, ...rows.slice(index + 1)];
        } else {
          return [...rows.slice(0, index + 1), clonedRow, ...rows.slice(index + 1)];
        }
      }
      return rows.map(row => ({
        ...row,
        children: pasteRecursive(row.children)
      }));
    };

    const updatedRows = pasteRecursive(rows);
    setRows(updatedRows);
    onRowsChange?.(updatedRows);
    console.log('[BidTable] Pasted row', shouldReplace ? 'replacing blank:' : 'after:', targetRowId);
  };

  const saveToHistory = (currentRows: RowData[]) => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(currentRows))]);

    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
    }

    const timeoutId = setTimeout(() => {
      setHistory([]);
      setShowUndoHighlight(false);
    }, 60000);

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
      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      // Copy row: Ctrl/Cmd + Shift + C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        if (focusedRowId) {
          e.preventDefault();
          copyRow(focusedRowId);
        }
      }
      // Paste row: Ctrl/Cmd + Shift + V
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        if (focusedRowId && getCopiedRow()) {
          e.preventDefault();
          pasteRow(focusedRowId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedRowId]);

  const updateRow = (
    id: string,
    updates: Partial<Pick<RowData, 'bid' | 'bidHtml' | 'bidFillColor' | 'meaning' | 'meaningHtml' | 'isMerged'>>
  ) => {
    // Clear undo history on any edit action
    setHistory([]);
    setShowUndoHighlight(false);

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

  const updateName = (newName: string, newHtmlContent?: string) => {
    setName(newName);
    onNameChange?.(newName);
    if (newHtmlContent !== undefined) {
      setNameHtml(newHtmlContent);
      onNameHtmlChange?.(newHtmlContent);
    }
  };

  const deleteName = () => {
    setShowName(false);
    onShowNameChange?.(false);
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
    setHistory([]);
    setShowUndoHighlight(false);

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

  const addSiblingAboveRow = (id: string) => {
    setHistory([]);
    setShowUndoHighlight(false);

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
        return [...rows.slice(0, index), newRow, ...rows.slice(index)];
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
    setHistory([]);
    setShowUndoHighlight(false);

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
          return { ...row, collapsed: false, children: [...row.children, newChild] };
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
    setHistory([]);
    setShowUndoHighlight(false);

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

    setShowUndoHighlight(true);
    setTimeout(() => setShowUndoHighlight(false), 2000);
  };

  const toggleCollapsed = (id: string) => {
    const toggleRecursive = (rows: RowData[]): RowData[] => {
      return rows.map(row => {
        if (row.id === id) {
          const newCollapsedState = !row.collapsed;

          if (newCollapsedState === false && row.children.length > 0) {
            const updatedChildren = row.children.map(child => {
              if (child.children.length > 0 && !child.collapsed) {
                return { ...child, collapsed: true };
              }
              return child;
            });
            return { ...row, collapsed: newCollapsedState, children: updatedChildren };
          }

          return { ...row, collapsed: newCollapsedState };
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

  const toggleMerge = (id: string) => {
    const toggleRecursive = (rows: RowData[]): RowData[] => {
      return rows.map(row => {
        if (row.id === id) {
          return { ...row, isMerged: !row.isMerged };
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

  // Calculate total table width
  const level0BidWidth = levelWidths[0] || 80;
  const level0ActualMeaningWidth = Math.max(20, meaningWidth - level0BidWidth);
  const totalTableWidth = level0BidWidth + level0ActualMeaningWidth;

  return (
    <div
      className="inline-block relative"
      style={{
        ...(isSelected ? { boxShadow: '0 0 0 2px white, 0 0 0 4px #3b82f6', borderRadius: '4px' } : {}),
      }}
      onClick={(e) => {
        if (!onSelect) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const edge = 6;
        if (x < edge || x > rect.width - edge || y < edge || y > rect.height - edge) {
          onSelect();
        }
      }}
    >
      <div style={{
        borderTop: gridlines?.enabled
          ? `${gridlines.width}px ${gridlines.style || 'solid'} ${gridlines.color}`
          : '1px solid #D1D5DB',
        borderRight: gridlines?.enabled
          ? `${gridlines.width}px ${gridlines.style || 'solid'} ${gridlines.color}`
          : '1px solid #D1D5DB'
      }}>
        {/* Name Header Row */}
        {name && showName && (
          <BidTableNameHeader
            name={name}
            htmlContent={nameHtml}
            onUpdate={updateName}
            onDelete={deleteName}
            meaningWidth={meaningWidth}
            tableWidth={totalTableWidth}
            gridlines={gridlines}
            isViewMode={isViewMode}
            availablePages={availablePages}
            onHyperlinkClick={onHyperlinkClick}
            rowMinHeight={defaultRowHeight}
          />
        )}

        {rows.map(row => (
          <BidTableRow
            key={row.id}
            row={row}
            level={0}
            getLevelWidth={getLevelWidth}
            getIndentWidth={getIndentWidth}
            onUpdateLevelWidth={updateLevelWidth}
            onUpdate={updateRow}
            onAddSibling={addSiblingRow}
            onAddSiblingAbove={addSiblingAboveRow}
            onAddChild={addChildRow}
            onAddParentSibling={addParentSiblingRow}
            onDelete={deleteRow}
            onToggleCollapsed={toggleCollapsed}
            onToggleMerge={toggleMerge}
            meaningWidth={meaningWidth}
            onUpdateMeaningWidth={updateMeaningWidth}
            gridlines={gridlines}
            isViewMode={isViewMode}
            isActive={isActive}
            onRowFocus={setFocusedRowId}
            onCopyRow={copyRow}
            onPasteRow={pasteRow}
            availablePages={availablePages}
            onHyperlinkClick={onHyperlinkClick}
            maxWidth={maxWidth}
            rowMinHeight={defaultRowHeight}
          />
        ))}
      </div>

      {/* Undo Button */}
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
