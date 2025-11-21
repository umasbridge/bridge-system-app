import { useRef, useEffect, useState } from 'react';
import { Link, Type } from 'lucide-react';
import { Button } from '../ui/button';
import { ResizableElement } from '../element-look-and-feel/ResizableElement';
import { TextElement as TextElementType } from './types';
import { TextFormatPanel } from './TextFormatPanel';
import { HyperlinkMenu } from './HyperlinkMenu';

interface TextElementProps {
  element: TextElementType;
  isSelected: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextElementType>) => void;
  onDelete: () => void;
  onFormat: () => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export function TextElement({
  element,
  isSelected,
  containerRef,
  onSelect,
  onUpdate,
  onDelete,
  onFormat,
  onInteractionStart,
  onInteractionEnd
}: TextElementProps) {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [showTextFormatPanel, setShowTextFormatPanel] = useState(false);
  const [showHyperlinkMenu, setShowHyperlinkMenu] = useState(false);
  const isInternalUpdate = useRef(false);

  // Initialize content on mount
  useEffect(() => {
    if (contentEditableRef.current && !isInternalUpdate.current) {
      const content = element.htmlContent || element.text || '';
      if (contentEditableRef.current.innerHTML !== content) {
        contentEditableRef.current.innerHTML = content;
      }
    }
  }, [element.htmlContent, element.text]);

  // Auto-focus contenteditable when element is selected
  useEffect(() => {
    if (isSelected && contentEditableRef.current) {
      contentEditableRef.current.focus();
    }
  }, [isSelected]);

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
    onUpdate({ 
      text: textContent,
      htmlContent: htmlContent
    });
    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent drag when clicking in contenteditable
    e.stopPropagation();
  };

  const handleFocus = () => {
    setIsEditing(true);
    onSelect();
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Don't blur if clicking on format panel or hyperlink menu
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('[data-text-format-panel]') || 
        relatedTarget?.closest('[data-hyperlink-menu]')) {
      return;
    }
    
    setIsEditing(false);
    // Don't hide selection if format panel or hyperlink menu is open
    if (!showTextFormatPanel && !showHyperlinkMenu) {
      setTimeout(() => {
        setHasTextSelection(false);
      }, 200);
    }
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
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check if clipboard contains an image
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        e.preventDefault(); // Prevent default paste behavior for images
        
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageSrc = event.target?.result as string;
            
            // Load image to get dimensions
            const img = new Image();
            img.onload = () => {
              const maxWidth = 600;
              const aspectRatio = img.width / img.height;
              const width = Math.min(img.width, maxWidth);
              const height = width / aspectRatio;
              
              // Update element with image and resize
              onUpdate({ 
                imageSrc,
                size: { 
                  width: Math.max(width, 300), 
                  height: Math.max(height + 60, 150) // Add padding for any text
                }
              });
            };
            img.src = imageSrc;
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
    
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
      onUpdate({ 
        text: textContent,
        htmlContent: htmlContent
      });
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Error applying format:', error);
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
          onFormat,
          onInteractionStart,
          onInteractionEnd
        }}
        containerRef={containerRef}
      >
      <div 
        className="w-full h-full flex flex-col items-start justify-start p-3 gap-2"
        style={{
          backgroundColor: element.fillColor,
          borderColor: element.borderColor,
          borderWidth: element.borderWidth,
          borderStyle: element.borderWidth > 0 ? 'solid' : 'none',
        }}
      >
        {element.imageSrc && (
          <div className="w-full flex-shrink-0">
            <img
              src={element.imageSrc}
              alt="Pasted content"
              className="w-full h-auto object-contain"
            />
          </div>
        )}
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
          data-placeholder="Type here..."
          className="w-full flex-1 outline-none"
          style={{
            cursor: isSelected ? 'text' : 'default',
            minHeight: element.imageSrc ? '40px' : '100%',
          }}
          suppressContentEditableWarning
        />
      </div>
      </ResizableElement>

      {/* Text Selection Floating Buttons */}
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
        />
      )}

      {/* Hyperlink Menu */}
      {showHyperlinkMenu && (
        <HyperlinkMenu
          position={selectionPosition}
          selectedText={selectedText}
          selectionRange={{ start: 0, end: 0 }}
          onClose={() => {
            setShowHyperlinkMenu(false);
            setHasTextSelection(false);
          }}
          onSelect={(option) => {
            // TODO: Handle hyperlink option
            console.log('Hyperlink option:', option);
            console.log('Selected text:', selectedText);
            setShowHyperlinkMenu(false);
            setHasTextSelection(false);
          }}
        />
      )}
    </>
  );
}
