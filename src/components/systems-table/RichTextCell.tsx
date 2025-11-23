import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, Type, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { TextFormatPanel } from '../workspace-system/TextFormatPanel';
import { WorkspaceHyperlinkMenu } from './WorkspaceHyperlinkMenu';
import { useWorkspaceContext } from '../workspace-system/WorkspaceSystem';
import { imageOperations, ImageBlob } from '../../db/database';

interface RichTextCellProps {
  value: string;
  htmlValue?: string;
  onChange: (text: string, html: string) => void;
  placeholder?: string;
  minHeight?: number;
  columnWidth?: number;
  onFocusChange?: (isFocused: boolean, applyFormatFn?: (format: any) => void) => void;
  workspaceId?: string;
  elementId?: string;
}

export function RichTextCell({
  value,
  htmlValue,
  onChange,
  placeholder = '',
  minHeight = 20,
  onFocusChange,
  workspaceId,
  elementId,
}: RichTextCellProps) {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [showTextFormatPanel, setShowTextFormatPanel] = useState(false);
  const [showHyperlinkMenu, setShowHyperlinkMenu] = useState(false);
  const isInternalUpdate = useRef(false);
  const isClickingLink = useRef(false);
  const [imageObjectUrls, setImageObjectUrls] = useState<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Try to get workspace context, but don't fail if not available
  let workspaceContext: ReturnType<typeof useWorkspaceContext> | null = null;
  try {
    workspaceContext = useWorkspaceContext();
  } catch (e) {
    // Context not available - hyperlink feature will be limited
  }

  // Load images from IndexedDB and create object URLs
  useEffect(() => {
    const loadImages = async () => {
      if (!elementId) return;

      const images = await imageOperations.getByElementId(elementId);
      const urlMap = new Map<string, string>();
      images.forEach(img => {
        const objectUrl = URL.createObjectURL(img.blob);
        urlMap.set(img.id, objectUrl);
      });

      setImageObjectUrls(urlMap);
    };

    loadImages();

    return () => {
      imageObjectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [elementId, htmlValue]);

  // Update image src attributes when object URLs change
  useEffect(() => {
    if (!contentEditableRef.current) return;

    const images = contentEditableRef.current.querySelectorAll('img[data-image-id]');
    images.forEach((img) => {
      const imageId = img.getAttribute('data-image-id');
      if (imageId && imageObjectUrls.has(imageId)) {
        (img as HTMLImageElement).src = imageObjectUrls.get(imageId)!;
      }
    });
  }, [imageObjectUrls]);

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

    // Check if clicking on a hyperlink
    const target = e.target as HTMLElement;
    const link = target.closest('a[data-workspace]');
    if (link) {
      isClickingLink.current = true;
      // Clear the flag after a short delay
      setTimeout(() => {
        isClickingLink.current = false;
      }, 100);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if a hyperlink was clicked
    const target = e.target as HTMLElement;
    const link = target.closest('a[data-workspace]');

    if (link && workspaceContext) {
      e.preventDefault();
      e.stopPropagation();

      // Hide format panel when clicking a link
      if (onFocusChange) {
        onFocusChange(false);
      }

      const workspaceName = link.getAttribute('data-workspace');
      const linkType = link.getAttribute('data-link-type') as 'comment' | 'split-view' | 'new-page';

      if (!workspaceName) return;

      switch (linkType) {
        case 'comment':
          // Find the parent table element to position the comment box to its right
          let tableElement = link.closest('[data-table-element]');

          if (tableElement) {
            const tableRect = tableElement.getBoundingClientRect();
            // Position comment box to the right of the table with some spacing
            workspaceContext.openWorkspacePopup(workspaceName, {
              x: tableRect.right + 20,
              y: tableRect.top
            });
          } else {
            // Fallback to positioning near the clicked text
            const rect = link.getBoundingClientRect();
            workspaceContext.openWorkspacePopup(workspaceName, {
              x: rect.left,
              y: rect.bottom
            });
          }
          break;
        case 'split-view':
          // Find the cell containing the clicked link
          let columnElement = link.closest('[data-column-type]');

          if (columnElement) {
            const columnRect = columnElement.getBoundingClientRect();
            const rowElement = columnElement.parentElement;
            const rowRect = rowElement?.getBoundingClientRect();

            // Position split view to the right of the clicked cell, aligned with the row's top
            workspaceContext.openWorkspaceSplitView(workspaceName, {
              x: columnRect.right,
              y: rowRect ? rowRect.top : columnRect.top
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
    }
  };

  const handleFocus = () => {
    // Don't show format panel when clicking a hyperlink
    if (isClickingLink.current) {
      return;
    }

    setIsFocused(true);

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

    setIsFocused(false);

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

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check if clipboard contains image files
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.indexOf('image') !== -1) {
        e.preventDefault(); // Prevent default paste behavior for images

        const file = item.getAsFile();
        if (!file) continue;

        await insertImageFromFile(file);
        return; // Only handle first image
      }
    }

    // For text paste, prevent default and insert as plain text
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // Helper function to insert image from File
  const insertImageFromFile = async (file: File) => {
    if (!contentEditableRef.current || !workspaceId || !elementId) return;

    const imageId = Math.random().toString(36).substring(7);
    const dimensions = await getImageDimensions(file);

    const imageBlob: ImageBlob = {
      id: imageId,
      workspaceId,
      elementId,
      blob: file,
      fileName: file.name,
      mimeType: file.type,
      width: dimensions.width,
      height: dimensions.height,
      createdAt: Date.now()
    };

    await imageOperations.create(imageBlob);

    const objectUrl = URL.createObjectURL(file);
    setImageObjectUrls(prev => {
      const newMap = new Map(prev);
      newMap.set(imageId, objectUrl);
      return newMap;
    });

    const img = document.createElement('img');
    img.setAttribute('data-image-id', imageId);
    img.src = objectUrl;
    img.style.maxWidth = '100%';
    img.style.display = 'block';
    img.style.margin = '4px 0';
    img.alt = file.name;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.setEndAfter(img);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      contentEditableRef.current.appendChild(img);
    }

    const htmlContent = contentEditableRef.current.innerHTML;
    const textContent = contentEditableRef.current.textContent || '';
    onChange(textContent, htmlContent);
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        await insertImageFromFile(file);
        return;
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        await insertImageFromFile(file);
        break;
      }
    }

    e.target.value = '';
  };

  const applyFormat = (format: any) => {
    if (!contentEditableRef.current) return;

    contentEditableRef.current.focus();

    let workingRange: Range | null = savedSelection;

    if (!workingRange) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        workingRange = selection.getRangeAt(0);
        if (selection.toString().length === 0) {
          workingRange = document.createRange();
          workingRange.selectNodeContents(contentEditableRef.current);
          selection.removeAllRanges();
          selection.addRange(workingRange);
        }
      } else {
        workingRange = document.createRange();
        workingRange.selectNodeContents(contentEditableRef.current);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(workingRange);
        }
      }
    } else {
      restoreSelection(workingRange);
    }

    if (!workingRange) return;

    const hasInlineFormatting = format.color || format.backgroundColor || format.fontFamily ||
                                 format.fontSize || format.bold || format.italic ||
                                 format.underline || format.strikethrough;

    // Handle text alignment separately - but skip if we have inline formatting to apply
    if (format.textAlign && !hasInlineFormatting) {
      const range = workingRange;
      let node = range.startContainer;

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

      if (!node || node === contentEditableRef.current) {
        const div = document.createElement('div');
        div.style.textAlign = format.textAlign;
        const contents = range.extractContents();
        div.appendChild(contents);
        range.insertNode(div);
      }

      const htmlContent = contentEditableRef.current.innerHTML;
      const textContent = contentEditableRef.current.textContent || '';
      onChange(textContent, htmlContent);
      window.getSelection()?.removeAllRanges();
      return;
    }

    // Handle inline formatting
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

    try {
      const range = workingRange;
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);

      const htmlContent = contentEditableRef.current.innerHTML;
      const textContent = contentEditableRef.current.textContent || '';
      onChange(textContent, htmlContent);

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
          // Find the cell containing the clicked link
          let columnElementForSplit = (e.target as HTMLElement).closest('[data-column-type]');

          if (columnElementForSplit) {
            const columnRectForSplit = columnElementForSplit.getBoundingClientRect();
            const rowElementForSplit = columnElementForSplit.parentElement;
            const rowRectForSplit = rowElementForSplit?.getBoundingClientRect();

            // Position split view to the right of the clicked cell, aligned with the row's top
            workspaceContext.openWorkspaceSplitView(workspaceName, {
              x: columnRectForSplit.right,
              y: rowRectForSplit ? rowRectForSplit.top : columnRectForSplit.top
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
        className="relative w-full"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 bg-blue-50 border-2 border-dashed border-blue-400 flex items-center justify-center z-10">
            <p className="text-blue-600 font-medium text-xs">Drop image</p>
          </div>
        )}

        {/* Upload button - shown when focused */}
        {isFocused && workspaceId && elementId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUploadClick}
            className="absolute top-0 right-0 z-20 opacity-60 hover:opacity-100 h-6 w-6 p-0"
          >
            <Upload className="h-3 w-3" />
          </Button>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div
          ref={contentEditableRef}
          contentEditable
          onInput={handleInput}
          onClick={handleClick}
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
      </div>
    </>
  );
}
