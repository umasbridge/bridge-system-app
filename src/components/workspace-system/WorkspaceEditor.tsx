import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ResizableElement } from '../element-look-and-feel/ResizableElement';
import { BaseElement } from '../element-look-and-feel/types';
import { SystemsTable, RowData } from '../systems-table';
import { SystemsTableFormatPanel } from '../systems-table/SystemsTableFormatPanel';
import { TextElementComponent, TextElement } from './TextElement';
import { TextFormatPanel } from './TextFormatPanel';
import { TextElementFormatPanel } from './TextElementFormatPanel';
import { PdfElementComponent } from './PdfElement';
import { PdfElementFormatPanel } from './PdfElementFormatPanel';
import { WorkspaceFormatPanel } from './WorkspaceFormatPanel';
import { ElementNameDialog } from './ElementNameDialog';
import { ShareDialog } from './ShareDialog';
import * as pdfjsLib from 'pdfjs-dist';
import { elementOperations, WorkspaceElement as DBWorkspaceElement, workspaceOperations, Workspace } from '../../db/database';

// Use worker from public directory
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface GridlineOptions {
  enabled: boolean;
  color: string;
  width: number;
}

interface SystemsTableElement extends BaseElement {
  type: 'systems-table';
  initialRows?: RowData[];
  gridlines?: GridlineOptions;
  levelWidths?: { [level: number]: number };
  meaningWidth?: number;
  showName?: boolean;
}



interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  alt?: string;
}

interface PdfElement extends BaseElement {
  type: 'pdf';
  fileName: string;
  currentPage: number;
  totalPages: number;
  pageImages: string[]; // array of base64 encoded page images
  backgroundColor?: string;
}

interface FileElement extends BaseElement {
  type: 'file';
  fileName: string;
  fileSize?: number;
  fileType?: string;
}

type WorkspaceElement = SystemsTableElement | TextElement | ImageElement | PdfElement | FileElement;

interface WorkspaceEditorProps {
  workspaceId: string;
  initialTitle?: string;
  onTitleChange?: (title: string) => void;
  onClose?: () => void;
  onSaveAndClose?: () => void;
  existingWorkspaces?: string[];
  onNavigateToWorkspace?: (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page', position?: { x: number; y: number }) => void;
  hideControls?: boolean;
  initialElements?: WorkspaceElement[];
}

const ELEMENT_SPACING = 20; // 20px spacing between elements (1 line spacing)

export function WorkspaceEditor({
  workspaceId,
  initialTitle = '',
  onTitleChange,
  onClose,
  onSaveAndClose,
  existingWorkspaces = [],
  onNavigateToWorkspace,
  hideControls = false,
  initialElements = []
}: WorkspaceEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [elements, setElements] = useState<WorkspaceElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [formatPanelId, setFormatPanelId] = useState<string | null>(null);
  const [deletedElement, setDeletedElement] = useState<WorkspaceElement | null>(null);
  const [focusedTextElementId, setFocusedTextElementId] = useState<string | null>(null);
  const [focusedCellId, setFocusedCellId] = useState<{ tableId: string; rowId: string; column: 'bid' | 'meaning' } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tableRowsRef = useRef<Map<string, RowData[]>>(new Map());
  const textElementApplyFormatRef = useRef<((format: any) => void) | null>(null);
  const textElementApplyHyperlinkRef = useRef<((workspaceName: string, linkType: 'comment' | 'new-page') => void) | null>(null);
  const cellApplyFormatRef = useRef<((format: any) => void) | null>(null);
  const cellApplyHyperlinkRef = useRef<((workspaceName: string, linkType: 'comment' | 'new-page') => void) | null>(null);
  const [textElementSelectedText, setTextElementSelectedText] = useState<string>('');
  const [cellSelectedText, setCellSelectedText] = useState<string>('');
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [pendingElement, setPendingElement] = useState<{
    type: 'systems-table' | 'text' | 'image' | 'pdf';
    data?: any;
  } | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceSelected, setWorkspaceSelected] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Load workspace and elements from DB on mount
  useEffect(() => {
    const loadElements = async () => {
      setIsLoading(true);

      // Load workspace data
      const workspaceData = await workspaceOperations.getById(workspaceId);
      if (workspaceData) {
        setWorkspace(workspaceData);
      }

      const dbElements = await elementOperations.getByWorkspaceId(workspaceId);

      if (dbElements.length === 0 && initialElements.length === 0) {
        // Start with a blank workspace - no default elements
        setElements([]);
      } else if (dbElements.length > 0) {
        // Step 1: Recalculate heights for systems-table elements
        const elementsWithCorrectHeights = dbElements.map(el => {
          if (el.type === 'systems-table' && 'initialRows' in el && el.initialRows) {
            const tableEl = el as SystemsTableElement;
            const hasVisibleName = el.name && (tableEl.showName !== false);
            const newHeight = calculateTableHeight(el.initialRows, hasVisibleName);
            return { ...el, size: { ...el.size, height: newHeight } };
          }
          return el;
        });

        // Step 2: Recalculate positions for auto-layout elements (treat undefined as needing recalc)
        const sortedByZIndex = [...elementsWithCorrectHeights].sort((a, b) => a.zIndex - b.zIndex);
        let cumulativeY = 20; // Starting Y position
        const elementsWithCorrectPositions = sortedByZIndex.map(el => {
          if (el.isManuallyPositioned === true) {
            return el; // Don't change manually positioned elements
          }

          const newPosition = { x: 20, y: cumulativeY };
          cumulativeY += el.size.height + ELEMENT_SPACING;
          return { ...el, position: newPosition, isManuallyPositioned: false };
        });

        setElements(elementsWithCorrectPositions);

        // Step 3: Update changed elements in database
        for (const el of elementsWithCorrectPositions) {
          const originalEl = dbElements.find(dbe => dbe.id === el.id);
          if (originalEl) {
            const updates: Partial<DBWorkspaceElement> = {};

            // Check if height changed
            if (el.size.height !== originalEl.size.height) {
              updates.size = el.size;
            }

            // Check if position changed
            if (el.position.y !== originalEl.position.y || el.position.x !== originalEl.position.x) {
              updates.position = el.position;
            }

            // Update if there are changes
            if (Object.keys(updates).length > 0) {
              await elementOperations.update(el.id, updates);
            }
          }
        }
      } else if (initialElements.length > 0) {
        // Use initial elements if provided (for popup comment boxes)
        setElements(initialElements);
      }

      setIsLoading(false);
    };

    loadElements();
  }, [workspaceId]);

