import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Bold, Italic, Underline, Strikethrough, Highlighter, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, IndentIncrease, IndentDecrease, Link2, Unlink, MessageSquare, Columns, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface TextFormatPanelProps {
  position: { x: number; y: number };
  selectedText: string;
  onClose: () => void;
  onApply: (format: TextFormat) => void;
  onApplyHyperlink?: (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page') => void;
  onRemoveHyperlink?: () => void;
  isHyperlinkSelected?: boolean;
  onDuplicateToWorkspace?: (newWorkspaceName: string, sourceWorkspaceName: string, linkType: 'comment' | 'split-view' | 'new-page') => void;
  existingWorkspaces?: string[]; // All workspaces (for checking if name exists)
  linkedWorkspaces?: string[]; // Non-system workspaces only (for "Use Existing" list)
  isSidePanel?: boolean;
}

export interface TextFormat {
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  listType?: 'bullet' | 'number' | 'none';
  indent?: 'increase' | 'decrease';
}

const COLORS = [
  '#000000', '#DC2626', '#EA580C', '#D97706', '#65A30D',
  '#059669', '#0891B2', '#2563EB', '#7C3AED', '#C026D3'
];

const FONTS = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Comic Sans MS',
  'Trebuchet MS',
  'Impact'
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

export function TextFormatPanel({ position, selectedText, onClose, onApply, onApplyHyperlink, onRemoveHyperlink, isHyperlinkSelected = false, onDuplicateToWorkspace, existingWorkspaces = [], linkedWorkspaces = [], isSidePanel = false }: TextFormatPanelProps) {
  const [format, setFormat] = useState<TextFormat>({
    color: '#000000',
    backgroundColor: 'transparent',
    fontFamily: 'Arial',
    fontSize: 14,
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    textAlign: 'left'
  });

  const [showHyperlinkSection, setShowHyperlinkSection] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(selectedText || '');
  const [linkType, setLinkType] = useState<'comment' | 'split-view' | 'new-page' | null>(null);
  const [showWorkspaceChoiceDialog, setShowWorkspaceChoiceDialog] = useState(false);
  const [showWorkspaceList, setShowWorkspaceList] = useState(false);
  const [pendingWorkspaceName, setPendingWorkspaceName] = useState('');
  const [pendingLinkType, setPendingLinkType] = useState<'comment' | 'split-view' | 'new-page' | null>(null);
  const [workspaceFilter, setWorkspaceFilter] = useState('');
  const [selectedExistingWorkspace, setSelectedExistingWorkspace] = useState('');

  // Update workspace name when selected text changes
  useEffect(() => {
    if (selectedText) {
      setWorkspaceName(selectedText);
    }
  }, [selectedText]);

  const handleFormatChange = (newFormat: Partial<TextFormat>) => {
    const updatedFormat = { ...format, ...newFormat };
    setFormat(updatedFormat);
    // Only apply the specific properties that were changed, not the entire accumulated state
    onApply(newFormat);
  };

  // Different styling for side panel vs floating panel
  const containerStyle = isSidePanel ? {} : {
    left: position.x,
    top: position.y + 10,
    transform: 'translateX(-50%)',
    width: '320px'
  };
  
  const containerClass = isSidePanel
    ? "w-full overflow-hidden"
    : "fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4";

  return (
    <div
      data-text-format-panel
      className={containerClass}
      style={containerStyle}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        // Only prevent default on non-input elements to allow typing
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT' && target.tagName !== 'BUTTON') {
          e.preventDefault();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0 overflow-hidden">
          <h3 className="font-medium whitespace-nowrap">Text Format</h3>
          {selectedText && (
            <p className="text-xs text-gray-500 mt-1 whitespace-nowrap overflow-hidden text-ellipsis" style={{ maxWidth: '140px' }}>
              "{selectedText.length > 20 ? selectedText.slice(0, 20) + '...' : selectedText}"
            </p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0 ml-2">
          {onApplyHyperlink && (
            <Button
              onClick={() => {
                // When opening hyperlink section, refresh workspace name from selected text
                if (!showHyperlinkSection && selectedText) {
                  setWorkspaceName(selectedText);
                }
                setShowHyperlinkSection(!showHyperlinkSection);
              }}
              variant={showHyperlinkSection ? "default" : "outline"}
              size="sm"
              className="h-8 gap-1"
              title="Add Hyperlink"
            >
              <Link2 className="h-4 w-4" />
              Link
            </Button>
          )}
          {isHyperlinkSelected && onRemoveHyperlink && (
            <Button
              onClick={() => {
                onRemoveHyperlink();
              }}
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Remove Hyperlink"
            >
              <Unlink className="h-4 w-4" />
              Unlink
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hyperlink Section */}
      {showHyperlinkSection && onApplyHyperlink && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 space-y-3">
          <div>
            <Label className="text-xs mb-1 block">Workspace Name</Label>
            <Input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Enter workspace name"
              className="w-full"
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Link Type</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => setLinkType('comment')}
                variant={linkType === 'comment' ? 'default' : 'outline'}
                size="sm"
                className="w-full gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Comment
              </Button>
              <Button
                onClick={() => setLinkType('split-view')}
                variant={linkType === 'split-view' ? 'default' : 'outline'}
                size="sm"
                className="w-full gap-2"
              >
                <Columns className="h-4 w-4" />
                Split View
              </Button>
              <Button
                onClick={() => setLinkType('new-page')}
                variant={linkType === 'new-page' ? 'default' : 'outline'}
                size="sm"
                className="w-full gap-2"
              >
                <FileText className="h-4 w-4" />
                New Page
              </Button>
            </div>
          </div>
          <Button
            onClick={() => {
              if (workspaceName.trim() && linkType) {
                // Check if workspace with this name already exists
                const workspaceExists = existingWorkspaces.some(
                  ws => ws.toLowerCase() === workspaceName.trim().toLowerCase()
                );

                if (workspaceExists) {
                  // Workspace exists, link directly to it
                  onApplyHyperlink(workspaceName.trim(), linkType);
                  setWorkspaceName('');
                  setLinkType(null);
                  setShowHyperlinkSection(false);
                } else {
                  // Workspace doesn't exist, show choice dialog
                  setPendingWorkspaceName(workspaceName.trim());
                  setPendingLinkType(linkType);
                  setShowWorkspaceChoiceDialog(true);
                }
              }
            }}
            disabled={!workspaceName.trim() || !linkType}
            className="w-full"
          >
            Apply Hyperlink
          </Button>
        </div>
      )}

      {/* Create Link Dialog - rendered via portal to escape transform context */}
      {showWorkspaceChoiceDialog && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-auto"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 10000 }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-[580px] max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '48px', paddingBottom: '40px' }}>
              <h2 style={{ fontSize: '30px', fontWeight: '800', textAlign: 'center', color: '#111827' }}>
                Create Link
              </h2>
            </div>

            {/* Subtitle - workspace name */}
            <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingBottom: '24px' }}>
              <p className="text-base text-gray-600 text-center">
                Workspace "<span className="font-semibold">{pendingWorkspaceName}</span>" doesn't exist
              </p>
            </div>

            {/* Mode Selection Buttons */}
            <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingBottom: '40px' }}>
              <div className="flex gap-4">
                <Button
                  type="button"
                  onClick={() => setShowWorkspaceList(false)}
                  className="flex-1 h-12 px-8 text-base font-medium"
                  variant={!showWorkspaceList ? 'default' : 'outline'}
                >
                  Create New
                </Button>
                {onDuplicateToWorkspace && linkedWorkspaces.length > 0 && (
                  <Button
                    type="button"
                    onClick={() => {
                      setShowWorkspaceList(true);
                      setSelectedExistingWorkspace('');
                    }}
                    className="flex-1 h-12 px-8 text-base font-medium"
                    variant={showWorkspaceList ? 'default' : 'outline'}
                  >
                    Use Existing
                  </Button>
                )}
              </div>
            </div>

            {/* Content area */}
            <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingBottom: '40px' }}>
              {!showWorkspaceList ? (
                /* Create New mode */
                <div className="text-center text-gray-600 bg-gray-50 rounded-md text-base" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
                  A new empty workspace will be created
                </div>
              ) : (
                /* Use Existing mode - Dropdown Select like OpenSystemDialog */
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-gray-800">
                    Select Workspace to Copy From
                  </Label>
                  <select
                    value={selectedExistingWorkspace}
                    onChange={(e) => setSelectedExistingWorkspace(e.target.value)}
                    className="w-full h-12 rounded-md border-2 border-gray-300 bg-white px-4 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Choose a workspace...</option>
                    {linkedWorkspaces.map((ws, index) => (
                      <option key={index} value={ws}>
                        {ws}
                      </option>
                    ))}
                  </select>
                  {linkedWorkspaces.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No workspaces available</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 rounded-b-lg" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '32px', paddingBottom: '32px' }}>
              <div className="flex gap-4 justify-end">
                <Button
                  type="button"
                  onClick={() => {
                    setShowWorkspaceChoiceDialog(false);
                    setShowWorkspaceList(false);
                    setPendingWorkspaceName('');
                    setPendingLinkType(null);
                    setSelectedExistingWorkspace('');
                  }}
                  variant="outline"
                  style={{ height: '48px', paddingLeft: '40px', paddingRight: '40px' }}
                  className="text-base font-semibold"
                >
                  Cancel
                </Button>
                {!showWorkspaceList ? (
                  /* Create New mode - Done button */
                  <Button
                    type="button"
                    onClick={() => {
                      // Create new empty workspace
                      if (pendingLinkType) {
                        onApplyHyperlink?.(pendingWorkspaceName, pendingLinkType);
                      }
                      setShowWorkspaceChoiceDialog(false);
                      setShowWorkspaceList(false);
                      setWorkspaceName('');
                      setLinkType(null);
                      setShowHyperlinkSection(false);
                      setPendingWorkspaceName('');
                      setPendingLinkType(null);
                    }}
                    style={{ height: '48px', paddingLeft: '40px', paddingRight: '40px' }}
                    className="text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Done
                  </Button>
                ) : (
                  /* Use Existing mode - Done button (duplicates selected workspace AND applies hyperlink) */
                  <Button
                    type="button"
                    onClick={async () => {
                      // Duplicate selected workspace to new name
                      if (pendingLinkType && onDuplicateToWorkspace && selectedExistingWorkspace) {
                        // First create the duplicate workspace (without navigation)
                        await onDuplicateToWorkspace(pendingWorkspaceName, selectedExistingWorkspace, pendingLinkType);
                        // Then apply the hyperlink to the selected text
                        onApplyHyperlink?.(pendingWorkspaceName, pendingLinkType);
                      }
                      setShowWorkspaceChoiceDialog(false);
                      setShowWorkspaceList(false);
                      setWorkspaceName('');
                      setLinkType(null);
                      setShowHyperlinkSection(false);
                      setPendingWorkspaceName('');
                      setPendingLinkType(null);
                      setSelectedExistingWorkspace('');
                    }}
                    disabled={!selectedExistingWorkspace}
                    style={{ height: '48px', paddingLeft: '40px', paddingRight: '40px' }}
                    className="text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  >
                    Done
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Font Family */}
          <div className="mb-3">
            <Label className="text-xs mb-1 block">Font</Label>
            <select
              value={format.fontFamily}
              onChange={(e) => handleFormatChange({ fontFamily: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            >
              {FONTS.map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="mb-3">
            <Label className="text-xs mb-1 block">Size</Label>
            <select
              value={format.fontSize}
              onChange={(e) => handleFormatChange({ fontSize: parseInt(e.target.value) })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            >
              {FONT_SIZES.map(size => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>
          </div>

          {/* Style Buttons */}
          <div className="mb-3">
            <Label className="text-xs mb-1 block">Style</Label>
            <div className="grid grid-cols-4 gap-1">
              <Button
                onClick={() => handleFormatChange({ bold: !format.bold })}
                variant={format.bold ? "default" : "outline"}
                size="sm"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleFormatChange({ italic: !format.italic })}
                variant={format.italic ? "default" : "outline"}
                size="sm"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleFormatChange({ underline: !format.underline })}
                variant={format.underline ? "default" : "outline"}
                size="sm"
              >
                <Underline className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleFormatChange({ strikethrough: !format.strikethrough })}
                variant={format.strikethrough ? "default" : "outline"}
                size="sm"
              >
                <Strikethrough className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Alignment Buttons */}
          <div className="mb-3">
            <Label className="text-xs mb-1 block">Alignment</Label>
            <div className="grid grid-cols-3 gap-1">
              <Button
                onClick={() => handleFormatChange({ textAlign: 'left' })}
                variant={format.textAlign === 'left' ? "default" : "outline"}
                size="sm"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleFormatChange({ textAlign: 'center' })}
                variant={format.textAlign === 'center' ? "default" : "outline"}
                size="sm"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleFormatChange({ textAlign: 'right' })}
                variant={format.textAlign === 'right' ? "default" : "outline"}
                size="sm"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Lists and Indents */}
          <div className="mb-3">
            <Label className="text-xs mb-1 block">Lists & Indents</Label>
            <div className="grid grid-cols-4 gap-1">
              <Button
                onClick={() => {
                  onApply({ listType: 'bullet' });
                }}
                variant="outline"
                size="sm"
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => {
                  onApply({ listType: 'number' });
                }}
                variant="outline"
                size="sm"
                title="Numbered List"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => {
                  onApply({ indent: 'increase' });
                }}
                variant="outline"
                size="sm"
                title="Increase Indent"
              >
                <IndentIncrease className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => {
                  onApply({ indent: 'decrease' });
                }}
                variant="outline"
                size="sm"
                title="Decrease Indent"
              >
                <IndentDecrease className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Text Color */}
          <div className="mb-3">
            <Label className="text-xs mb-1 block">Text Color</Label>
            <div className="grid grid-cols-5 gap-1">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => handleFormatChange({ color })}
                  className="w-8 h-8 rounded border-2 transition-all"
                  style={{
                    backgroundColor: color,
                    borderColor: format.color === color ? '#3B82F6' : '#D1D5DB'
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="color"
                value={format.color}
                onChange={(e) => handleFormatChange({ color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={format.color}
                onChange={(e) => handleFormatChange({ color: e.target.value })}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Highlight Color */}
          <div className="mb-3">
            <Label className="text-xs mb-1 flex items-center gap-1">
              <Highlighter className="h-3 w-3" />
              Highlight
            </Label>
            <div className="grid grid-cols-5 gap-1">
              <button
                onClick={() => handleFormatChange({ backgroundColor: 'transparent' })}
                className="w-8 h-8 rounded border-2 transition-all bg-white"
                style={{
                  borderColor: format.backgroundColor === 'transparent' ? '#3B82F6' : '#D1D5DB'
                }}
              >
                <div className="w-full h-full flex items-center justify-center text-xs">×</div>
              </button>
              {COLORS.slice(1).map(color => (
                <button
                  key={color}
                  onClick={() => handleFormatChange({ backgroundColor: color + '40' })}
                  className="w-8 h-8 rounded border-2 transition-all"
                  style={{
                    backgroundColor: color + '40',
                    borderColor: format.backgroundColor === color + '40' ? '#3B82F6' : '#D1D5DB'
                  }}
                />
              ))}
            </div>
          </div>
    </div>
  );
}
