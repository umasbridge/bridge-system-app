import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, Type } from 'lucide-react';
import { Button } from '../ui/button';
import { TextFormatPanel } from '../workspace-system/TextFormatPanel';
import { WorkspaceHyperlinkMenu } from './WorkspaceHyperlinkMenu';
import { useWorkspaceContext } from '../workspace-system/WorkspaceSystem';
import { imageOperations, ImageBlob } from '../../db/database';
import { createHistoryController, HistoryController } from '../../utils/rte/history';
import { saveSelectionAsBookmarks, restoreSelectionFromBookmarks } from '../../utils/rte/selectionBookmarks';
import { normalizeNodeTree } from '../../utils/rte/normalizeNodeTree';
import { sanitizePastedHTML, getClipboardContent } from '../../utils/rte/pasteSanitizer';

interface RichTextCellProps {
  value: string;
  htmlValue?: string;
  onChange: (text: string, html: string) => void;
  placeholder?: string;
  minHeight?: number;
  columnWidth?: number;
  onFocusChange?: (
    isFocused: boolean,
    applyFormatFn?: (format: any) => void,
    applyHyperlinkFn?: (workspaceName: string, linkType: 'comment' | 'new-page') => void,
    selectedText?: string
  ) => void;
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
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [imageResizing, setImageResizing] = useState(false);
  const imageResizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const isClickingImage = useRef(false);
  const historyController = useRef<HistoryController>(createHistoryController());
  const commitTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        commitMutation();

        // Clear selection
        setSelectedImage(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImage, onChange]);

  // Handle undo/redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!contentEditableRef.current) return;

      // Only handle when this cell is focused
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
        onChange(textContent, htmlContent);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onChange]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
      }
    };
  }, []);

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
    onChange(textContent, htmlContent);
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    isInternalUpdate.current = true;
    const htmlContent = e.currentTarget.innerHTML;
    const textContent = e.currentTarget.textContent || '';
    onChange(textContent, htmlContent);

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
    const target = e.target as HTMLElement;

    // Check if clicking on an image
    if (target.tagName === 'IMG') {
      e.preventDefault();
      e.stopPropagation();
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
      return;
    } else {
      // Click outside image, deselect
      setSelectedImage(null);
    }

    // Check if a hyperlink was clicked
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

    // Don't show format panel when clicking an image
    if (isClickingImage.current || selectedImage) {
      return;
    }

    setIsFocused(true);

    // Notify parent that this cell is focused and pass the applyFormat and applyHyperlink functions
    if (onFocusChange) {
      onFocusChange(true, applyFormat, applyHyperlink, selectedText);
    }
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

    setIsFocused(false);

    // Notify parent that this cell is no longer focused
    if (onFocusChange) {
      onFocusChange(false);
    }

    // Hide text selection when blurring
    setHasTextSelection(false);
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

      // Notify parent of updated selection text (even if cell is already focused)
      if (onFocusChange && isFocused) {
        onFocusChange(true, applyFormat, applyHyperlink, selectedText);
      }

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

    commitMutation();
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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

  const applyFormat = (format: any) => {
    if (!contentEditableRef.current) return;

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

    // Handle list and indent operations (work with cursor position, not saved selection)
    if (format.listType || format.indent) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let node = range.startContainer;

      // Handle list creation/toggle
      if (format.listType) {
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
          const content = listItemElement.innerHTML;
          const div = document.createElement('div');
          div.innerHTML = content;

          if (listElement.children.length === 1) {
            listElement.replaceWith(div);
          } else {
            listItemElement.replaceWith(div);
          }

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
            while (blockElement.firstChild) {
              li.appendChild(blockElement.firstChild);
            }
            list.appendChild(li);
            blockElement.replaceWith(list);
          } else {
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

        commitMutation();
        return;
      }

      // Handle indent
      if (format.indent) {
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

        commitMutation();
        return;
      }
    }

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

      commitMutation();
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

      commitMutation();

      // Clear selection
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Error applying hyperlink:', error);
    }
  };

  // Image resize handlers
  const handleImageResizeStart = (e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedImage || !contentEditableRef.current) return;

    setImageResizing(true);
    imageResizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: selectedImage.offsetWidth,
      height: selectedImage.offsetHeight
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!selectedImage) return;

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
      if (corner.includes('w')) {
        newWidth = Math.max(50, imageResizeStart.current.width - deltaX);
      }
      if (corner.includes('n')) {
        newHeight = Math.max(50, imageResizeStart.current.height - deltaY);
      }

      // Maintain aspect ratio
      const aspectRatio = imageResizeStart.current.width / imageResizeStart.current.height;
      if (corner === 'se' || corner === 'sw' || corner === 'ne' || corner === 'nw') {
        newHeight = newWidth / aspectRatio;
      }

      // Set image dimensions directly
      selectedImage.style.width = `${newWidth}px`;
      selectedImage.style.height = `${newHeight}px`;
    };

    const handleMouseUp = () => {
      setImageResizing(false);

      // Save updated content
      if (contentEditableRef.current) {
        commitMutation();
      }

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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

        <div
          ref={contentEditableRef}
          contentEditable
          onInput={handleInput}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onKeyDown={handleKeyDown}
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
