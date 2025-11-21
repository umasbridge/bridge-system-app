import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, Type } from 'lucide-react';
import { Button } from '../ui/button';
import { TextFormatPanel } from '../embedded-content/TextFormatPanel';
import { WorkspaceHyperlinkMenu } from './WorkspaceHyperlinkMenu';
import { useWorkspaceContext } from './WorkspaceManager';

interface RichTextCellProps {
  value: string;
  htmlValue?: string;
  onChange: (text: string, html: string) => void;
  placeholder?: string;
  minHeight?: number;
  columnWidth?: number;
  onFocusChange?: (isFocused: boolean, applyFormatFn?: (format: any) => void) => void;
}

export function RichTextCell({
  value,
  htmlValue,
  onChange,
  placeholder = '',
  minHeight = 20,
  onFocusChange,
}: RichTextCellProps) {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [showTextFormatPanel, setShowTextFormatPanel] = useState(false);
  const [showHyperlinkMenu, setShowHyperlinkMenu] = useState(false);
  const isInternalUpdate = useRef(false);
  
  // Try to get workspace context, but don't fail if not available
  let workspaceContext: ReturnType<typeof useWorkspaceContext> | null = null;
  try {
    workspaceContext = useWorkspaceContext();
  } catch (e) {
    // Context not available - hyperlink feature will be limited
  }

  // Initialize content on mount
  useEffect(() => {
    if (contentEditableRef.current && !isInternalUpdate.current) {
      const content = htmlValue || value || '';
      if (contentEditableRef.current.innerHTML !== content) {
        contentEditableRef.current.innerHTML = content;
      }
    }
  }, [htmlValue, value]);

  // Restore selection when hyperlink menu or format panel opens
  useEffect(() => {
    if ((showHyperlinkMenu || showTextFormatPanel) && savedSelection) {
      // Small delay to ensure the menu is rendered
      setTimeout(() => {
        restoreSelection(savedSelection);
      }, 10);
    }
  }, [showHyperlinkMenu, showTextFormatPanel]);

  // Save and restore selection
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      return selection.getRangeAt(0);
    }
    return null;
  };

  const restoreSelection = (range: Range) => {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    isInternalUpdate.current = true;
    const htmlContent = e.currentTarget.innerHTML;
    const textContent = e.currentTarget.textContent || '';
    onChange(textContent, htmlContent);
    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleFocus = () => {
    // Notify parent that this cell is focused and pass the applyFormat function
    if (onFocusChange) {
      onFocusChange(true, applyFormat);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Don't hide selection if format panel or hyperlink menu is open
    if (showTextFormatPanel || showHyperlinkMenu) {
      // Keep the contentEditable focused when panels are open
      e.preventDefault();
      return;
    }
    
    // Don't blur if clicking on format panel or hyperlink menu
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('[data-text-format-panel]') || 
        relatedTarget?.closest('[data-hyperlink-menu]')) {
      return;
    }
    
    // Notify parent that this cell is no longer focused
    if (onFocusChange) {
      onFocusChange(false);
    }
    
    setTimeout(() => {
      setHasTextSelection(false);
    }, 200);
  };

  const handleTextSelect = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString();
    
    if (selectedText.length > 0) {
      // Text is selected
      setHasTextSelection(true);
      setSelectedText(selectedText);
      setSavedSelection(saveSelection());
      
      // Calculate position for the floating buttons
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPosition({
        x: rect.left + (rect.width / 2),
        y: rect.top - 50
      });
    } else {
      // Only clear if panels are not open
      if (!showTextFormatPanel && !showHyperlinkMenu) {
        setHasTextSelection(false);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // For text paste, prevent default and insert as plain text
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const applyFormat = (format: any) => {
    if (!savedSelection || !contentEditableRef.current) return;

    // Restore the selection
    restoreSelection(savedSelection);
    
    // Create a span with the formatting
    const span = document.createElement('span');
    const styles: string[] = [];
    
    if (format.color) {
      styles.push(`color: ${format.color}`);
    }
    if (format.backgroundColor && format.backgroundColor !== 'transparent') {
      styles.push(`background-color: ${format.backgroundColor}`);
    }
    if (format.fontFamily) {
      styles.push(`font-family: ${format.fontFamily}`);
    }
    if (format.fontSize) {
      styles.push(`font-size: ${format.fontSize}px`);
    }
    if (format.bold) {
      styles.push(`font-weight: bold`);
    }
    if (format.italic) {
      styles.push(`font-style: italic`);
    }
    
    // Handle text decoration (underline and strikethrough can be combined)
    const decorations: string[] = [];
    if (format.underline) {
      decorations.push('underline');
    }
    if (format.strikethrough) {
      decorations.push('line-through');
    }
    if (decorations.length > 0) {
      styles.push(`text-decoration: ${decorations.join(' ')}`);
    }
    
    span.style.cssText = styles.join('; ');
    
    // Wrap the selected text in the styled span
    try {
      const range = savedSelection;
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      
      // Update the element
      const htmlContent = contentEditableRef.current.innerHTML;
      const textContent = contentEditableRef.current.textContent || '';
      onChange(textContent, htmlContent);
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Error applying format:', error);
    }
  };

  const applyHyperlink = (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page') => {
    if (!savedSelection || !contentEditableRef.current || !workspaceContext) return;

    // Restore the selection
    restoreSelection(savedSelection);
    
    // Create a hyperlink element
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('data-workspace', workspaceName);
    link.setAttribute('data-link-type', linkType);
    
    // Style based on link type
    const linkColors = {
      'comment': 'text-blue-600 underline cursor-pointer hover:text-blue-800',
      'split-view': 'text-green-600 underline cursor-pointer hover:text-green-800',
      'new-page': 'text-purple-600 underline cursor-pointer hover:text-purple-800'
    };
    
    link.className = linkColors[linkType];
    
    // Add click handler
    link.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!workspaceContext) return;
      
      switch (linkType) {
        case 'comment':
          // Find the parent table element to position the comment box to its right
          let tableElement = (e.target as HTMLElement).closest('[data-table-element]');
          
          if (tableElement) {
            const tableRect = tableElement.getBoundingClientRect();
            // Position comment box to the right of the table with some spacing
            workspaceContext.openWorkspacePopup(workspaceName, {
              x: tableRect.right + 20,
              y: tableRect.top
            });
          } else {
            // Fallback to positioning near the clicked text
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            workspaceContext.openWorkspacePopup(workspaceName, {
              x: rect.left,
              y: rect.bottom
            });
          }
          break;
        case 'split-view':
          // Find the parent column element (div with data-column-type)
          let columnElement = (e.target as HTMLElement).closest('[data-column-type]');
          
          if (columnElement) {
            const columnRect = columnElement.getBoundingClientRect();
            // Position split view so its left edge aligns with the column's right edge
            workspaceContext.openWorkspaceSplitView(workspaceName, {
              x: columnRect.right,
              y: 0 // Always start from top of viewport
            });
          } else {
            // Fallback
            workspaceContext.openWorkspaceSplitView(workspaceName, { x: window.innerWidth / 2, y: 0 });
          }
          break;
        case 'new-page':
          workspaceContext.openWorkspaceNewPage(workspaceName);
          break;
      }
    };
    
    // Wrap the selected text in the link
    try {
      const range = savedSelection;
      const contents = range.extractContents();
      link.appendChild(contents);
      range.insertNode(link);
      
      // Update the element
      const htmlContent = contentEditableRef.current.innerHTML;
      const textContent = contentEditableRef.current.textContent || '';
      onChange(textContent, htmlContent);
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Error applying hyperlink:', error);
    }
  };

  return (
    <>
      <div
        ref={contentEditableRef}
        contentEditable
        onInput={handleInput}
        onMouseDown={handleMouseDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onMouseUp={handleTextSelect}
        onKeyUp={handleTextSelect}
        data-placeholder={placeholder}
        className="w-full outline-none"
        style={{
          cursor: 'text',
          minHeight: `${minHeight}px`,
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          lineHeight: '1.2',
          whiteSpace: 'pre-wrap',
        }}
        suppressContentEditableWarning
      />

      {/* Text Selection Floating Buttons - Rendered in Portal */}
      {hasTextSelection && !showTextFormatPanel && !showHyperlinkMenu && createPortal(
        <div
          className="fixed z-[70] flex flex-col gap-1"
          style={{
            left: selectionPosition.x,
            top: selectionPosition.y
          }}
        >
          <Button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowTextFormatPanel(true);
              setShowHyperlinkMenu(false);
            }}
            onMouseDown={(e) => e.preventDefault()}
            variant="outline"
            size="sm"
            className="gap-2 h-8 bg-white shadow-lg w-full justify-start"
          >
            <Type className="h-4 w-4" />
            Format
          </Button>
          {workspaceContext && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setShowHyperlinkMenu(true);
                setShowTextFormatPanel(false);
              }}
              onMouseDown={(e) => e.preventDefault()}
              variant="outline"
              size="sm"
              className="gap-2 h-8 bg-white shadow-lg w-full justify-start"
            >
              <Link className="h-4 w-4" />
              Hyperlink
            </Button>
          )}
        </div>,
        document.body
      )}

      {/* Text Format Panel - Rendered in Portal */}
      {showTextFormatPanel && createPortal(
        <TextFormatPanel
          position={selectionPosition}
          selectedText={selectedText}
          selectionRange={{ start: 0, end: 0 }}
          onClose={() => {
            setShowTextFormatPanel(false);
            setHasTextSelection(false);
          }}
          onApply={(format) => {
            applyFormat(format);
            setShowTextFormatPanel(false);
            setHasTextSelection(false);
          }}
        />,
        document.body
      )}

      {/* Hyperlink Menu - Rendered in Portal */}
      {showHyperlinkMenu && workspaceContext && createPortal(
        <WorkspaceHyperlinkMenu
          position={selectionPosition}
          selectedText={selectedText}
          onClose={() => {
            setShowHyperlinkMenu(false);
            setHasTextSelection(false);
          }}
          onApply={(workspaceName, linkType) => {
            applyHyperlink(workspaceName, linkType);
            setShowHyperlinkMenu(false);
            setHasTextSelection(false);
          }}
          existingWorkspaces={workspaceContext.workspaces.map(w => w.name)}
        />,
        document.body
      )}
    </>
  );
}
