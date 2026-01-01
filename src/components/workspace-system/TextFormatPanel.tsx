import { useState, useEffect } from 'react';
import { X, Bold, Italic, Underline, Strikethrough, Highlighter, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, IndentIncrease, IndentDecrease, Link2, Unlink } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { HyperlinkDialog } from './HyperlinkDialog';
import { WorkspaceHierarchyEntry } from '../../lib/backup-operations';

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
  systemWorkspaces?: string[]; // System names (isSystem: true workspaces)
  workspaceHierarchy?: Map<string, WorkspaceHierarchyEntry>; // Workspace parent-child relationships
  isSidePanel?: boolean;
  namingPrefix?: string; // Auto-prefix for new workspace names (e.g., "System_Chapter_")
  currentSystemName?: string | null; // Current system for filtering workspaces
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

export function TextFormatPanel({ position, selectedText, onClose, onApply, onApplyHyperlink, onRemoveHyperlink, isHyperlinkSelected = false, onDuplicateToWorkspace, existingWorkspaces = [], linkedWorkspaces = [], systemWorkspaces = [], workspaceHierarchy, isSidePanel = false, namingPrefix = '', currentSystemName = null }: TextFormatPanelProps) {
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

  // Hyperlink dialog state
  const [showHyperlinkDialog, setShowHyperlinkDialog] = useState(false);

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
              onClick={() => setShowHyperlinkDialog(true)}
              variant="outline"
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

      {/* Hyperlink Dialog */}
      {showHyperlinkDialog && onApplyHyperlink && (
        <HyperlinkDialog
          selectedText={selectedText}
          namingPrefix={namingPrefix}
          existingWorkspaces={existingWorkspaces}
          linkedWorkspaces={linkedWorkspaces}
          systemWorkspaces={systemWorkspaces}
          workspaceHierarchy={workspaceHierarchy}
          onConfirm={(workspaceName, linkType) => {
            onApplyHyperlink(workspaceName, linkType);
            setShowHyperlinkDialog(false);
          }}
          onConfirmWithCopy={onDuplicateToWorkspace ? async (newName, sourceName, linkType) => {
            await onDuplicateToWorkspace(newName, sourceName, linkType);
            onApplyHyperlink(newName, linkType);
            setShowHyperlinkDialog(false);
          } : undefined}
          onCancel={() => setShowHyperlinkDialog(false)}
        />
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
