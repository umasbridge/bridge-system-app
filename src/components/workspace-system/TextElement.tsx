import { useRef, useEffect, useState } from 'react';
import { Link, Type } from 'lucide-react';
import { Button } from '../ui/button';
import { ResizableElement } from '../element-look-and-feel/ResizableElement';
import { BaseElement } from '../element-look-and-feel/types';
import { TextElementFormatPanel } from './TextElementFormatPanel';
import { WorkspaceHyperlinkMenu } from './WorkspaceHyperlinkMenu';
import { TextFormatPanel } from './TextFormatPanel';

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  htmlContent?: string;
}

interface TextElementProps {
  element: TextElement;
  isSelected: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextElement>) => void;
  onDelete: () => void;
  existingWorkspaces: string[];
  onNavigateToWorkspace?: (workspaceName: string, linkType: 'comment' | 'new-page', position?: { x: number; y: number }) => void;
  onFocusChange?: (isFocused: boolean, applyFormatFn?: (format: any) => void) => void;
}

export function TextElementComponent({
  element,
  isSelected,
  containerRef,
  onSelect,
  onUpdate,
  onDelete,
  existingWorkspaces,
  onNavigateToWorkspace,
  onFocusChange
}: TextElementProps) {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [showHyperlinkMenu, setShowHyperlinkMenu] = useState(false);
  const [showTextFormatPanel, setShowTextFormatPanel] = useState(false);
  const isInternalUpdate = useRef(false);
  const [isEditMode, setIsEditMode] = useState(false); // Track if we're in edit mode
  const [minResizeHeight, setMinResizeHeight] = useState(34); // Default minimum height

  // Initialize content on mount
  useEffect(() => {
    if (contentEditableRef.current && !isInternalUpdate.current) {
      const content = element.htmlContent || element.content || '';
      if (contentEditableRef.current.innerHTML !== content) {
        contentEditableRef.current.innerHTML = content;
      }
    }
  }, [element.htmlContent, element.content]);

  // Adjust height when content changes - ONLY in edit mode
  useEffect(() => {
    // Only auto-adjust height when actively editing, not when just selected for resizing
    if (isEditMode && contentEditableRef.current && !isInternalUpdate.current) {
      const contentHeight = contentEditableRef.current.scrollHeight;
      const containerPadding = 3;
      const borderHeight = (element.borderWidth || 1) * 2;
      const newHeight = contentHeight + (containerPadding * 2) + borderHeight;
      const calculatedHeight = Math.max(34, newHeight);
      
      // Only update if height has changed significantly (more than 2px difference)
      if (Math.abs(element.size.height - calculatedHeight) > 2) {
        onUpdate({ 
          size: {
            width: element.size.width,
            height: calculatedHeight
          }
        });
      }
    }
  }, [element.htmlContent, element.content, element.size.width, isEditMode]);

  // Update minimum resize height based on content
  useEffect(() => {
    if (contentEditableRef.current) {
      const contentHeight = contentEditableRef.current.scrollHeight;
      const containerPadding = 3;
      const borderHeight = (element.borderWidth || 1) * 2;
      const calculatedMinHeight = Math.max(34, contentHeight + (containerPadding * 2) + borderHeight);
      setMinResizeHeight(calculatedMinHeight);
    }
  }, [element.htmlContent, element.content, element.size.width, element.borderWidth]);

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
    
    // Calculate the new height based on content
    const contentHeight = e.currentTarget.scrollHeight;
    const containerPadding = 3; // py-1.5 = 1.5 * 2 = 3px top + 3px bottom = 6px total, but we use 3 for each side
    const borderHeight = (element.borderWidth || 1) * 2; // border on top and bottom
    const newHeight = contentHeight + (containerPadding * 2) + borderHeight;
    
    onUpdate({ 
      content: textContent,
      htmlContent: htmlContent,
      size: {
        width: element.size.width,
        height: Math.max(minResizeHeight, newHeight) // Minimum height of 34px
      }
    });
    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent drag when clicking in contenteditable
    e.stopPropagation();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Tab for indent, Shift+Tab for outdent
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        applyFormat({ indent: 'decrease' });
      } else {
        applyFormat({ indent: 'increase' });
      }
    }
  };

  const handleFocus = () => {
    // When clicking inside to type, we're entering "edit mode"
    // The parent will handle clearing selection
    
    // Notify parent that this element is focused and pass the applyFormat function
    if (onFocusChange) {
      onFocusChange(true, applyFormat);
    }
    setIsEditMode(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Don't blur if clicking on format panel or hyperlink menu
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('[data-text-format-panel]') ||
        relatedTarget?.closest('[data-hyperlink-menu]')) {
      return;
    }

    // Notify parent that this element is no longer focused
    if (onFocusChange) {
      onFocusChange(false);
    }

    // Don't hide selection if format panel or hyperlink menu is open
    if (!showTextFormatPanel && !showHyperlinkMenu) {
      setTimeout(() => {
        setHasTextSelection(false);
      }, 200);
    }
    setIsEditMode(false);
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
      // Only clear if format panel and hyperlink menu are not open
      if (!showTextFormatPanel && !showHyperlinkMenu) {
        setHasTextSelection(false);
      }
    }
  };

  const applyFormat = (format: any) => {
    if (!contentEditableRef.current) return;

    // Focus the contenteditable to ensure selections work
    contentEditableRef.current.focus();

    // For list and indent operations, we don't need a saved selection - we work with cursor position
    if (format.listType || format.indent) {
      // Get current selection/cursor position
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      let node = range.startContainer;
      
      // Handle list creation
      if (format.listType) {
        // Find the parent block element or list item
        let blockElement: HTMLElement | null = null;
        let searchNode = node;
        
        while (searchNode && searchNode !== contentEditableRef.current) {
          if (searchNode instanceof HTMLElement && 
              (searchNode.tagName === 'DIV' || searchNode.tagName === 'P' || searchNode.tagName === 'LI')) {
            blockElement = searchNode as HTMLElement;
            break;
          }
          searchNode = searchNode.parentNode;
        }
        
        if (format.listType === 'bullet' || format.listType === 'number') {
          const listTag = format.listType === 'bullet' ? 'ul' : 'ol';
          const list = document.createElement(listTag);
          list.style.paddingLeft = '30px';
          list.style.marginLeft = '0px';
          list.style.listStyleType = format.listType === 'bullet' ? 'disc' : 'decimal';
          
          const li = document.createElement('li');
          li.style.display = 'list-item';
          
          if (blockElement) {
            // Move content from existing element to list item
            while (blockElement.firstChild) {
              li.appendChild(blockElement.firstChild);
            }
            list.appendChild(li);
            blockElement.replaceWith(list);
          } else {
            // If no block element, wrap the entire contentEditable content
            const contents = contentEditableRef.current.innerHTML;
            li.innerHTML = contents;
            list.appendChild(li);
            contentEditableRef.current.innerHTML = '';
            contentEditableRef.current.appendChild(list);
          }
        }
        
        // Update the element
        const htmlContent = contentEditableRef.current.innerHTML;
        const textContent = contentEditableRef.current.textContent || '';
        onUpdate({ 
          content: textContent,
          htmlContent: htmlContent
        });
        
        return;
      }
      
      // Handle indent
      if (format.indent) {
        // Find the parent block element
        let searchNode = node;
        
        while (searchNode && searchNode !== contentEditableRef.current) {
          if (searchNode instanceof HTMLElement && 
              (searchNode.tagName === 'DIV' || searchNode.tagName === 'P' || searchNode.tagName === 'LI' ||
               searchNode.tagName === 'UL' || searchNode.tagName === 'OL')) {
            const element = searchNode as HTMLElement;
            const currentMargin = parseInt(element.style.marginLeft || '0');
            
            if (format.indent === 'increase') {
              element.style.marginLeft = `${currentMargin + 20}px`;
            } else if (format.indent === 'decrease') {
              element.style.marginLeft = `${Math.max(0, currentMargin - 20)}px`;
            }
            break;
          }
          searchNode = searchNode.parentNode;
        }
        
        // Update the element
        const htmlContent = contentEditableRef.current.innerHTML;
        const textContent = contentEditableRef.current.textContent || '';
        onUpdate({ 
          content: textContent,
          htmlContent: htmlContent
        });
        
        return;
      }
    }
    
    // For other formats, try to use saved selection or current selection
    let workingRange: Range | null = savedSelection;

    // If no saved selection, try to get current selection
    if (!workingRange) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        workingRange = selection.getRangeAt(0);
        
        // If no text is selected, select all content in the contentEditable
        if (selection.toString().length === 0) {
          workingRange = document.createRange();
          workingRange.selectNodeContents(contentEditableRef.current);
          selection.removeAllRanges();
          selection.addRange(workingRange);
        }
      } else {
        // No selection at all, select all content
        workingRange = document.createRange();
        workingRange.selectNodeContents(contentEditableRef.current);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(workingRange);
        }
      }
    } else {
      // Restore the saved selection
      restoreSelection(workingRange);
    }

    if (!workingRange) return;

    // Check if we have inline formatting (not just alignment)
    const hasInlineFormatting = format.color || format.backgroundColor || format.fontFamily ||
                                 format.fontSize || format.bold || format.italic ||
                                 format.underline || format.strikethrough;

    // Handle text alignment separately as it applies to block-level elements
    if (format.textAlign && !hasInlineFormatting) {
      const range = workingRange;
      let node = range.startContainer;
      
      // Find the parent block element
      while (node && node !== contentEditableRef.current) {
        if (node instanceof HTMLElement && 
            (node.tagName === 'DIV' || node.tagName === 'P' || node.tagName === 'H1' || 
             node.tagName === 'H2' || node.tagName === 'H3' || node.tagName === 'H4' || 
             node.tagName === 'H5' || node.tagName === 'H6')) {
          (node as HTMLElement).style.textAlign = format.textAlign;
          break;
        }
        node = node.parentNode;
      }
      
      // If no block element found, wrap the content in a div
      if (!node || node === contentEditableRef.current) {
        const div = document.createElement('div');
        div.style.textAlign = format.textAlign;
        const contents = range.extractContents();
        div.appendChild(contents);
        range.insertNode(div);
      }
      
      // Update the element
      const htmlContent = contentEditableRef.current.innerHTML;
      const textContent = contentEditableRef.current.textContent || '';
      onUpdate({ 
        content: textContent,
        htmlContent: htmlContent
      });
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
      return;
    }
    
    // Create a span with the formatting for inline styles
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
      const range = workingRange;
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      
      // Update the element
      const htmlContent = contentEditableRef.current.innerHTML;
      const textContent = contentEditableRef.current.textContent || '';
      onUpdate({ 
        content: textContent,
        htmlContent: htmlContent
      });
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Error applying format:', error);
    }
  };

  const applyHyperlink = (workspaceName: string, linkType: 'comment' | 'new-page') => {
    if (!savedSelection || !contentEditableRef.current) return;

    // Restore the selection
    restoreSelection(savedSelection);
    
    // Create an anchor element with workspace hyperlink
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('data-workspace-link', workspaceName);
    link.setAttribute('data-link-type', linkType);
    link.className = 'text-blue-600 underline cursor-pointer hover:text-blue-800';
    link.onclick = (e) => {
      e.preventDefault();
      if (onNavigateToWorkspace) {
        const position = { x: e.clientX, y: e.clientY };
        onNavigateToWorkspace(workspaceName, linkType, position);
      }
    };
    
    try {
      const range = savedSelection;
      const contents = range.extractContents();
      link.appendChild(contents);
      range.insertNode(link);
      
      // Update the element
      const htmlContent = contentEditableRef.current.innerHTML;
      const textContent = contentEditableRef.current.textContent || '';
      onUpdate({ 
        content: textContent,
        htmlContent: htmlContent
      });
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Error applying hyperlink:', error);
    }
  };

  return (
    <>
      <ResizableElement
        element={element}
        isSelected={isSelected}
        actions={{
          onSelect,
          onUpdate,
          onDelete,
        }}
        containerRef={containerRef}
        showFormatButton={false}
        minHeight={minResizeHeight}
      >
        <div 
          className="w-full h-full py-1.5 px-1.5"
          style={{
            border: element.borderWidth && element.borderWidth > 0
              ? `${element.borderWidth}px solid ${element.borderColor}`
              : '1px solid #e5e7eb',
            backgroundColor: element.fillColor && element.fillColor !== 'transparent' 
              ? element.fillColor 
              : 'white',
            minHeight: '20px',
            overflow: 'hidden' // Allow manual resize below content height
          }}
        >
          <div
            ref={contentEditableRef}
            contentEditable
            onInput={handleInput}
            onMouseDown={handleMouseDown}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseUp={handleTextSelect}
            onKeyUp={handleTextSelect}
            data-placeholder="Type here..."
            className="w-full h-full outline-none"
            style={{
              cursor: isSelected ? 'text' : 'default',
              overflow: 'hidden' // Allow content to be clipped when manually resized
            }}
            suppressContentEditableWarning
          />
        </div>
      </ResizableElement>

      {/* Text Selection Floating Buttons - Format and Hyperlink */}
      {hasTextSelection && !showTextFormatPanel && !showHyperlinkMenu && (
        <div
          className="fixed z-50 flex gap-2"
          style={{
            left: selectionPosition.x,
            top: selectionPosition.y,
            transform: 'translateX(-50%)'
          }}
        >
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setShowTextFormatPanel(true);
              setShowHyperlinkMenu(false);
            }}
            variant="outline"
            size="sm"
            className="gap-2 h-8 bg-white shadow-lg"
          >
            <Type className="h-4 w-4" />
            Format
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setShowHyperlinkMenu(true);
              setShowTextFormatPanel(false);
            }}
            variant="outline"
            size="sm"
            className="gap-2 h-8 bg-white shadow-lg"
          >
            <Link className="h-4 w-4" />
            Hyperlink
          </Button>
        </div>
      )}

      {/* Text Format Panel */}
      {showTextFormatPanel && (
        <TextFormatPanel
          position={selectionPosition}
          selectedText={selectedText}
          onClose={() => {
            setShowTextFormatPanel(false);
            setHasTextSelection(false);
          }}
          onApply={(format) => {
            applyFormat(format);
          }}
        />
      )}

      {/* Hyperlink Menu */}
      {showHyperlinkMenu && (
        <WorkspaceHyperlinkMenu
          position={selectionPosition}
          selectedText={selectedText}
          existingWorkspaces={existingWorkspaces}
          onClose={() => {
            setShowHyperlinkMenu(false);
            setHasTextSelection(false);
          }}
          onApply={(workspaceName, linkType) => {
            applyHyperlink(workspaceName, linkType);
            setShowHyperlinkMenu(false);
            setHasTextSelection(false);
          }}
        />
      )}

      {/* Element Format Panel - Show when selected */}
      {isSelected && (
        <TextElementFormatPanel
          element={element}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}
    </>
  );
}