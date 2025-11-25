import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/button';
import { ResizableElement } from '../element-look-and-feel/ResizableElement';
import { BaseElement } from '../element-look-and-feel/types';
import { TextElementFormatPanel } from './TextElementFormatPanel';
import { WorkspaceHyperlinkMenu } from './WorkspaceHyperlinkMenu';
import { TextFormatPanel } from './TextFormatPanel';
import { imageOperations, ImageBlob } from '../../db/database';
import { createHistoryController, HistoryController } from '../../utils/rte/history';
import { saveSelectionAsBookmarks, restoreSelectionFromBookmarks } from '../../utils/rte/selectionBookmarks';
import { normalizeNodeTree } from '../../utils/rte/normalizeNodeTree';
import { sanitizePastedHTML, getClipboardContent } from '../../utils/rte/pasteSanitizer';

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
  onNavigateToWorkspace?: (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page', position?: { x: number; y: number }) => void;
  onFocusChange?: (isFocused: boolean, applyFormatFn?: (format: any) => void, applyHyperlinkFn?: (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page') => void, selectedText?: string) => void;
  readOnly?: boolean;
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
  onFocusChange,
  readOnly = false
}: TextElementProps) {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const historyController = useRef<HistoryController>(createHistoryController());
  const commitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [showHyperlinkMenu, setShowHyperlinkMenu] = useState(false);
  const [showTextFormatPanel, setShowTextFormatPanel] = useState(false);
  const isInternalUpdate = useRef(false);
  const isClickingImage = useRef(false);
  const [isEditMode, setIsEditMode] = useState(false); // Track if we're in edit mode
  const [minResizeHeight, setMinResizeHeight] = useState(34); // Default minimum height
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageResizing, setImageResizing] = useState(false);
  const imageResizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [imageObjectUrls, setImageObjectUrls] = useState<Map<string, string>>(new Map());
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Load images from IndexedDB and create object URLs
  useEffect(() => {
    const loadImages = async () => {
      if (!element.id) return;

      // Get all images for this element
      const images = await imageOperations.getByElementId(element.id);

      // Create object URLs for each image
      const urlMap = new Map<string, string>();
      images.forEach(img => {
        const objectUrl = URL.createObjectURL(img.blob);
        urlMap.set(img.id, objectUrl);
      });

      setImageObjectUrls(urlMap);
    };

    loadImages();

    // Cleanup object URLs on unmount
    return () => {
      imageObjectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [element.id, element.htmlContent]);

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

  // Handle Delete/Backspace for selected images
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!selectedImage || !contentEditableRef.current) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();

        // Get image ID before removing
        const imageId = selectedImage.getAttribute('data-image-id');

        // Remove image from DOM
        selectedImage.remove();

        // Delete from IndexedDB
        if (imageId) {
          await imageOperations.delete(imageId);
        }

        // Update content
        const htmlContent = contentEditableRef.current.innerHTML;
        const textContent = contentEditableRef.current.textContent || '';
        onUpdate({
          content: textContent,
          htmlContent: htmlContent
        });

        // Clear selection
        setSelectedImage(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImage, onUpdate]);

  // Handle undo/redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!contentEditableRef.current) return;

      // Only handle when this element is focused
      if (document.activeElement !== contentEditableRef.current) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();

        // Clear pending commit timer when manually triggering undo/redo
        if (commitTimerRef.current) {
          clearTimeout(commitTimerRef.current);
          commitTimerRef.current = null;
        }

        if (e.shiftKey) {
          // Redo
          historyController.current.redo(contentEditableRef.current, restoreSelectionFromBookmarks);
        } else {
          // Undo
          historyController.current.undo(contentEditableRef.current, restoreSelectionFromBookmarks);
        }

        // Update parent after undo/redo
        const htmlContent = contentEditableRef.current.innerHTML;
        const textContent = contentEditableRef.current.textContent || '';
        onUpdate({
          content: textContent,
          htmlContent: htmlContent
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onUpdate]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
      }
    };
  }, []);

  // When element becomes selected (not in edit mode), blur contenteditable and clear text selection
  useEffect(() => {
    if (isSelected && !isEditMode) {
      // Blur the contenteditable to prevent typing
      if (contentEditableRef.current && document.activeElement === contentEditableRef.current) {
        contentEditableRef.current.blur();
      }

      // Clear any text selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
      setHasTextSelection(false);
      setSelectedText('');
    }
  }, [isSelected, isEditMode]);

  // Notify parent when selected text changes (for side panel)
  useEffect(() => {
    if (isEditMode && onFocusChange) {
      onFocusChange(true, applyFormat, applyHyperlink, selectedText);
    }
  }, [selectedText]);

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

  // Commit mutation pipeline: normalize, restore selection, push to history
  const commitMutation = () => {
    if (!contentEditableRef.current) return;

    const root = contentEditableRef.current;

    // 1. Save selection as bookmarks
    const marks = saveSelectionAsBookmarks(root);

    // 2. Normalize DOM tree
    normalizeNodeTree(root);

    // 3. Restore selection from bookmarks
    if (marks) {
      restoreSelectionFromBookmarks(root, marks);
    }

    // 4. Push to history
    historyController.current.push(root.innerHTML, marks);

    // 5. Notify parent (trigger onChange)
    const htmlContent = root.innerHTML;
    const textContent = root.textContent || '';
    onUpdate({
      content: textContent,
      htmlContent: htmlContent
    });
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

    // Clear existing timer
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
    }

    // Schedule commit after 500ms of no typing
    commitTimerRef.current = setTimeout(() => {
      commitMutation();
    }, 500);

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

    // Handle Enter key in lists
    if (e.key === 'Enter' && !e.shiftKey) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let node = range.startContainer;

      // Find parent list item
      let listItem: HTMLElement | null = null;
      let searchNode = node;

      while (searchNode && searchNode !== contentEditableRef.current) {
        if (searchNode instanceof HTMLElement && searchNode.tagName === 'LI') {
          listItem = searchNode;
          break;
        }
        searchNode = searchNode.parentNode;
      }

      // If we're in a list item, handle Enter specially
      if (listItem) {
        e.preventDefault();

        // Check if current list item is empty
        const isEmpty = !listItem.textContent?.trim();

        if (isEmpty) {
          // Empty list item - exit the list
          const list = listItem.parentElement;
          if (list && (list.tagName === 'UL' || list.tagName === 'OL')) {
            // Create a new div after the list
            const div = document.createElement('div');
            div.innerHTML = '<br>'; // Placeholder for cursor

            // If this is the only item, replace the entire list
            if (list.children.length === 1) {
              list.replaceWith(div);
            } else {
              // Remove this item and insert div after the list
              listItem.remove();
              if (list.parentElement) {
                list.parentElement.insertBefore(div, list.nextSibling);
              }
            }

            // Move cursor to the new div
            const newRange = document.createRange();
            newRange.setStart(div, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        } else {
          // Non-empty list item - create new list item
          const newLi = document.createElement('li');
          newLi.style.display = 'list-item';

          // Insert content after cursor into new list item if any
          const afterCursor = range.cloneRange();
          afterCursor.setEndAfter(listItem.lastChild || listItem);
          const fragment = afterCursor.extractContents();

          // If fragment has content, put it in the new item
          if (fragment.textContent?.trim()) {
            newLi.appendChild(fragment);
          } else {
            newLi.innerHTML = '<br>'; // Placeholder
          }

          // Insert new list item after current one
          if (listItem.nextSibling) {
            listItem.parentElement?.insertBefore(newLi, listItem.nextSibling);
          } else {
            listItem.parentElement?.appendChild(newLi);
          }

          // Move cursor to start of new list item
          const newRange = document.createRange();
          newRange.setStart(newLi, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }

        // Commit the mutation
        commitMutation();
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Always stop propagation to prevent ResizableElement from handling the click
    e.stopPropagation();

    // Check if clicking on an image
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      isClickingImage.current = true;
      setSelectedImage(target as HTMLImageElement);
      setHasTextSelection(false);

      // Immediately prevent format panel from showing
      if (onFocusChange) {
        onFocusChange(false);
      }

      setTimeout(() => {
        isClickingImage.current = false;
      }, 100);
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

        // Insert image using IndexedDB
        await insertImageFromFile(file);

        return; // Only handle first image
      }
    }

    // For text/HTML paste, sanitize and insert
    e.preventDefault();

    if (!contentEditableRef.current) return;

    const html = getClipboardContent(e.nativeEvent as ClipboardEvent);
    if (!html) return;

    const sanitizedFragment = sanitizePastedHTML(html);

    // Insert at current cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(sanitizedFragment);

      // Move cursor to end of inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // No selection, append to end
      contentEditableRef.current.appendChild(sanitizedFragment);
    }

    // Commit the mutation (normalize + history)
    commitMutation();
  };

  // Helper function to insert image from File
  const insertImageFromFile = async (file: File) => {
    if (!contentEditableRef.current) return;

    // Generate unique image ID
    const imageId = Math.random().toString(36).substring(7);

    // Get image dimensions
    const dimensions = await getImageDimensions(file);

    // Store image in IndexedDB
    const imageBlob: ImageBlob = {
      id: imageId,
      workspaceId: element.workspaceId || '',
      elementId: element.id,
      blob: file,
      fileName: file.name,
      mimeType: file.type,
      width: dimensions.width,
      height: dimensions.height,
      createdAt: Date.now()
    };

    await imageOperations.create(imageBlob);

    // Create object URL for immediate display
    const objectUrl = URL.createObjectURL(file);

    // Update object URL map
    setImageObjectUrls(prev => {
      const newMap = new Map(prev);
      newMap.set(imageId, objectUrl);
      return newMap;
    });

    // Insert img element with data-image-id
    const img = document.createElement('img');
    img.setAttribute('data-image-id', imageId);
    img.src = objectUrl;
    img.style.width = '300px'; // Default initial width
    img.style.display = 'block';
    img.style.margin = '8px 0';
    img.alt = file.name;

    // Insert at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);

      // Move cursor after image
      range.setStartAfter(img);
      range.setEndAfter(img);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Fallback: append to end
      contentEditableRef.current.appendChild(img);
    }

    // Commit the mutation (normalize + history)
    commitMutation();
  };

  // Helper to get image dimensions
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

    // Process first image file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        await insertImageFromFile(file);
        return; // Only handle first image
      }
    }
  };

  // Handle image click for selection
  const handleImageClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      e.stopPropagation();
      isClickingImage.current = true;
      setSelectedImage(target as HTMLImageElement);
      // Clear text selection when selecting image
      setHasTextSelection(false);

      // Immediately prevent format panel from showing
      if (onFocusChange) {
        onFocusChange(false);
      }

      // Clear the flag after a short delay
      setTimeout(() => {
        isClickingImage.current = false;
      }, 100);
    }
  };

  // Attach click listeners to images
  useEffect(() => {
    if (!contentEditableRef.current) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        handleImageClick(e);
      } else {
        // Click outside image, deselect
        setSelectedImage(null);
      }
    };

    const div = contentEditableRef.current;
    div.addEventListener('click', handleClick);

    return () => {
      div.removeEventListener('click', handleClick);
    };
  }, []);

  // Image resize handlers
  const handleImageResizeStart = (e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedImage) return;

    setImageResizing(true);
    imageResizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: selectedImage.offsetWidth,
      height: selectedImage.offsetHeight
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!selectedImage || !contentEditableRef.current) return;

      const deltaX = moveEvent.clientX - imageResizeStart.current.x;
      const deltaY = moveEvent.clientY - imageResizeStart.current.y;

      // Calculate new dimensions based on corner
      let newWidth = imageResizeStart.current.width;
      let newHeight = imageResizeStart.current.height;

      if (corner.includes('e')) {
        newWidth = Math.max(50, imageResizeStart.current.width + deltaX);
      }
      if (corner.includes('s')) {
        newHeight = Math.max(50, imageResizeStart.current.height + deltaY);
      }

      // Maintain aspect ratio
      const aspectRatio = imageResizeStart.current.width / imageResizeStart.current.height;
      if (corner === 'se' || corner === 'sw' || corner === 'ne' || corner === 'nw') {
        newHeight = newWidth / aspectRatio;
      }

      // Set image dimensions directly - allow it to overflow container during drag
      selectedImage.style.width = `${newWidth}px`;
      selectedImage.style.height = `${newHeight}px`;
      selectedImage.style.maxWidth = 'none'; // Remove max-width constraint during resize
    };

    const handleMouseUp = () => {
      setImageResizing(false);

      // Save updated content and adjust width/height if needed
      if (contentEditableRef.current && selectedImage) {
        // Get the actual image dimensions from inline styles (not offsetWidth which might be constrained)
        const imageWidth = parseInt(selectedImage.style.width) || selectedImage.offsetWidth;
        const imageHeight = parseInt(selectedImage.style.height) || selectedImage.offsetHeight;

        const containerPadding = 16; // Account for px-2 (8px each side)
        const borderWidth = (element.borderWidth || 1) * 2;
        const borderHeight = (element.borderWidth || 1) * 2;

        // Calculate required dimensions based on image size (no minimums - let it shrink)
        const requiredHeight = imageHeight + (containerPadding * 2) + borderHeight;
        const requiredWidth = imageWidth + (containerPadding * 2) + borderWidth;

        const htmlContent = contentEditableRef.current.innerHTML;
        const textContent = contentEditableRef.current.textContent || '';

        // Update container to fit the image (can grow or shrink)
        onUpdate({
          content: textContent,
          htmlContent: htmlContent,
          size: {
            width: requiredWidth,
            height: requiredHeight
          }
        });
      }

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleFocus = () => {
    // Don't show format panel when an image is selected
    if (selectedImage) {
      return;
    }

    // Don't show format panel when clicking an image
    if (isClickingImage.current) {
      return;
    }

    // When clicking inside to type, we're entering "edit mode"
    // The parent will handle clearing selection

    // Notify parent that this element is focused and pass the applyFormat and applyHyperlink functions
    if (onFocusChange) {
      onFocusChange(true, applyFormat, applyHyperlink);
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

    // Clear pending commit timer
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }

    // Commit mutation to capture typing changes for undo/redo
    commitMutation();

    // Explicitly clear the text selection/cursor
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }

    // Notify parent that this element is no longer focused
    if (onFocusChange) {
      onFocusChange(false);
    }

    // Hide text selection when blurring
    setHasTextSelection(false);
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

      // Calculate horizontal position with viewport boundary detection
      // Buttons are ~200px wide total (Format + Hyperlink + gap)
      // With translateX(-50%), they extend ~100px left and right from center
      let x = rect.left + (rect.width / 2);
      const buttonHalfWidth = 100; // Approximate half-width of button group
      const edgeBuffer = 10; // Minimum distance from viewport edge

      // Ensure buttons don't go off left edge
      if (x - buttonHalfWidth < edgeBuffer) {
        x = buttonHalfWidth + edgeBuffer;
      }
      // Ensure buttons don't go off right edge
      if (x + buttonHalfWidth > window.innerWidth - edgeBuffer) {
        x = window.innerWidth - buttonHalfWidth - edgeBuffer;
      }

      setSelectionPosition({
        x: x,
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

    // Handle text alignment first - it applies to the entire line/block based on cursor position
    if (format.textAlign) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let node = range.startContainer;

      // Find the parent block element containing the cursor
      let blockElement: HTMLElement | null = null;
      let searchNode = node;

      while (searchNode && searchNode !== contentEditableRef.current) {
        if (searchNode instanceof HTMLElement &&
            (searchNode.tagName === 'DIV' || searchNode.tagName === 'P' || searchNode.tagName === 'H1' ||
             searchNode.tagName === 'H2' || searchNode.tagName === 'H3' || searchNode.tagName === 'H4' ||
             searchNode.tagName === 'H5' || searchNode.tagName === 'H6' || searchNode.tagName === 'LI')) {
          blockElement = searchNode;
          break;
        }
        searchNode = searchNode.parentNode;
      }

      // Apply alignment to the block element
      if (blockElement) {
        blockElement.style.textAlign = format.textAlign;
      } else {
        // If no block element found, apply to the contentEditable itself
        contentEditableRef.current.style.textAlign = format.textAlign;
      }

      // Commit the mutation
      commitMutation();

      // Check if we have other formatting to apply
      const hasOtherFormatting = format.color || format.backgroundColor || format.fontFamily ||
                                   format.fontSize || format.bold || format.italic ||
                                   format.underline || format.strikethrough;

      // If only alignment, we're done
      if (!hasOtherFormatting) {
        return;
      }
      // Otherwise, continue to apply other formatting below
    }

    // For list and indent operations, we don't need a saved selection - we work with cursor position
    if (format.listType || format.indent) {
      // Get current selection/cursor position
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let node = range.startContainer;
      
      // Handle list creation/toggle
      if (format.listType) {
        // Find the parent list or list item
        let listElement: HTMLElement | null = null;
        let listItemElement: HTMLElement | null = null;
        let blockElement: HTMLElement | null = null;
        let searchNode = node;

        while (searchNode && searchNode !== contentEditableRef.current) {
          if (searchNode instanceof HTMLElement) {
            if (searchNode.tagName === 'UL' || searchNode.tagName === 'OL') {
              listElement = searchNode;
            }
            if (searchNode.tagName === 'LI') {
              listItemElement = searchNode;
            }
            if (searchNode.tagName === 'DIV' || searchNode.tagName === 'P') {
              blockElement = searchNode;
            }
          }
          searchNode = searchNode.parentNode;
        }

        // Toggle behavior: If already in a list, remove it
        if (listItemElement && listElement) {
          // Extract content from list item
          const content = listItemElement.innerHTML;

          // Create a div to replace the list
          const div = document.createElement('div');
          div.innerHTML = content;

          // If list has only one item, replace entire list
          if (listElement.children.length === 1) {
            listElement.replaceWith(div);
          } else {
            // If list has multiple items, just replace this item with a div
            listItemElement.replaceWith(div);
          }

          // Commit the mutation (normalize + history)
          commitMutation();
          return;
        }

        // Create list if not already in one
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

          // Position cursor at the end of the list item
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            // Set cursor at the end of the list item content
            range.selectNodeContents(li);
            range.collapse(false); // Collapse to end
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }

        // Commit the mutation (normalize + history)
        commitMutation();

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

        // Commit the mutation (normalize + history)
        commitMutation();

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
    
    // Apply formatting while preserving unmodified styles
    try {
      const range = workingRange;

      // Extract contents as DOM fragment to preserve structure
      const fragment = range.extractContents();

      // Collect text segments with their existing styles (copy cssText immediately, not references)
      const segments: Array<{ text: string; cssText: string }> = [];

      const collectTextSegments = (node: Node, parentCssText: string = '') => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          if (text) {
            segments.push({ text, cssText: parentCssText });
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          // Copy cssText immediately - style object becomes invalid after DOM removal
          const currentCssText = element.style.cssText || parentCssText;

          node.childNodes.forEach(child => {
            collectTextSegments(child, currentCssText);
          });
        } else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          // DocumentFragment: iterate children without changing parent styles
          node.childNodes.forEach(child => {
            collectTextSegments(child, parentCssText);
          });
        }
      };

      collectTextSegments(fragment);

      // Create new spans with merged styles
      const mergedFragment = document.createDocumentFragment();

      segments.forEach(({ text, cssText }) => {
        const newSpan = document.createElement('span');

        // Copy existing styles first
        if (cssText) {
          newSpan.style.cssText = cssText;
        }

        // Override with new format properties
        if (format.color) newSpan.style.color = format.color;
        if (format.backgroundColor && format.backgroundColor !== 'transparent') {
          newSpan.style.backgroundColor = format.backgroundColor;
        }
        if (format.fontFamily) newSpan.style.fontFamily = format.fontFamily;
        if (format.fontSize) newSpan.style.fontSize = `${format.fontSize}px`;
        if (format.bold) newSpan.style.fontWeight = 'bold';
        if (format.italic) newSpan.style.fontStyle = 'italic';

        // Handle text decoration merge
        if (format.underline || format.strikethrough) {
          const decorations: string[] = [];
          if (format.underline) decorations.push('underline');
          if (format.strikethrough) decorations.push('line-through');
          newSpan.style.textDecoration = decorations.join(' ');
        }

        newSpan.appendChild(document.createTextNode(text));
        mergedFragment.appendChild(newSpan);
      });

      // Insert the merged fragment
      range.insertNode(mergedFragment);

      // Reselect the formatted content so user can apply more formatting
      const selection = window.getSelection();
      if (selection && mergedFragment.firstChild && mergedFragment.lastChild) {
        const newRange = document.createRange();
        newRange.setStartBefore(mergedFragment.firstChild);
        newRange.setEndAfter(mergedFragment.lastChild);
        selection.removeAllRanges();
        selection.addRange(newRange);

        // Update saved selection for next format operation
        setSavedSelection(newRange);
      }

      // Commit the mutation (normalize + history)
      commitMutation();
    } catch (error) {
      console.error('Error applying format:', error);
    }
  };

  const applyHyperlink = (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page') => {
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

      // Commit the mutation (normalize + history)
      commitMutation();

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
        showDeleteButton={false}
        minHeight={minResizeHeight}
        data-text-element-id={element.id}
      >
        <div
          className="w-full h-full py-1.5 px-1.5 relative"
          style={{
            border: element.borderWidth && element.borderWidth > 0
              ? `${element.borderWidth}px solid ${element.borderColor}`
              : '1px solid #e5e7eb',
            backgroundColor: element.fillColor && element.fillColor !== 'transparent'
              ? element.fillColor
              : 'white',
            minHeight: '20px',
            overflow: 'auto' // Allow scrolling if content exceeds container
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 bg-blue-50 border-2 border-dashed border-blue-400 flex items-center justify-center z-10">
              <p className="text-blue-600 font-medium">Drop image here</p>
            </div>
          )}

          <div
            ref={contentEditableRef}
            contentEditable={!readOnly}
            onClick={handleClick}
            onInput={readOnly ? undefined : handleInput}
            onMouseDown={handleMouseDown}
            onKeyDown={readOnly ? undefined : handleKeyDown}
            onPaste={readOnly ? undefined : handlePaste}
            onFocus={readOnly ? undefined : handleFocus}
            onBlur={readOnly ? undefined : handleBlur}
            onMouseUp={readOnly ? undefined : handleTextSelect}
            onKeyUp={readOnly ? undefined : handleTextSelect}
            data-placeholder="Type here..."
            className="w-full outline-none"
            style={{
              cursor: readOnly ? 'default' : (isSelected ? 'text' : 'default'),
              minHeight: '100%' // Take at least full parent height
            }}
            suppressContentEditableWarning
          />
        </div>
      </ResizableElement>


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

      {/* Image Resize Handles - Rendered in Portal */}
      {selectedImage && createPortal(
        (() => {
          const rect = selectedImage.getBoundingClientRect();
          return (
            <div
              className="fixed z-50"
              style={{
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                border: '2px solid #3b82f6',
                boxSizing: 'border-box',
                pointerEvents: 'none'
              }}
            >
              {/* Southeast corner handle */}
              <div
                className="absolute bg-blue-500"
                style={{
                  width: '12px',
                  height: '12px',
                  bottom: '-6px',
                  right: '-6px',
                  border: '2px solid white',
                  cursor: 'se-resize',
                  pointerEvents: 'auto'
                }}
                onMouseDown={(e) => handleImageResizeStart(e, 'se')}
              />

              {/* Southwest corner handle */}
              <div
                className="absolute bg-blue-500"
                style={{
                  width: '12px',
                  height: '12px',
                  bottom: '-6px',
                  left: '-6px',
                  border: '2px solid white',
                  cursor: 'sw-resize',
                  pointerEvents: 'auto'
                }}
                onMouseDown={(e) => handleImageResizeStart(e, 'sw')}
              />

              {/* Northeast corner handle */}
              <div
                className="absolute bg-blue-500"
                style={{
                  width: '12px',
                  height: '12px',
                  top: '-6px',
                  right: '-6px',
                  border: '2px solid white',
                  cursor: 'ne-resize',
                  pointerEvents: 'auto'
                }}
                onMouseDown={(e) => handleImageResizeStart(e, 'ne')}
              />

              {/* Northwest corner handle */}
              <div
                className="absolute bg-blue-500"
                style={{
                  width: '12px',
                  height: '12px',
                  top: '-6px',
                  left: '-6px',
                  border: '2px solid white',
                  cursor: 'nw-resize',
                  pointerEvents: 'auto'
                }}
                onMouseDown={(e) => handleImageResizeStart(e, 'nw')}
              />
            </div>
          );
        })(),
        document.body
      )}
    </>
  );
}