  // Focus the contentEditable element when focusedTextElementId changes
  useEffect(() => {
    if (focusedTextElementId && containerRef.current) {
      // Find the text element's contentEditable div
      const textElements = containerRef.current.querySelectorAll('[data-text-element-id]');
      textElements.forEach(el => {
        const elementId = el.getAttribute('data-text-element-id');
        if (elementId === focusedTextElementId) {
          const contentEditable = el.querySelector('[contenteditable="true"]');
          if (contentEditable instanceof HTMLElement) {
            // Focus and place cursor at the end
            contentEditable.focus();

            // Move cursor to end of content
            const range = document.createRange();
            const selection = window.getSelection();
            if (contentEditable.childNodes.length > 0) {
              const lastNode = contentEditable.childNodes[contentEditable.childNodes.length - 1];
              range.selectNodeContents(lastNode);
              range.collapse(false);
            } else {
              range.selectNodeContents(contentEditable);
              range.collapse(false);
            }
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }
      });
    }
  }, [focusedTextElementId]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);

    // Simply update title, no validation errors shown
    if (newTitle.trim()) {
      onTitleChange?.(newTitle);
    }
  };

  const handleWorkspaceUpdate = async (updates: Partial<Workspace>) => {
    if (workspace) {
      const updatedWorkspace = { ...workspace, ...updates };
      setWorkspace(updatedWorkspace);
      await workspaceOperations.update(workspaceId, updates);
    }
  };

  const getNextPosition = () => {
    // Find the bottom-most element and add consistent spacing below it
    if (elements.length === 0) {
      return { x: 20, y: 20 };
    }

    // Find the element with the highest bottom edge
    let maxBottom = 0;
    let bottomElement: WorkspaceElement | null = null;
    elements.forEach(el => {
      // Element height now includes name header height for SystemsTable elements
      const bottom = el.position.y + el.size.height;
      if (bottom > maxBottom) {
        maxBottom = bottom;
        bottomElement = el;
      }
    });

    // Use consistent 1-line spacing after all elements
    return { x: 20, y: maxBottom + ELEMENT_SPACING };
  };

