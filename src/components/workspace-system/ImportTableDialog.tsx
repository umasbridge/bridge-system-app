import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { workspaceOperations, elementOperations } from '../../lib/supabase-db';
import { SystemsTable, RowData } from '../systems-table';
import { parseHtmlTable, parseTabText } from '../../utils/tableParsing';
import { TextFormatPanel, TextFormat } from './TextFormatPanel';

// Sanitize HTML to strip fonts and unwanted styles
function sanitizeTableHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove font-family from all elements
  doc.querySelectorAll('[style]').forEach(el => {
    const style = (el as HTMLElement).style;
    style.fontFamily = '';
    style.fontSize = '';
  });

  // Also remove font tags
  doc.querySelectorAll('font').forEach(fontEl => {
    const span = doc.createElement('span');
    span.innerHTML = fontEl.innerHTML;
    fontEl.parentNode?.replaceChild(span, fontEl);
  });

  return doc.body.innerHTML;
}

interface ImportTableDialogProps {
  onClose: () => void;
  onImportComplete: (workspaceId: string) => void;
}

export function ImportTableDialog({ onClose, onImportComplete }: ImportTableDialogProps) {
  const [tableName, setTableName] = useState('');
  const [rows, setRows] = useState<RowData[]>([]);
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPasted, setHasPasted] = useState(false);
  const pasteAreaRef = useRef<HTMLDivElement>(null);

  // Format panel state
  const [showFormatPanel, setShowFormatPanel] = useState(false);
  const [applyFormatFn, setApplyFormatFn] = useState<((format: TextFormat) => void) | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  // Load existing element names for uniqueness check
  useEffect(() => {
    const loadExistingNames = async () => {
      const elements = await elementOperations.getAll();
      const names = elements
        .filter(el => el.name && el.name.trim())
        .map(el => el.name!.toLowerCase().trim());
      setExistingNames(names);
    };
    loadExistingNames();
  }, []);

  const isNameUnique = tableName.trim() && !existingNames.includes(tableName.toLowerCase().trim());
  const canSave = isNameUnique && rows.length > 0;

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();

    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    let parsedRows: RowData[] = [];

    if (html) {
      // Sanitize HTML to strip fonts before parsing
      const sanitizedHtml = sanitizeTableHtml(html);
      parsedRows = parseHtmlTable(sanitizedHtml);
    }

    if (parsedRows.length === 0 && text) {
      parsedRows = parseTabText(text);
    }

    if (parsedRows.length > 0) {
      setRows(parsedRows);
      setHasPasted(true);
    }
  };

  // Handle rows changes from the embedded SystemsTable
  const handleRowsChange = (newRows: RowData[]) => {
    setRows(newRows);
  };

  // Handle cell focus changes to show/hide format panel
  const handleCellFocusChange = useCallback((
    _rowId: string,
    _column: 'bid' | 'meaning',
    isFocused: boolean,
    formatFn?: (format: TextFormat) => void,
    _hyperlinkFn?: (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page') => void,
    text?: string
  ) => {
    if (isFocused && formatFn) {
      setShowFormatPanel(true);
      setApplyFormatFn(() => formatFn);
      setSelectedText(text || '');
    } else {
      setShowFormatPanel(false);
      setApplyFormatFn(null);
      setSelectedText('');
    }
  }, []);

  // Handle format application
  const handleFormatApply = useCallback((format: TextFormat) => {
    if (applyFormatFn) {
      applyFormatFn(format);
    }
  }, [applyFormatFn]);

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);

    try {
      // Find or create "My Systems Library" workspace
      const workspaces = await workspaceOperations.getAll();
      let libraryWorkspace = workspaces.find(ws => ws.title === 'My Systems Library');

      if (!libraryWorkspace) {
        libraryWorkspace = await workspaceOperations.create('My Systems Library', false);
      }

      // Create the element with proper structure
      await elementOperations.create({
        id: crypto.randomUUID(),
        workspaceId: libraryWorkspace.id,
        type: 'systems-table',
        name: tableName,
        position: { x: 50, y: 50 },
        size: { width: 800, height: 400 },
        zIndex: 1,
        showName: true,
        nameHtmlContent: `<span style="font-weight: 700">${tableName}</span>`,
        initialRows: rows,
        meaningWidth: 600,
        levelWidths: { 0: 80 },
        gridlines: { enabled: false, color: '#D1D5DB', width: 1 }
      } as any);

      onImportComplete(libraryWorkspace.id);
    } catch (err) {
      console.error('Failed to save table:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-lg shadow-2xl flex flex-col"
        style={{ width: showFormatPanel ? '1200px' : '900px', height: '700px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Name Input */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <Label htmlFor="table-name" className="text-base font-medium whitespace-nowrap">
              Table Name:
            </Label>
            <Input
              id="table-name"
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Enter a unique name for this table..."
              className={`flex-1 h-10 text-base ${
                tableName.trim() && !isNameUnique
                  ? 'border-red-400 focus:border-red-500'
                  : ''
              }`}
              autoFocus
            />
          </div>
          {tableName.trim() && !isNameUnique && (
            <p className="text-sm text-red-600 mt-2 ml-28">
              This name already exists. Please choose a unique name.
            </p>
          )}
        </div>

        {/* Main content area - Table on left, Format panel on right */}
        <div className="flex-1 flex overflow-hidden">
          {/* Table Area - Either paste prompt or editable SystemsTable */}
          <div
            ref={pasteAreaRef}
            onPaste={handlePaste}
            tabIndex={0}
            className="flex-1 overflow-auto p-4 focus:outline-none"
            onClick={() => {
              // Only focus paste area when no table is pasted yet (to enable paste)
              // After pasting, let clicks propagate to table cells for editing
              if (!hasPasted) {
                pasteAreaRef.current?.focus();
              }
            }}
          >
            {!hasPasted ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-xl mb-2">Paste your table here</p>
                <p className="text-sm">Copy a table from Microsoft Word or PDF and paste (Ctrl+V / Cmd+V)</p>
                <p className="text-sm mt-2 text-gray-500">Indented rows will become daughter rows</p>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <SystemsTable
                  initialRows={rows}
                  onRowsChange={handleRowsChange}
                  initialShowName={false}
                  gridlines={{ enabled: true, color: '#D1D5DB', width: 1 }}
                  initialLevelWidths={{ 0: 80 }}
                  initialMeaningWidth={600}
                  isViewMode={false}
                  onCellFocusChange={handleCellFocusChange}
                  isActive={true}
                />
              </div>
            )}
          </div>

          {/* Format Panel - Right side */}
          {showFormatPanel && (
            <div className="w-80 border-l border-gray-200 bg-gray-50 p-4 overflow-auto">
              <TextFormatPanel
                position={{ x: 0, y: 0 }}
                onApply={handleFormatApply}
                onClose={() => setShowFormatPanel(false)}
                selectedText={selectedText}
                isSidePanel={true}
              />
            </div>
          )}
        </div>

        {/* Footer with Save/Close */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <Button onClick={onClose} variant="outline" className="px-8">
            Close
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="px-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