  const handleInsertExistingElement = async (existingElement: DBWorkspaceElement) => {
    // Create a copy of the existing element with a new ID and position in this workspace
    const position = getNextPosition();
    const newElementId = Math.random().toString(36).substring(7);

    const newElement = {
      ...existingElement,
      id: newElementId,
      workspaceId,
      position,
      zIndex: elements.length,
      isManuallyPositioned: false,
      // For systems-table elements, show name by default when adding existing
      ...(existingElement.type === 'systems-table' && { showName: true })
    };

    await elementOperations.create(newElement);
    setElements([...elements, newElement as WorkspaceElement]);

    setShowNameDialog(false);
    setPendingElement(null);

    // Auto-focus text elements' contentEditable after creation
    if (newElement.type === 'text') {
      setTimeout(() => {
        const textElements = document.querySelectorAll('[data-text-element-id]');
        textElements.forEach(el => {
          const elementId = el.getAttribute('data-text-element-id');
          if (elementId === newElementId) {
            const contentEditable = el.querySelector('[contenteditable="true"]');
            if (contentEditable instanceof HTMLElement) {
              contentEditable.focus();
              const range = document.createRange();
              const selection = window.getSelection();
              range.selectNodeContents(contentEditable);
              range.collapse(false);
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          }
        });
      }, 200);
    }
  };

  const createElementWithName = async (name: string) => {
    if (!pendingElement) return;

    const position = getNextPosition();
    let newElementId: string = '';

    switch (pendingElement.type) {
      case 'systems-table': {
        const initialRows: RowData[] = [{
          id: '1',
          bid: '',
          bidFillColor: undefined,
          meaning: '',
          children: []
        }];
        const hasVisibleName = Boolean(name); // Name will be visible if provided
        const calculatedHeight = calculateTableHeight(initialRows, hasVisibleName);
        newElementId = Math.random().toString(36).substring(7);
        const newElement: SystemsTableElement & { workspaceId: string } = {
          id: newElementId,
          workspaceId,
          name: name || undefined,
          type: 'systems-table',
          position,
          size: { width: 680, height: calculatedHeight },
          zIndex: elements.length,
          borderColor: 'transparent',
          borderWidth: 0,
          gridlines: {
            enabled: false,
            color: '#D1D5DB',
            width: 1
          },
          levelWidths: { 0: 80 },
          meaningWidth: 680,
          showName: true,
          initialRows
        };
        await elementOperations.create(newElement);
        setElements([...elements, newElement]);
        break;
      }
      case 'text': {
        newElementId = Math.random().toString(36).substring(7);
        const newElement: TextElement & { workspaceId: string } = {
          id: newElementId,
          workspaceId,
          name: name || undefined,
          type: 'text',
          position,
          size: { width: 680, height: 34 },
          zIndex: elements.length,
          content: '',
          borderColor: 'transparent',
          borderWidth: 0
        };
        await elementOperations.create(newElement);
        setElements([...elements, newElement]);
        break;
      }
      case 'image': {
        const { src, alt } = pendingElement.data;
        newElementId = Math.random().toString(36).substring(7);
        const newElement: ImageElement & { workspaceId: string } = {
          id: newElementId,
          workspaceId,
          name: name || undefined,
          type: 'image',
          position,
          size: { width: 400, height: 300 },
          zIndex: elements.length,
          src,
          alt,
          borderColor: 'transparent',
          borderWidth: 0
        };
        await elementOperations.create(newElement);
        setElements([...elements, newElement]);
        break;
      }
      case 'pdf': {
        const { fileName, totalPages, pageImages } = pendingElement.data;
        newElementId = Math.random().toString(36).substring(7);
        const newElement: PdfElement & { workspaceId: string } = {
          id: newElementId,
          workspaceId,
          name: name || undefined,
          type: 'pdf',
          position,
          size: { width: 680, height: 800 },
          zIndex: elements.length,
          fileName,
          currentPage: 1,
          totalPages,
          pageImages,
          borderColor: 'transparent',
          borderWidth: 0
        };
        await elementOperations.create(newElement);
        setElements([...elements, newElement]);
        break;
      }
    }

    setShowNameDialog(false);
    setPendingElement(null);

    // Auto-focus text elements' contentEditable after creation
    if (pendingElement.type === 'text') {
      setTimeout(() => {
        const textElements = document.querySelectorAll('[data-text-element-id]');
        textElements.forEach(el => {
          const elementId = el.getAttribute('data-text-element-id');
          if (elementId === newElementId) {
            const contentEditable = el.querySelector('[contenteditable="true"]');
            if (contentEditable instanceof HTMLElement) {
              contentEditable.focus();
              // Move cursor to end
              const range = document.createRange();
              const selection = window.getSelection();
              range.selectNodeContents(contentEditable);
              range.collapse(false);
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          }
        });
      }, 200);
    }
  };

  const handleInsertSystemsTable = () => {
    // Blur all contentEditable elements before showing dialog
    const contentEditables = document.querySelectorAll('[contenteditable="true"]');
    contentEditables.forEach(el => {
      if (el instanceof HTMLElement) {
        el.blur();
      }
    });

    // Clear any text selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }

    // Show dialog after a small delay to ensure blur completes
    setTimeout(() => {
      setPendingElement({ type: 'systems-table' });
      setShowNameDialog(true);
    }, 50);
  };

  const handleInsertText = () => {
    // Blur all contentEditable elements before showing dialog
    const contentEditables = document.querySelectorAll('[contenteditable="true"]');
    contentEditables.forEach(el => {
      if (el instanceof HTMLElement) {
        el.blur();
      }
    });

    // Clear any text selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }

    // Show dialog after a small delay to ensure blur completes
    setTimeout(() => {
      setPendingElement({ type: 'text' });
      setShowNameDialog(true);
    }, 50);
  };

  const handleInsertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          // Blur all contentEditable elements before showing dialog
          const contentEditables = document.querySelectorAll('[contenteditable="true"]');
          contentEditables.forEach(el => {
            if (el instanceof HTMLElement) {
              el.blur();
            }
          });

          // Clear any text selection
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
          }

          // Show dialog after a small delay to ensure blur completes
          setTimeout(() => {
            setPendingElement({
              type: 'image',
              data: {
                src: event.target?.result as string,
                alt: file.name
              }
            });
            setShowNameDialog(true);
          }, 50);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleUploadFile = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer();

          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const pageImages: string[] = [];

          // Convert all pages to images
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
              await page.render({ canvasContext: context, viewport }).promise;
              pageImages.push(canvas.toDataURL());
            }
          }

          // Create PDF element directly without name dialog
          const position = getNextPosition();
          const newElementId = Math.random().toString(36).substring(7);
          const newElement: PdfElement & { workspaceId: string } = {
            id: newElementId,
            workspaceId,
            type: 'pdf',
            position,
            size: { width: 680, height: 800 },
            zIndex: elements.length,
            fileName: file.name,
            currentPage: 1,
            totalPages: pdf.numPages,
            pageImages,
            borderColor: 'transparent',
            borderWidth: 0
          };
          await elementOperations.create(newElement);
          setElements([...elements, newElement]);
        } catch (error) {
          console.error('Error processing PDF:', error);
          console.error('Error details:', error instanceof Error ? error.message : String(error));
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          alert(`Failed to load PDF: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };
    input.click();
  };

  const handleUpdate = async (id: string, updates: Partial<BaseElement>) => {
    // Check if height is changing
    const currentElement = elements.find(el => el.id === id);
    const heightChanged = updates.size && currentElement && updates.size.height !== currentElement.size.height;

    const updatedElements = elements.map((el, index) => {
      if (el.id === id) {
        const updated = { ...el, ...updates };

        // If position is being updated, mark as manually positioned
        if (updates.position && !updates.isManuallyPositioned) {
          updated.isManuallyPositioned = true;
        }

        // If this is the first element (default title element) and content is being updated
        if (index === 0 && 'content' in updated) {
          const textContent = (updated as TextElement).content || '';
          handleTitleChange(textContent);
        }

        // Update in DB (async, don't wait)
        elementOperations.update(id, updates);

        return updated;
      }
      return el;
    });

    // If height changed and element is not manually positioned, recalculate all auto-layout positions
    if (heightChanged && currentElement && currentElement.isManuallyPositioned !== true) {
      const sortedByZIndex = [...updatedElements].sort((a, b) => a.zIndex - b.zIndex);
      let cumulativeY = 20;
      const repositionedElements = sortedByZIndex.map(el => {
        if (el.isManuallyPositioned === true) {
          return el;
        }

        const newPosition = { x: 20, y: cumulativeY };
        cumulativeY += el.size.height + ELEMENT_SPACING;

        // Update position in DB if it changed
        if (el.position.y !== newPosition.y || el.position.x !== newPosition.x) {
          elementOperations.update(el.id, { position: newPosition });
        }

        return { ...el, position: newPosition };
      });

      setElements(repositionedElements);
    } else {
      setElements(updatedElements);
    }
  };

  const handleDelete = async (id: string) => {
    const elementToDelete = elements.find(el => el.id === id);
    if (!elementToDelete) return;

    setElements(elements.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (formatPanelId === id) setFormatPanelId(null);

    setDeletedElement(elementToDelete);
    tableRowsRef.current.delete(id);

    // Delete from DB (will be restored if undo is triggered)
    await elementOperations.delete(id);

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    undoTimerRef.current = setTimeout(() => {
      setDeletedElement(null);
    }, 10000);
  };

  const handleUndo = async () => {
    if (deletedElement) {
      // Restore to DB
      await elementOperations.create(deletedElement as any);
      setElements(prev => [...prev, deletedElement]);
      setDeletedElement(null);
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    }
  };

  const calculateTableHeight = (rows: RowData[], hasVisibleName: boolean = false): number => {
    // Count total visible rows (including expanded children)
    const countVisibleRows = (rows: RowData[]): number => {
      return rows.reduce((count, row) => {
        let rowCount = 1; // Count the row itself
        if (row.children.length > 0 && !row.collapsed) {
          rowCount += countVisibleRows(row.children);
        }
        return count + rowCount;
      }, 0);
    };

    const visibleRowCount = countVisibleRows(rows);
    const rowHeight = 43; // Actual rendered height per row (127px / 3 rows = 42.3px)
    const nameHeaderHeight = 34; // Name header row height: padding (6px top + 6px bottom) + minHeight (20px) + borders (~2px)

    let totalHeight = visibleRowCount * rowHeight;
    if (hasVisibleName) {
      totalHeight += nameHeaderHeight;
    }

    return totalHeight;
  };

  const handleRowsChange = async (elementId: string, rows: RowData[]) => {
    tableRowsRef.current.set(elementId, rows);

    // Calculate and update table height
    const element = elements.find(el => el.id === elementId);
    if (element && element.type === 'systems-table') {
      const tableEl = element as SystemsTableElement;
      const hasVisibleName = element.name && (tableEl.showName !== false);
      const newHeight = calculateTableHeight(rows, hasVisibleName);
      handleContentSizeChange(elementId, element.size.width, newHeight);
    }

    // Persist to database
    await elementOperations.update(elementId, { initialRows: rows } as Partial<DBWorkspaceElement>);
  };

  const handleContentSizeChange = (elementId: string, width: number, height: number) => {
    const currentElement = elements.find(el => el.id === elementId);
    const heightChanged = currentElement && currentElement.size.height !== height;

    const updatedElements = elements.map(el =>
      el.id === elementId
        ? { ...el, size: { width, height } }
        : el
    );

    // If height changed and element is not manually positioned, recalculate all auto-layout positions
    if (heightChanged && currentElement && currentElement.isManuallyPositioned !== true) {
      const sortedByZIndex = [...updatedElements].sort((a, b) => a.zIndex - b.zIndex);
      let cumulativeY = 20;
      const repositionedElements = sortedByZIndex.map(el => {
        if (el.isManuallyPositioned === true) {
          return el;
        }

        const newPosition = { x: 20, y: cumulativeY };
        cumulativeY += el.size.height + ELEMENT_SPACING;

        // Update position in DB if it changed
        if (el.position.y !== newPosition.y || el.position.x !== newPosition.x) {
          elementOperations.update(el.id, { position: newPosition });
        }

        return { ...el, position: newPosition };
      });

      setElements(repositionedElements);
    } else {
      setElements(updatedElements);
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Explicitly blur all contentEditable elements to remove cursor
      const contentEditables = document.querySelectorAll('[contenteditable="true"]');
      contentEditables.forEach(el => {
        if (el instanceof HTMLElement) {
          el.blur();
        }
      });

      // Also blur the currently active element
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      setSelectedId(null);
      setFocusedTextElementId(null);
      setFocusedCellId(null);
      setWorkspaceSelected(false);
      setFormatPanelId(null);
    }
  };

  // Auto-reposition elements when sizes change
  useEffect(() => {
    if (isLoading || isInteracting) return; // Don't reposition while loading or during drag/resize

    let hasChanges = false;
    const updatedElements = [...elements];

    // Separate manually positioned and auto-layout elements
    const manualElements = elements.filter(el => el.isManuallyPositioned);
    const autoElements = elements.filter(el => !el.isManuallyPositioned);

    // Sort auto-layout elements by zIndex
    const sortedAutoIndices = elements
      .map((el, index) => ({ el, index }))
      .filter(({ el }) => !el.isManuallyPositioned)
      .sort((a, b) => a.el.zIndex - b.el.zIndex);

    let cumulativeY = 20; // Start position

    for (let i = 0; i < sortedAutoIndices.length; i++) {
      const { index, el: element } = sortedAutoIndices[i];

      // Check if any manually positioned element occupies this Y range
      let conflictFound = true;
      while (conflictFound) {
        conflictFound = false;
        for (const manualEl of manualElements) {
          const manualTop = manualEl.position.y;
          const manualBottom = manualEl.position.y + manualEl.size.height;
          const proposedBottom = cumulativeY + element.size.height;

          // If proposed position overlaps with manual element, move below it
          if (cumulativeY < manualBottom && proposedBottom > manualTop) {
            cumulativeY = manualBottom + ELEMENT_SPACING;
            conflictFound = true;
            break;
          }
        }
      }

      // Update position if it has changed
      if (element.position.y !== cumulativeY) {
        updatedElements[index] = {
          ...element,
          position: { ...element.position, y: cumulativeY }
        };
        hasChanges = true;
      }

      // Move cumulative Y down by this element's height plus spacing
      cumulativeY += element.size.height + ELEMENT_SPACING;
    }

    if (hasChanges) {
      setElements(updatedElements);
      // Bulk update DB with new positions
      elementOperations.bulkUpdate(updatedElements as any);
    }
  }, [elements.map(el => `${el.id}-${el.size.height}-${el.isManuallyPositioned}-${el.position.y}`).join(','), isLoading, isInteracting]);
  
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const selectedElement = elements.find(el => el.id === formatPanelId);

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Title Bar */}
      {!hideControls && (
        <div className="bg-white border-b border-gray-200 px-8 py-3 flex-shrink-0">
          <Input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-lg font-semibold"
            placeholder="Enter workspace name..."
            autoFocus
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading workspace...</p>
        </div>
      )}

      {/* Canvas Area */}
      {!isLoading && (
        <>
      <div
        className="flex-1 relative bg-white"
        onClick={handleContainerClick}
        style={{ overflow: 'scroll', minHeight: '100%' }}
      >
        <div style={{
          display: 'block',
          padding: '0 20px 20px 0',
          minWidth: 'fit-content',
          minHeight: 'fit-content'
        }}>
        {/* Workspace Canvas with Border */}
        <div
          ref={containerRef}
          className="relative"
          style={{
            width: `${workspace?.canvasWidth || 794}px`,
            height: `${workspace?.canvasHeight || 1123}px`,
            backgroundColor: workspace?.backgroundColor || 'white',
            borderTop: `${workspace?.borderWidth || 1}px solid ${workspace?.borderColor || '#000000'}`,
            borderRight: `${workspace?.borderWidth || 1}px solid ${workspace?.borderColor || '#000000'}`,
            borderBottom: `${workspace?.borderWidth || 1}px solid ${workspace?.borderColor || '#000000'}`,
            borderLeft: `${workspace?.borderWidth || 1}px solid ${workspace?.borderColor || '#000000'}`,
            boxShadow: workspaceSelected ? '0 0 0 2px #3B82F6' : 'none',
            cursor: 'default',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              // Check if click is on the border (use 8px click area for easier targeting)
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const clickY = e.clientY - rect.top;
              const clickableAreaWidth = 8; // 8px clickable area on each border

              const isOnBorder = (
                clickX <= clickableAreaWidth || // Left border
                clickX >= rect.width - clickableAreaWidth || // Right border
                clickY <= clickableAreaWidth || // Top border
                clickY >= rect.height - clickableAreaWidth // Bottom border
              );

              if (isOnBorder) {
                // Clicked on the border, select workspace
                setWorkspaceSelected(true);
                setFormatPanelId('workspace');
                setSelectedId(null);
                setFocusedTextElementId(null);
                setFocusedCellId(null);
              } else {
                // Clicked inside canvas (not on border), deselect everything
                setWorkspaceSelected(false);
                setFormatPanelId(null);
                setSelectedId(null);
                setFocusedTextElementId(null);
                setFocusedCellId(null);
              }
            }
          }}
        >
        {elements.map((element) => {
          if (element.type === 'systems-table') {
            const tableElement = element as SystemsTableElement;
            const isTableSelected = selectedId === element.id && focusedCellId?.tableId !== element.id;

            return (
              <ResizableElement
                key={element.id}
                element={element}
                isSelected={isTableSelected}
                containerRef={containerRef}
                showFormatButton={false}
                showDeleteButton={false}
                minHeight={50}
                actions={{
                  onSelect: () => {
                    if (selectedId === element.id && formatPanelId === element.id) {
                      // If already selected with panel open, clicking again should deselect
                      setSelectedId(null);
                      setFormatPanelId(null);
                    } else {
                      // Explicitly blur all contentEditable elements to remove cursor
                      const contentEditables = document.querySelectorAll('[contenteditable="true"]');
                      contentEditables.forEach(el => {
                        if (el instanceof HTMLElement) {
                          el.blur();
                        }
                      });
                      setSelectedId(element.id);
                      setFocusedCellId(null); // Clear cell edit mode when selecting table
                      setFormatPanelId(element.id); // Show format panel when selected
                      setWorkspaceSelected(false); // Deselect workspace
                    }
                  },
                  onUpdate: (updates) => handleUpdate(element.id, updates),
                  onDelete: () => handleDelete(element.id),
                  onInteractionStart: () => setIsInteracting(true),
                  onInteractionEnd: () => setIsInteracting(false)
                }}
                data-table-element
              >
                <div
                  className="inline-block"
                  style={{
                    border: element.borderWidth && element.borderWidth > 0 && element.borderColor !== 'transparent'
                      ? `${element.borderWidth}px solid ${element.borderColor}`
                      : 'none'
                  }}
                  onClick={(e) => {
                    // When clicking inside the table, deselect it
                    // The ResizableElement will prevent this if clicking on borders
                    if (selectedId === element.id) {
                      setSelectedId(null);
                      setFormatPanelId(null); // Also close format panel
                    }
                  }}
                >
                  <SystemsTable
                    initialRows={tableElement.initialRows}
                    gridlines={tableElement.gridlines}
                    initialLevelWidths={tableElement.levelWidths}
                    initialMeaningWidth={tableElement.meaningWidth}
                    initialName={element.name}
                    initialShowName={tableElement.showName ?? true}
                    onRowsChange={(rows) => handleRowsChange(element.id, rows)}
                    onLevelWidthsChange={(levelWidths) => {
                      elementOperations.update(element.id, { levelWidths } as Partial<DBWorkspaceElement>);
                    }}
                    onMeaningWidthChange={(meaningWidth) => {
                      elementOperations.update(element.id, { meaningWidth } as Partial<DBWorkspaceElement>);
                    }}
                    onNameChange={(name) => {
                      elementOperations.update(element.id, { name } as Partial<DBWorkspaceElement>);
                    }}
                    onShowNameChange={(showName) => {
                      elementOperations.update(element.id, { showName } as Partial<DBWorkspaceElement>);
                    }}
                    onCellFocusChange={(rowId, column, isFocused, applyFormatFn, applyHyperlinkFn, selectedText) => {
                      if (isFocused) {
                        setFocusedCellId({ tableId: element.id, rowId, column });
                        if (applyFormatFn) {
                          cellApplyFormatRef.current = applyFormatFn;
                        }
                        if (applyHyperlinkFn) {
                          cellApplyHyperlinkRef.current = applyHyperlinkFn;
                        }
                        if (selectedText) {
                          setCellSelectedText(selectedText);
                        }
                      } else if (focusedCellId?.tableId === element.id && focusedCellId?.rowId === rowId && focusedCellId?.column === column) {
                        setFocusedCellId(null);
                        cellApplyFormatRef.current = null;
                        cellApplyHyperlinkRef.current = null;
                        setCellSelectedText('');
                      }
                    }}
                    workspaceId={workspaceId}
                    elementId={element.id}
                  />
                </div>
              </ResizableElement>
            );
          }
          
          if (element.type === 'text') {
            const textElement = element as TextElement;
            const isFocused = focusedTextElementId === element.id;
            const isElementSelected = selectedId === element.id && !isFocused;
            
            return (
              <TextElementComponent
                key={element.id}
                element={textElement}
                isSelected={isElementSelected}
                containerRef={containerRef}
                onSelect={() => {
                  // Explicitly blur all contentEditable elements to remove cursor
                  const contentEditables = document.querySelectorAll('[contenteditable="true"]');
                  contentEditables.forEach(el => {
                    if (el instanceof HTMLElement) {
                      el.blur();
                    }
                  });
                  setSelectedId(element.id);
                  setFocusedTextElementId(null); // Clear edit mode when selecting element
                  setWorkspaceSelected(false); // Deselect workspace
                }}
                onUpdate={(updates) => handleUpdate(element.id, updates)}
                onDelete={() => handleDelete(element.id)}
                existingWorkspaces={existingWorkspaces}
                onNavigateToWorkspace={onNavigateToWorkspace}
                onFocusChange={(isFocused, applyFormatFn, applyHyperlinkFn, selectedText) => {
                  if (isFocused) {
                    // Entering edit mode - clear selection
                    setSelectedId(null);
                    setFocusedTextElementId(element.id);
                    // Store the apply format and hyperlink functions
                    if (applyFormatFn) {
                      textElementApplyFormatRef.current = applyFormatFn;
                    }
                    if (applyHyperlinkFn) {
                      textElementApplyHyperlinkRef.current = applyHyperlinkFn;
                    }
                    // Update selected text
                    setTextElementSelectedText(selectedText || '');
                  } else if (focusedTextElementId === element.id) {
                    setFocusedTextElementId(null);
                    textElementApplyFormatRef.current = null;
                    textElementApplyHyperlinkRef.current = null;
                    setTextElementSelectedText('');
                  }
                }}
              />
            );
          }
          
          if (element.type === 'image') {
            const imageElement = element as ImageElement;
            return (
              <ResizableElement
                key={element.id}
                element={element}
                isSelected={selectedId === element.id}
                containerRef={containerRef}
                actions={{
                  onSelect: () => {
                    // Explicitly blur all contentEditable elements to remove cursor
                    const contentEditables = document.querySelectorAll('[contenteditable="true"]');
                    contentEditables.forEach(el => {
                      if (el instanceof HTMLElement) {
                        el.blur();
                      }
                    });
                    setSelectedId(element.id);
                    setFocusedTextElementId(null); // Clear any text edit mode
                    setFocusedCellId(null); // Clear any cell edit mode
                    setWorkspaceSelected(false); // Deselect workspace
                  },
                  onUpdate: (updates) => handleUpdate(element.id, updates),
                  onDelete: () => handleDelete(element.id),
                  onInteractionStart: () => setIsInteracting(true),
                  onInteractionEnd: () => setIsInteracting(false)
                }}
              >
                <img
                  src={imageElement.src}
                  alt={imageElement.alt || 'Uploaded image'}
                  className="w-full h-full object-contain"
                  style={{
                    border: element.borderWidth && element.borderWidth > 0
                      ? `${element.borderWidth}px solid ${element.borderColor}`
                      : 'none'
                  }}
                />
              </ResizableElement>
            );
          }
          
          if (element.type === 'pdf') {
            const pdfElement = element as PdfElement;
            return (
              <PdfElementComponent
                key={element.id}
                element={pdfElement}
                isSelected={selectedId === element.id}
                containerRef={containerRef}
                data-pdf-element
                onSelect={() => {
                  if (selectedId === element.id && formatPanelId === element.id) {
                    // If already selected with panel open, clicking again should deselect
                    setSelectedId(null);
                    setFormatPanelId(null);
                  } else {
                    // Explicitly blur all contentEditable elements to remove cursor
                    const contentEditables = document.querySelectorAll('[contenteditable="true"]');
                    contentEditables.forEach(el => {
                      if (el instanceof HTMLElement) {
                        el.blur();
                      }
                    });
                    setSelectedId(element.id);
                    setFormatPanelId(element.id); // Show format panel when selected
                    setFocusedTextElementId(null); // Clear any text edit mode
                    setFocusedCellId(null); // Clear any cell edit mode
                    setWorkspaceSelected(false); // Deselect workspace
                  }
                }}
                onUpdate={(updates) => handleUpdate(element.id, updates)}
                onDelete={() => handleDelete(element.id)}
                onInteractionStart={() => setIsInteracting(true)}
                onInteractionEnd={() => setIsInteracting(false)}
              />
            );
          }
          
          if (element.type === 'file') {
            const fileElement = element as FileElement;
            return (
              <ResizableElement
                key={element.id}
                element={element}
                isSelected={selectedId === element.id}
                containerRef={containerRef}
                actions={{
                  onSelect: () => {
                    setSelectedId(element.id);
                    setWorkspaceSelected(false);
                  },
                  onUpdate: (updates) => handleUpdate(element.id, updates),
                  onDelete: () => handleDelete(element.id),
                  onInteractionStart: () => setIsInteracting(true),
                  onInteractionEnd: () => setIsInteracting(false)
                }}
              >
                <div 
                  className="w-full h-full p-4 bg-white flex items-center gap-3"
                  style={{
                    border: element.borderWidth && element.borderWidth > 0
                      ? `${element.borderWidth}px solid ${element.borderColor}`
                      : '1px solid #e5e7eb'
                  }}
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{fileElement.fileName}</p>
                    {fileElement.fileSize && (
                      <p className="text-xs text-gray-500">
                        {(fileElement.fileSize / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                </div>
              </ResizableElement>
            );
          }
          
          return null;
        })}
        </div>
        {/* End Workspace Canvas */}
        </div>
        {/* End Wrapper */}

        {/* Format Panel for Workspace */}
        {workspaceSelected && formatPanelId === 'workspace' && workspace && (
          <WorkspaceFormatPanel
            workspace={workspace}
            onUpdate={handleWorkspaceUpdate}
            onClose={() => {
              setWorkspaceSelected(false);
              setFormatPanelId(null);
            }}
            onDelete={onClose}
          />
        )}

        {/* Format Panel for Systems Tables */}
        {selectedElement && selectedElement.type === 'systems-table' && formatPanelId && (
          <SystemsTableFormatPanel
            element={selectedElement as SystemsTableElement}
            onUpdate={(updates) => handleUpdate(formatPanelId, updates)}
            onClose={() => {
              setFormatPanelId(null);
              setSelectedId(null);
            }}
            onDelete={() => {
              if (formatPanelId) {
                handleDelete(formatPanelId);
                setFormatPanelId(null);
                setSelectedId(null);
              }
            }}
          />
        )}

        {/* Format Panel for PDF Elements */}
        {selectedElement && selectedElement.type === 'pdf' && formatPanelId && (
          <PdfElementFormatPanel
            element={selectedElement as PdfElement}
            onUpdate={(updates) => handleUpdate(formatPanelId, updates)}
            onClose={() => {
              setFormatPanelId(null);
              setSelectedId(null);
            }}
            onDelete={() => {
              if (formatPanelId) {
                handleDelete(formatPanelId);
                setFormatPanelId(null);
                setSelectedId(null);
              }
            }}
          />
        )}

        {/* Text Format Panel - Appears on right side when text element is focused */}
        {focusedTextElementId && (
          <div
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-white rounded-l-lg shadow-lg border border-gray-200 p-4 w-64"
            data-text-format-panel
          >
            <TextFormatPanel
              position={{ x: 0, y: 0 }}
              selectedText={textElementSelectedText}
              onClose={() => setFocusedTextElementId(null)}
              onApply={(format) => {
                if (textElementApplyFormatRef.current) {
                  textElementApplyFormatRef.current(format);
                }
              }}
              onApplyHyperlink={(workspaceName, linkType) => {
                if (textElementApplyHyperlinkRef.current) {
                  textElementApplyHyperlinkRef.current(workspaceName, linkType);
                }
              }}
              isSidePanel={true}
            />
          </div>
        )}

        {/* Cell Format Panel - Appears on right side when table cell is focused */}
        {focusedCellId && (
          <div
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-white rounded-l-lg shadow-lg border border-gray-200 p-4 w-64"
            data-text-format-panel
          >
            <TextFormatPanel
              position={{ x: 0, y: 0 }}
              selectedText={cellSelectedText}
              onClose={() => {
                setFocusedCellId(null);
                cellApplyFormatRef.current = null;
                cellApplyHyperlinkRef.current = null;
                setCellSelectedText('');
              }}
              onApply={(format) => {
                if (cellApplyFormatRef.current) {
                  cellApplyFormatRef.current(format);
                }
              }}
              onApplyHyperlink={(workspaceName, linkType) => {
                if (cellApplyHyperlinkRef.current) {
                  cellApplyHyperlinkRef.current(workspaceName, linkType);
                }
              }}
              isSidePanel={true}
            />
          </div>
        )}

        {/* Undo Button */}
        {deletedElement && (
          <div
            className="absolute pointer-events-auto"
            style={{
              left: `${deletedElement.position.x}px`,
              top: `${deletedElement.position.y}px`,
              zIndex: 10000
            }}
          >
            <Button
              onClick={handleUndo}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              Undo Delete
            </Button>
          </div>
        )}
      </div>
      {/* End Scrollable Container */}

      {/* Bottom Button Bar */}
      {!hideControls && (
        <div className="bg-white border-t border-gray-200 px-8 py-4 flex-shrink-0 sticky bottom-0">
          <div className="flex gap-2 justify-between items-center">
            <div className="flex gap-4">
              <Button onClick={handleInsertSystemsTable} variant="outline">
                Insert Systems Table
              </Button>
              <Button onClick={handleInsertText} variant="outline">
                Insert Text
              </Button>
              <Button onClick={handleUploadFile} variant="outline">
                Upload PDF
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowShareDialog(true)} variant="outline" disabled={!title.trim()}>
                Share
              </Button>
              {onSaveAndClose && (
                <Button onClick={onSaveAndClose} variant="default" disabled={!title.trim()}>
                  Save and Close
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* Element Name Dialog */}
      {showNameDialog && pendingElement && (
        <ElementNameDialog
          elementType={pendingElement.type === 'systems-table' ? 'Systems Table' :
                       pendingElement.type === 'text' ? 'Text' :
                       pendingElement.type === 'image' ? 'Image' : 'PDF'}
          onConfirm={createElementWithName}
          onCancel={() => {
            setShowNameDialog(false);
            setPendingElement(null);
          }}
          workspaceId={workspaceId}
          onInsertExisting={handleInsertExistingElement}
        />
      )}

      {/* Share Dialog */}
      {showShareDialog && (
        <ShareDialog
          workspaceName={title}
          workspaceId={workspaceId}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </div>
  );
}