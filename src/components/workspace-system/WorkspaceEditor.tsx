import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../ui/button';
import { X } from 'lucide-react';
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
import { useWorkspaceContext } from './WorkspaceSystem';
import * as pdfjsLib from 'pdfjs-dist';
import { elementOperations, WorkspaceElement as DBWorkspaceElement, workspaceOperations, Workspace } from '../../lib/supabase-db';
import { WorkspaceHierarchyEntry } from '../../lib/backup-operations';
import { parseClipboardAsTable } from '../../utils/tableParsing';
import { getDisplayName, getDisplayHtml } from '../../lib/workspace-utils';

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
  existingWorkspaces?: string[];
  linkedWorkspaces?: string[]; // Non-system workspaces only
  systemWorkspaces?: string[]; // System names (isSystem: true workspaces)
  workspaceHierarchy?: Map<string, WorkspaceHierarchyEntry>; // Workspace parent-child relationships from hyperlinks
  onNavigateToWorkspace?: (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page', position?: { x: number; y: number }) => void;
  onDuplicateToWorkspace?: (newWorkspaceName: string, sourceWorkspaceName: string, linkType: 'comment' | 'split-view' | 'new-page') => void;
  hideControls?: boolean;
  initialElements?: WorkspaceElement[];
  isViewMode?: boolean;
  onSwitchToEditMode?: () => void;
  isPopup?: boolean; // When true, shows Insert buttons but hides Share/Save/Close
  forceTitleBar?: boolean; // When true, shows title bar even for non-system workspaces (used in split view)
  onWorkspaceUpdate?: (updates: Partial<Workspace>) => void; // Callback when workspace properties change (width, margins, etc.)
}

const ELEMENT_SPACING = 43; // 43px spacing between elements (mygap = default row height)
const ROW_THRESHOLD = 20; // pixels - elements with Y positions within this threshold are considered on the same row
const MY_LEFT_MARGIN = 20; // Fixed left margin - elements cannot move left of this
const MY_TOP_MARGIN = 20; // Fixed top margin - space between title bar and first element
const MY_RIGHT_MARGIN = 20; // Fixed right margin - default space between element right edge and workspace right edge

// A4 dimensions for systems_page (fixed size)
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

// Default element width fits within margins
const DEFAULT_ELEMENT_WIDTH = A4_WIDTH - MY_LEFT_MARGIN - MY_RIGHT_MARGIN; // 754px

// TableContainer: Wraps table content and uses ResizeObserver to report actual rendered height
interface TableContainerProps {
  elementId: string;
  borderWidth?: number;
  borderColor?: string;
  children: React.ReactNode;
  onHeightChange: (elementId: string, height: number) => void;
  onClick?: (e: React.MouseEvent) => void;
}

function TableContainer({ elementId, borderWidth, borderColor, children, onHeightChange, onClick }: TableContainerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const lastReportedHeight = useRef<number>(0);

  useEffect(() => {
    if (!contentRef.current) return;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const borderBoxSize = entry.borderBoxSize?.[0];
        let height: number;
        if (borderBoxSize) {
          height = Math.ceil(borderBoxSize.blockSize);
        } else {
          height = Math.ceil(entry.contentRect.height) + (borderWidth || 0) * 2;
        }
        // Only report if height changed significantly (more than 1px) to avoid infinite loops
        if (Math.abs(height - lastReportedHeight.current) > 1) {
          lastReportedHeight.current = height;
          onHeightChange(elementId, height);
        }
      }
    });

    resizeObserverRef.current.observe(contentRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [elementId, onHeightChange, borderWidth]);

  return (
    <div
      ref={contentRef}
      className="inline-block"
      style={{
        border: borderWidth && borderWidth > 0 && borderColor !== 'transparent'
          ? `${borderWidth}px solid ${borderColor}`
          : 'none'
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function WorkspaceEditor({
  workspaceId,
  initialTitle = '',
  onTitleChange,
  onClose,
  existingWorkspaces = [],
  linkedWorkspaces = [],
  systemWorkspaces = [],
  workspaceHierarchy,
  onNavigateToWorkspace,
  onDuplicateToWorkspace,
  hideControls = false,
  initialElements = [],
  isViewMode = false,
  onSwitchToEditMode,
  isPopup = false,
  forceTitleBar = false,
  onWorkspaceUpdate
}: WorkspaceEditorProps) {
  // Get naming context for auto-prefix
  let workspaceContext: { namingPrefix: string; currentSystemName: string | null } | null = null;
  try {
    workspaceContext = useWorkspaceContext();
  } catch {
    // Context not available (used outside WorkspaceSystem)
  }
  const namingPrefix = workspaceContext?.namingPrefix || '';
  const currentSystemName = workspaceContext?.currentSystemName || null;

  const [title, setTitle] = useState(initialTitle);
  const [elements, setElements] = useState<WorkspaceElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [formatPanelId, setFormatPanelId] = useState<string | null>(null);
  const [deletedElement, setDeletedElement] = useState<WorkspaceElement | null>(null);
  const [focusedTextElementId, setFocusedTextElementId] = useState<string | null>(null);
  const [focusedCellId, setFocusedCellId] = useState<{ tableId: string; rowId: string; column: 'bid' | 'meaning' } | null>(null);
  const focusedCellIdRef = useRef<{ tableId: string; rowId: string; column: 'bid' | 'meaning' } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tableRowsRef = useRef<Map<string, RowData[]>>(new Map());
  const textElementApplyFormatRef = useRef<((format: any) => void) | null>(null);
  const textElementApplyHyperlinkRef = useRef<((workspaceName: string, linkType: 'comment' | 'new-page') => void) | null>(null);
  const textElementRemoveHyperlinkRef = useRef<(() => void) | null>(null);
  const [textElementIsHyperlinkSelected, setTextElementIsHyperlinkSelected] = useState(false);
  const cellApplyFormatRef = useRef<((format: any) => void) | null>(null);
  const cellApplyHyperlinkRef = useRef<((workspaceName: string, linkType: 'comment' | 'new-page') => void) | null>(null);
  const cellRemoveHyperlinkRef = useRef<(() => void) | null>(null);
  const [cellIsHyperlinkSelected, setCellIsHyperlinkSelected] = useState(false);
  const [textElementSelectedText, setTextElementSelectedText] = useState<string>('');
  const [cellSelectedText, setCellSelectedText] = useState<string>('');
  const [workspaceNameSelectedText, setWorkspaceNameSelectedText] = useState<string>('');
  const [focusedWorkspaceName, setFocusedWorkspaceName] = useState(false);
  const workspaceNameRef = useRef<HTMLDivElement>(null);
  const workspaceNameApplyFormatRef = useRef<((format: any) => void) | null>(null);
  const workspaceNameSavedSelectionRef = useRef<Range | null>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [pendingElement, setPendingElement] = useState<{
    type: 'systems-table' | 'text' | 'image' | 'pdf';
    data?: any;
  } | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceSelected, setWorkspaceSelected] = useState(false);

  // Computed margin values - use workspace settings or defaults
  const leftMargin = useMemo(() => workspace?.leftMargin ?? MY_LEFT_MARGIN, [workspace?.leftMargin]);
  const topMargin = useMemo(() => workspace?.topMargin ?? MY_TOP_MARGIN, [workspace?.topMargin]);
  const canvasWidth = useMemo(() => workspace?.canvasWidth ?? A4_WIDTH, [workspace?.canvasWidth]);
  const rightMargin = MY_RIGHT_MARGIN; // Keep right margin constant for now
  const defaultElementWidth = useMemo(() => canvasWidth - leftMargin - rightMargin, [canvasWidth, leftMargin, rightMargin]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copiedTable, setCopiedTable] = useState<SystemsTableElement | null>(() => {
    // Initialize from sessionStorage if available
    const stored = sessionStorage.getItem('copiedTable');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Keep focusedCellIdRef in sync with focusedCellId state for use in closures
  useEffect(() => {
    focusedCellIdRef.current = focusedCellId;
  }, [focusedCellId]);

  // Listen for storage events to sync copiedTable across WorkspaceEditor instances
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'copiedTable') {
        if (e.newValue) {
          try {
            setCopiedTable(JSON.parse(e.newValue));
          } catch {
            setCopiedTable(null);
          }
        } else {
          setCopiedTable(null);
        }
      }
    };

    // Also listen for custom event for same-window updates
    const handleCustomStorageEvent = () => {
      const stored = sessionStorage.getItem('copiedTable');
      if (stored) {
        try {
          setCopiedTable(JSON.parse(stored));
        } catch {
          setCopiedTable(null);
        }
      } else {
        setCopiedTable(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('copiedTableChanged', handleCustomStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('copiedTableChanged', handleCustomStorageEvent);
    };
  }, []);

  // Popup sizing constants
  const POPUP_MIN_WIDTH = Math.ceil(A4_WIDTH / 2); // ~397px (half A4 width)
  const POPUP_MIN_HEIGHT = 50; // Minimal height - sizes based on content

  // Calculate content bounds for popup auto-sizing
  const calculatePopupBounds = (elements: WorkspaceElement[]) => {
    if (elements.length === 0) {
      return { width: POPUP_MIN_WIDTH, height: POPUP_MIN_HEIGHT };
    }

    let maxRight = 0;
    let maxBottom = 0;

    elements.forEach(el => {
      const right = el.position.x + el.size.width;
      const bottom = el.position.y + el.size.height;
      if (right > maxRight) maxRight = right;
      if (bottom > maxBottom) maxBottom = bottom;
    });

    // Add right margin to content width, bottom margin to height
    const contentWidth = Math.max(POPUP_MIN_WIDTH, maxRight + MY_RIGHT_MARGIN);
    const contentHeight = Math.max(POPUP_MIN_HEIGHT, maxBottom + topMargin);

    // Cap at A4 size - scroll enabled beyond this
    return {
      width: Math.min(contentWidth, A4_WIDTH),
      height: Math.min(contentHeight, A4_HEIGHT)
    };
  };

  // Calculate content bounds for systems_page (expands with content, scroll enabled)
  const calculateSystemsPageBounds = (elements: WorkspaceElement[]) => {
    if (elements.length === 0) {
      return { width: canvasWidth, height: A4_HEIGHT };
    }

    let maxRight = 0;
    let maxBottom = 0;

    elements.forEach(el => {
      const elWidth = el.type === 'systems-table'
        ? ((el as SystemsTableElement).meaningWidth || defaultElementWidth)
        : el.size.width;
      const right = el.position.x + elWidth;
      const bottom = el.position.y + el.size.height;
      if (right > maxRight) maxRight = right;
      if (bottom > maxBottom) maxBottom = bottom;
    });

    // Add right margin to content width, bottom margin to height
    const contentWidth = Math.max(canvasWidth, maxRight + MY_RIGHT_MARGIN);
    const contentHeight = Math.max(A4_HEIGHT, maxBottom + topMargin);

    return { width: contentWidth, height: contentHeight };
  };

  // Get canvas dimensions
  // - systems_page: Expands with content, scroll enabled
  // - popup: Dynamic based on content, max A4 size, scroll after that
  const getCanvasDimensions = () => {
    if (isPopup) {
      // Popup: dynamic sizing based on content, capped at A4
      return calculatePopupBounds(elements);
    }

    // Systems_page: Expands with content (scroll enabled)
    return calculateSystemsPageBounds(elements);
  };

  const canvasDimensions = getCanvasDimensions();

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
        // Step 1: Use stored heights from DB (don't recalculate)
        // Height calculation happens when rows actually change, not on load
        // This ensures the stored height (which reflects the actual collapsed/expanded state) is used
        const elementsWithCorrectHeights = dbElements;

        // Step 2: With fixed spacing model, ensure proper positioning on load
        // Preserves side-by-side layout (elements on same row stay together)
        // Use global ROW_THRESHOLD constant
        const rows: (typeof elementsWithCorrectHeights)[] = [];

        const sortedByY = [...elementsWithCorrectHeights].sort((a, b) => a.position.y - b.position.y);

        sortedByY.forEach(el => {
          const lastRow = rows[rows.length - 1];
          if (!lastRow || Math.abs(el.position.y - lastRow[0].position.y) > ROW_THRESHOLD) {
            rows.push([el]);
          } else {
            lastRow.push(el);
          }
        });

        let cumulativeY = topMargin;
        const repositioned: typeof elementsWithCorrectHeights = [];

        rows.forEach(row => {
          const rowY = cumulativeY;
          const maxHeight = Math.max(...row.map(el => el.size.height));

          row.forEach(el => {
            repositioned.push({ ...el, position: { ...el.position, y: rowY } });
          });

          cumulativeY = rowY + maxHeight + ELEMENT_SPACING;
        });

        setElements(repositioned);

        // Step 3: Update positions in database if they changed
        for (const el of repositioned) {
          const originalEl = dbElements.find(dbe => dbe.id === el.id);
          if (originalEl) {
            const positionChanged = el.position.y !== originalEl.position.y;
            if (positionChanged) {
              await elementOperations.update(el.id, { position: el.position });
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

  // Workspace name text selection handler
  const handleWorkspaceNameSelect = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString();

    if (selectedText.length > 0) {
      setWorkspaceNameSelectedText(selectedText);
      // Save the selection range
      workspaceNameSavedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    } else {
      setWorkspaceNameSelectedText('');
    }
  };

  // Workspace name focus handler
  const handleWorkspaceNameFocus = () => {
    // Clear other focus states (no format panel for workspace name per user request)
    setFocusedWorkspaceName(false);
    setFocusedTextElementId(null);
    setFocusedCellId(null);
    setSelectedId(null);
    setWorkspaceSelected(false);
    setFormatPanelId(null);
  };

  // Workspace name blur handler
  const handleWorkspaceNameBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Don't blur if clicking on format panel
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('[data-text-format-panel]')) {
      return;
    }

    // Extract plain text and HTML content for the title
    if (workspaceNameRef.current) {
      const plainText = workspaceNameRef.current.textContent || '';
      const htmlContent = workspaceNameRef.current.innerHTML || '';

      // Save both plain text title and HTML content
      if (plainText !== title) {
        handleTitleChange(plainText);
      }

      // Always save HTML content to preserve formatting
      workspaceOperations.update(workspaceId, { titleHtmlContent: htmlContent });
    }

    setFocusedWorkspaceName(false);
    setWorkspaceNameSelectedText('');
    workspaceNameSavedSelectionRef.current = null;
  };

  // Workspace name input handler
  const handleWorkspaceNameInput = () => {
    if (workspaceNameRef.current) {
      const plainText = workspaceNameRef.current.textContent || '';
      if (plainText !== title) {
        setTitle(plainText);
        if (plainText.trim()) {
          onTitleChange?.(plainText);
        }
      }
    }
  };

  // Apply format to workspace name
  const applyWorkspaceNameFormat = (format: any) => {
    if (!workspaceNameRef.current) return;

    // Focus the contenteditable
    workspaceNameRef.current.focus();

    // Handle text alignment - applies to the entire workspace name container
    if (format.textAlign) {
      workspaceNameRef.current.style.textAlign = format.textAlign;
      // Save alignment to database
      workspaceOperations.update(workspaceId, { titleTextAlign: format.textAlign });

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

    // Try to restore saved selection or get current selection
    let workingRange: Range | null = workspaceNameSavedSelectionRef.current;

    if (!workingRange) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        workingRange = selection.getRangeAt(0);

        // If no text is selected, select all content
        if (selection.toString().length === 0) {
          workingRange = document.createRange();
          workingRange.selectNodeContents(workspaceNameRef.current);
          selection.removeAllRanges();
          selection.addRange(workingRange);
        }
      } else {
        // No selection at all, select all content
        workingRange = document.createRange();
        workingRange.selectNodeContents(workspaceNameRef.current);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(workingRange);
        }
      }
    } else {
      // Restore the saved selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(workingRange);
      }
    }

    if (!workingRange) return;

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

    // Handle text decoration
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

    // Apply formatting
    try {
      const range = workingRange;
      const fragment = range.extractContents();

      // Collect text segments with their existing styles
      const segments: Array<{ text: string; cssText: string }> = [];

      const collectTextSegments = (node: Node, parentCssText: string = '') => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          if (text) {
            segments.push({ text, cssText: parentCssText });
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const currentCssText = element.style.cssText || parentCssText;
          node.childNodes.forEach(child => {
            collectTextSegments(child, currentCssText);
          });
        } else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
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
        if (format.underline || format.strikethrough) {
          const decorations: string[] = [];
          if (format.underline) decorations.push('underline');
          if (format.strikethrough) decorations.push('line-through');
          newSpan.style.textDecoration = decorations.join(' ');
        }

        newSpan.textContent = text;
        mergedFragment.appendChild(newSpan);
      });

      range.insertNode(mergedFragment);

      // Clear saved selection
      workspaceNameSavedSelectionRef.current = null;

      // Save HTML content to database after formatting
      if (workspaceNameRef.current) {
        const htmlContent = workspaceNameRef.current.innerHTML || '';
        workspaceOperations.update(workspaceId, { titleHtmlContent: htmlContent });
      }
    } catch (error) {
      console.error('Error applying format to workspace name:', error);
    }
  };

  // Set up the apply format ref
  useEffect(() => {
    workspaceNameApplyFormatRef.current = applyWorkspaceNameFormat;
  }, []);

  // Initialize workspace name contentEditable with title (including HTML formatting and alignment)
  useEffect(() => {
    if (workspaceNameRef.current && !focusedWorkspaceName) {
      // Load HTML content if available, otherwise use plain text title
      if (workspace?.titleHtmlContent) {
        workspaceNameRef.current.innerHTML = getDisplayHtml(workspace.titleHtmlContent, title);
      } else {
        const displayName = getDisplayName(title);
        const currentContent = workspaceNameRef.current.textContent || '';
        if (currentContent !== displayName) {
          workspaceNameRef.current.textContent = displayName;
        }
      }
      // Apply saved text alignment
      if (workspace?.titleTextAlign) {
        workspaceNameRef.current.style.textAlign = workspace.titleTextAlign;
      }
    }
  }, [title, focusedWorkspaceName, workspace?.titleHtmlContent, workspace?.titleTextAlign]);

  const handleWorkspaceUpdate = async (updates: Partial<Workspace>) => {
    if (workspace) {
      const updatedWorkspace = { ...workspace, ...updates };
      setWorkspace(updatedWorkspace);
      await workspaceOperations.update(workspaceId, updates);

      // If canvas width changed, resize elements to fit within new width
      if (updates.canvasWidth !== undefined) {
        const newLeftMargin = updates.leftMargin ?? workspace.leftMargin ?? MY_LEFT_MARGIN;
        const newCanvasWidth = updates.canvasWidth;
        const newDefaultWidth = newCanvasWidth - newLeftMargin - MY_RIGHT_MARGIN;

        // Update all elements that exceed the new width
        const updatedElements = elements.map(el => {
          if (el.type === 'systems-table') {
            const tableEl = el as SystemsTableElement;
            const currentMeaningWidth = tableEl.meaningWidth || defaultElementWidth;
            // If table is wider than new default width, shrink it
            if (currentMeaningWidth > newDefaultWidth) {
              return { ...tableEl, meaningWidth: newDefaultWidth };
            }
          } else {
            // For other elements, check if width exceeds new default
            if (el.size.width > newDefaultWidth) {
              return { ...el, size: { ...el.size, width: newDefaultWidth } };
            }
          }
          return el;
        });

        // Update local state and persist changes
        setElements(updatedElements);
        for (const el of updatedElements) {
          const original = elements.find(e => e.id === el.id);
          if (original !== el) {
            await elementOperations.update(el.id, el);
          }
        }
      }

      // Notify parent component of workspace updates (for width, margins, etc.)
      if (onWorkspaceUpdate) {
        onWorkspaceUpdate(updates);
      }
    }
  };

  const getNextPosition = () => {
    // Find the bottom-most element and add consistent spacing below it
    if (elements.length === 0) {
      return { x: leftMargin, y: topMargin };
    }

    // Find the element with the highest bottom edge using actual DOM measurements
    let maxBottom = 0;
    let bottomElement: WorkspaceElement | null = null;

    elements.forEach(el => {
      // Try to get actual rendered height from DOM
      const domElement = containerRef.current?.querySelector(`[data-element-id="${el.id}"]`);
      let actualBottom: number;

      if (domElement) {
        // Use actual rendered height from DOM
        const rect = domElement.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          // Calculate bottom position relative to container
          actualBottom = el.position.y + rect.height;
        } else {
          // Fallback to stored size
          actualBottom = el.position.y + el.size.height;
        }
      } else {
        // Fallback to stored size if DOM element not found
        actualBottom = el.position.y + el.size.height;
      }

      if (actualBottom > maxBottom) {
        maxBottom = actualBottom;
        bottomElement = el;
      }
    });

    // Use consistent 1-line spacing after all elements
    return { x: leftMargin, y: maxBottom + ELEMENT_SPACING };
  };

  // Recalculate all element positions based on their order - fixed spacing between rows
  // Preserves side-by-side layout (elements on same row stay together)
  const recalculatePositions = useCallback((elementsToPosition: WorkspaceElement[], saveToDb = true): WorkspaceElement[] => {
    if (elementsToPosition.length === 0) return [];

    // Group elements into rows (elements with similar Y positions are on same row)
    // Use global ROW_THRESHOLD constant
    const rows: WorkspaceElement[][] = [];

    const sortedByY = [...elementsToPosition].sort((a, b) => a.position.y - b.position.y);

    sortedByY.forEach(el => {
      const lastRow = rows[rows.length - 1];
      if (!lastRow || Math.abs(el.position.y - lastRow[0].position.y) > ROW_THRESHOLD) {
        // Start new row
        rows.push([el]);
      } else {
        // Add to current row
        lastRow.push(el);
      }
    });

    // Recalculate Y positions row by row
    let cumulativeY = topMargin;
    const repositioned: WorkspaceElement[] = [];

    rows.forEach(row => {
      // All elements in a row get the same Y position
      const rowY = cumulativeY;

      // Find the tallest element in this row
      const maxHeight = Math.max(...row.map(el => el.size.height));

      row.forEach(el => {
        // Only update DB if position actually changed
        if (saveToDb && el.position.y !== rowY) {
          elementOperations.update(el.id, { position: { ...el.position, y: rowY } });
        }
        repositioned.push({ ...el, position: { ...el.position, y: rowY } });
      });

      cumulativeY = rowY + maxHeight + ELEMENT_SPACING;
    });

    return repositioned;
  }, []);

  // Helper to get actual element width (for tables, meaningWidth is the total table width)
  const getActualElementWidth = (element: WorkspaceElement): number => {
    if (element.type === 'systems-table') {
      const tableEl = element as SystemsTableElement;
      // meaningWidth represents the total table width (including bid columns)
      return tableEl.meaningWidth || defaultElementWidth;
    }
    return element.size.width;
  };

  // Handle table width change - update X positions of elements to the right on same row
  const handleTableWidthChange = useCallback((elementId: string, newMeaningWidth: number) => {
    setElements(prevElements => {
      const element = prevElements.find(el => el.id === elementId);
      if (!element) {
        return prevElements;
      }

      // Get old and new widths
      const oldWidth = (element as SystemsTableElement).meaningWidth || defaultElementWidth;
      const widthDelta = newMeaningWidth - oldWidth;

      // Save the new meaningWidth to DB
      elementOperations.update(elementId, { meaningWidth: newMeaningWidth } as Partial<DBWorkspaceElement>);

      if (widthDelta === 0) {
        return prevElements;
      }

      // Update the element with new width
      const updatedElements = prevElements.map(el =>
        el.id === elementId
          ? { ...el, meaningWidth: newMeaningWidth } as WorkspaceElement
          : el
      );

      // Find the element's Y position
      const elementY = element.position.y;

      // Find elements on the same row that are to the RIGHT of this element
      const elementsOnSameRow = updatedElements.filter(el =>
        Math.abs(el.position.y - elementY) <= ROW_THRESHOLD
      );

      // Sort by X position to properly identify which are to the right
      elementsOnSameRow.sort((a, b) => a.position.x - b.position.x);

      // Find the index of current element
      const currentIndex = elementsOnSameRow.findIndex(el => el.id === elementId);

      // Get all elements to the right
      const elementsToRight = elementsOnSameRow.slice(currentIndex + 1);

      if (elementsToRight.length === 0) {
        // No elements to the right, just return with updated width
        return updatedElements;
      }

      // Update X positions of elements to the right
      const result = updatedElements.map(el => {
        const isToRight = elementsToRight.some(rightEl => rightEl.id === el.id);
        if (isToRight) {
          const newX = el.position.x + widthDelta;
          elementOperations.update(el.id, { position: { ...el.position, x: newX } });
          return { ...el, position: { ...el.position, x: newX } };
        }
        return el;
      });

      return result;
    });
  }, []);

  // Handle moving element up - swap order with element above
  const handleMoveUp = (elementId: string) => {
    const sorted = [...elements].sort((a, b) => {
      if (Math.abs(a.position.y - b.position.y) < 5) {
        return a.position.x - b.position.x;
      }
      return a.position.y - b.position.y;
    });

    const currentIndex = sorted.findIndex(el => el.id === elementId);
    if (currentIndex <= 0) return; // Already at top

    // Swap order with element above
    const newOrder = [...sorted];
    const temp = newOrder[currentIndex - 1];
    newOrder[currentIndex - 1] = newOrder[currentIndex];
    newOrder[currentIndex] = temp;

    // Recalculate all Y positions with fixed spacing (X stays at MY_LEFT_MARGIN)
    let cumulativeY = topMargin;
    const repositionedElements = newOrder.map(el => {
      const newPosition = { x: leftMargin, y: cumulativeY };
      cumulativeY += el.size.height + ELEMENT_SPACING;

      if (el.position.x !== newPosition.x || el.position.y !== newPosition.y) {
        elementOperations.update(el.id, { position: newPosition });
      }

      return { ...el, position: newPosition };
    });

    setElements(repositionedElements);
  };

  // Handle moving element alongside the element above (side-by-side)
  const handleMoveAlongsideUp = (elementId: string) => {
    const currentElement = elements.find(el => el.id === elementId);
    if (!currentElement) return;

    // Sort elements by Y position, then by X position for elements on same row
    const sorted = [...elements].sort((a, b) => {
      if (Math.abs(a.position.y - b.position.y) < 5) {
        return a.position.x - b.position.x;
      }
      return a.position.y - b.position.y;
    });

    const currentIndex = sorted.findIndex(el => el.id === elementId);
    if (currentIndex <= 0) return; // No element above

    // Find the rightmost element on the row above
    const elementAbove = sorted[currentIndex - 1];
    const rowY = elementAbove.position.y;

    // Find all elements on that row
    const elementsOnRowAbove = sorted.filter(el =>
      Math.abs(el.position.y - rowY) < 5 && el.id !== elementId
    );

    // Find the rightmost element on that row
    const rightmostOnRow = elementsOnRowAbove.reduce((rightmost, el) => {
      const elRight = el.position.x + getActualElementWidth(el);
      const rightmostRight = rightmost.position.x + getActualElementWidth(rightmost);
      return elRight > rightmostRight ? el : rightmost;
    }, elementsOnRowAbove[0]);

    // Place to the right of the rightmost element on that row
    const rightOfRightmost = rightmostOnRow.position.x + getActualElementWidth(rightmostOnRow) + ELEMENT_SPACING;
    const newPosition = {
      x: rightOfRightmost,
      y: rowY
    };

    // Update the current element position
    elementOperations.update(elementId, { position: newPosition });

    // Update elements and recalculate positions for elements that were below
    const updatedElements = elements.map(el => {
      if (el.id === elementId) {
        return { ...el, position: newPosition };
      }
      return el;
    });

    // Find the max bottom of the row we moved to
    const elementsOnNewRow = updatedElements.filter(el =>
      Math.abs(el.position.y - newPosition.y) < 5
    );
    let maxBottomOfRow = topMargin;
    elementsOnNewRow.forEach(el => {
      const bottom = el.position.y + el.size.height;
      if (bottom > maxBottomOfRow) maxBottomOfRow = bottom;
    });

    // Recalculate Y positions for elements that were below the moved element
    let cumulativeY = maxBottomOfRow + ELEMENT_SPACING;
    const finalElements = updatedElements.map(el => {
      // Skip elements on the new row (including the moved element)
      if (Math.abs(el.position.y - newPosition.y) < 5) return el;

      // Check if this element was below the moved element's original position
      const originalEl = elements.find(orig => orig.id === el.id)!;
      if (originalEl.position.y > currentElement.position.y) {
        const newPos = { x: leftMargin, y: cumulativeY };
        cumulativeY += el.size.height + ELEMENT_SPACING;
        if (el.position.x !== newPos.x || el.position.y !== newPos.y) {
          elementOperations.update(el.id, { position: newPos });
        }
        return { ...el, position: newPos };
      }
      return el;
    });

    setElements(finalElements);
  };

  // Handle moving element alongside the element below (side-by-side)
  const handleMoveAlongsideDown = (elementId: string) => {
    const currentElement = elements.find(el => el.id === elementId);
    if (!currentElement) return;

    // Sort elements by Y position, then by X position for elements on same row
    const sorted = [...elements].sort((a, b) => {
      if (Math.abs(a.position.y - b.position.y) < 5) {
        return a.position.x - b.position.x;
      }
      return a.position.y - b.position.y;
    });

    const currentIndex = sorted.findIndex(el => el.id === elementId);
    if (currentIndex < 0 || currentIndex >= sorted.length - 1) return; // No element below

    // Find the element below (first element on the next row)
    const elementBelow = sorted[currentIndex + 1];
    const rowY = elementBelow.position.y;

    // Find all elements on that row
    const elementsOnRowBelow = sorted.filter(el =>
      Math.abs(el.position.y - rowY) < 5 && el.id !== elementId
    );

    // Find the rightmost element on that row
    const rightmostOnRow = elementsOnRowBelow.reduce((rightmost, el) => {
      const elRight = el.position.x + getActualElementWidth(el);
      const rightmostRight = rightmost.position.x + getActualElementWidth(rightmost);
      return elRight > rightmostRight ? el : rightmost;
    }, elementsOnRowBelow[0]);

    // Place to the right of the rightmost element on that row
    const rightOfRightmost = rightmostOnRow.position.x + getActualElementWidth(rightmostOnRow) + ELEMENT_SPACING;
    const newPosition = {
      x: rightOfRightmost,
      y: rowY
    };

    // Update the current element position
    elementOperations.update(elementId, { position: newPosition });

    // Update elements and recalculate positions for elements that were below the original position
    const updatedElements = elements.map(el => {
      if (el.id === elementId) {
        return { ...el, position: newPosition };
      }
      return el;
    });

    // Find elements that need to move up (were below the current element but not on the target row)
    const elementsToShiftUp = updatedElements
      .filter(el => {
        const originalEl = elements.find(orig => orig.id === el.id)!;
        // Was below the moved element's original position
        const wasBelow = originalEl.position.y > currentElement.position.y;
        // But not on the target row
        const notOnTargetRow = Math.abs(el.position.y - newPosition.y) >= 5;
        return wasBelow && notOnTargetRow && el.id !== elementId;
      })
      .sort((a, b) => a.position.y - b.position.y);

    // The row above the target row becomes the new reference point
    let cumulativeY = currentElement.position.y;
    const finalElements = updatedElements.map(el => {
      if (el.id === elementId) return el; // Already positioned

      // Elements on the target row stay where they are
      if (Math.abs(el.position.y - newPosition.y) < 5) return el;

      // Check if this element needs to shift up
      const originalEl = elements.find(orig => orig.id === el.id)!;
      if (originalEl.position.y > currentElement.position.y && originalEl.position.y < rowY) {
        const newPos = { x: leftMargin, y: cumulativeY };
        cumulativeY += el.size.height + ELEMENT_SPACING;
        if (el.position.x !== newPos.x || el.position.y !== newPos.y) {
          elementOperations.update(el.id, { position: newPos });
        }
        return { ...el, position: newPos };
      }
      return el;
    });

    setElements(finalElements);
  };

  // Handle moving element down - swap with element below
  const handleMoveDown = (elementId: string) => {
    const sorted = [...elements].sort((a, b) => a.position.y - b.position.y);
    const currentIndex = sorted.findIndex(el => el.id === elementId);

    if (currentIndex < 0 || currentIndex >= sorted.length - 1) return; // Already at bottom

    // Swap order with element below
    const newOrder = [...sorted];
    const temp = newOrder[currentIndex + 1];
    newOrder[currentIndex + 1] = newOrder[currentIndex];
    newOrder[currentIndex] = temp;

    // Recalculate all Y positions with fixed spacing (X stays at MY_LEFT_MARGIN)
    let cumulativeY = topMargin;
    const repositionedElements = newOrder.map(el => {
      const newPosition = { x: leftMargin, y: cumulativeY };
      cumulativeY += el.size.height + ELEMENT_SPACING;

      if (el.position.x !== newPosition.x || el.position.y !== newPosition.y) {
        elementOperations.update(el.id, { position: newPosition });
      }

      return { ...el, position: newPosition };
    });

    setElements(repositionedElements);
  };

  // Helper to check if element can move up/down
  const canMoveUp = (elementId: string): boolean => {
    const sorted = [...elements].sort((a, b) => a.position.y - b.position.y);
    const currentIndex = sorted.findIndex(el => el.id === elementId);
    return currentIndex > 0;
  };

  const canMoveDown = (elementId: string): boolean => {
    const sorted = [...elements].sort((a, b) => a.position.y - b.position.y);
    const currentIndex = sorted.findIndex(el => el.id === elementId);
    return currentIndex >= 0 && currentIndex < sorted.length - 1;
  };

  // Handle element repositioning after drag ends - reorder based on drag target position
  const handleElementDragEnd = (draggedElementId: string) => {
    const draggedElement = elements.find(el => el.id === draggedElementId);
    if (!draggedElement) return;

    // Get the drag target Y (where user intended to drop)
    const dragTargetY = (draggedElement as any)._dragTargetY ?? draggedElement.position.y;

    // Remove _dragTargetY from the element
    const cleanedDraggedElement = { ...draggedElement };
    delete (cleanedDraggedElement as any)._dragTargetY;

    const otherElements = elements.filter(el => el.id !== draggedElementId).map(el => {
      const cleaned = { ...el };
      delete (cleaned as any)._dragTargetY;
      return cleaned;
    });

    if (otherElements.length === 0) {
      // Only one element - just ensure it's at the top with proper X position
      const repositioned = {
        ...cleanedDraggedElement,
        position: { x: cleanedDraggedElement.position.x, y: 20 }
      };
      elementOperations.update(repositioned.id, { position: repositioned.position });
      setElements([repositioned]);
      return;
    }

    // Sort other elements by Y position
    const sortedOthers = [...otherElements].sort((a, b) => a.position.y - b.position.y);

    // Find where to insert the dragged element based on drag target Y (center point)
    const draggedCenter = dragTargetY + cleanedDraggedElement.size.height / 2;

    let insertIndex = 0;
    for (let i = 0; i < sortedOthers.length; i++) {
      const el = sortedOthers[i];
      const elCenter = el.position.y + el.size.height / 2;

      if (draggedCenter < elCenter) {
        insertIndex = i;
        break;
      } else {
        insertIndex = i + 1;
      }
    }

    // Build new element order
    const newOrder = [
      ...sortedOthers.slice(0, insertIndex),
      cleanedDraggedElement,
      ...sortedOthers.slice(insertIndex)
    ];

    // Recalculate all Y positions with fixed spacing, preserve X positions
    let cumulativeY = topMargin;
    const repositionedElements = newOrder.map(el => {
      const newPosition = { x: el.position.x, y: cumulativeY };
      cumulativeY += el.size.height + ELEMENT_SPACING;

      // Update in DB if position changed
      if (el.position.y !== newPosition.y) {
        elementOperations.update(el.id, { position: newPosition });
      }

      return { ...el, position: newPosition };
    });

    setElements(repositionedElements);
  };

  const handleInsertExistingElement = async (existingElement: DBWorkspaceElement) => {
    // Create a copy of the existing element with a new ID and position in this workspace
    const position = getNextPosition();
    const newElementId = crypto.randomUUID();

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
        newElementId = crypto.randomUUID();
        const newElement: SystemsTableElement & { workspaceId: string } = {
          id: newElementId,
          workspaceId,
          name: name || undefined,
          type: 'systems-table',
          position,
          size: { width: defaultElementWidth, height: calculatedHeight },
          zIndex: elements.length,
          borderColor: 'transparent',
          borderWidth: 0,
          gridlines: {
            enabled: false,
            color: '#D1D5DB',
            width: 1
          },
          levelWidths: { 0: 80 },
          meaningWidth: defaultElementWidth,
          showName: true,
          initialRows
        };
        await elementOperations.create(newElement);
        setElements([...elements, newElement]);
        break;
      }
      case 'text': {
        newElementId = crypto.randomUUID();
        const newElement: TextElement & { workspaceId: string } = {
          id: newElementId,
          workspaceId,
          name: name || undefined,
          type: 'text',
          position,
          size: { width: defaultElementWidth, height: 34 },
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
        newElementId = crypto.randomUUID();
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
        newElementId = crypto.randomUUID();
        const newElement: PdfElement & { workspaceId: string } = {
          id: newElementId,
          workspaceId,
          name: name || undefined,
          type: 'pdf',
          position,
          size: { width: defaultElementWidth, height: 800 },
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
          const newElementId = crypto.randomUUID();
          const newElement: PdfElement & { workspaceId: string } = {
            id: newElementId,
            workspaceId,
            type: 'pdf',
            position,
            size: { width: defaultElementWidth, height: 800 },
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
        const dbUpdates = { ...updates };
        if (updates.position && !updates.isManuallyPositioned) {
          updated.isManuallyPositioned = true;
          dbUpdates.isManuallyPositioned = true; // Also save to DB
        }

        // If this is the first element (default title element) and content is being updated
        if (index === 0 && 'content' in updated) {
          const textContent = (updated as TextElement).content || '';
          handleTitleChange(textContent);
        }

        // Update in DB (async, don't wait)
        elementOperations.update(id, dbUpdates);

        return updated;
      }
      return el;
    });

    // Don't auto-reposition on height changes - just update the element
    // Repositioning only happens when explicitly dragging elements
    setElements(updatedElements);
  };

  const handleDelete = async (id: string) => {
    const elementToDelete = elements.find(el => el.id === id);
    if (!elementToDelete) return;

    // Filter out the deleted element
    const remainingElements = elements.filter(el => el.id !== id);

    // With fixed spacing model, recalculate all positions to close the gap
    // Preserves side-by-side layout (elements on same row stay together)
    // Use global ROW_THRESHOLD constant
    const rows: WorkspaceElement[][] = [];

    const sortedByY = [...remainingElements].sort((a, b) => a.position.y - b.position.y);

    sortedByY.forEach(el => {
      const lastRow = rows[rows.length - 1];
      if (!lastRow || Math.abs(el.position.y - lastRow[0].position.y) > ROW_THRESHOLD) {
        rows.push([el]);
      } else {
        lastRow.push(el);
      }
    });

    let cumulativeY = topMargin;
    const repositionedElements: WorkspaceElement[] = [];

    rows.forEach(row => {
      const rowY = cumulativeY;
      const maxHeight = Math.max(...row.map(el => el.size.height));

      row.forEach(el => {
        repositionedElements.push({ ...el, position: { ...el.position, y: rowY } });
      });

      cumulativeY = rowY + maxHeight + ELEMENT_SPACING;
    });

    setElements(repositionedElements);
    if (selectedId === id) setSelectedId(null);
    if (formatPanelId === id) setFormatPanelId(null);

    setDeletedElement(elementToDelete);
    tableRowsRef.current.delete(id);

    // Delete from DB (will be restored if undo is triggered)
    await elementOperations.delete(id);

    // Also update positions in DB for remaining elements
    const elementsToUpdate = repositionedElements.filter((el) => {
      const original = sortedByY.find(o => o.id === el.id);
      return original && original.position.y !== el.position.y;
    });
    if (elementsToUpdate.length > 0) {
      await elementOperations.bulkUpdate(elementsToUpdate as any);
    }

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

  // Copy table element
  const handleCopyTable = (elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (element && element.type === 'systems-table') {
      const tableElement = element as SystemsTableElement;
      // Also capture the current rows from tableRowsRef
      const currentRows = tableRowsRef.current.get(elementId);
      const copiedElement = {
        ...tableElement,
        initialRows: currentRows || (tableElement as any).initialRows
      };

      // Store in sessionStorage for cross-instance access
      sessionStorage.setItem('copiedTable', JSON.stringify(copiedElement));

      // Update local state
      setCopiedTable(copiedElement);

      // Dispatch custom event to notify other WorkspaceEditor instances in the same window
      window.dispatchEvent(new Event('copiedTableChanged'));

      console.log('[WorkspaceEditor] Table copied:', element.name || '(unnamed)');
    }
  };

  // Paste copied table as new element
  const handlePasteTable = async () => {
    // Try to get from state first, then fallback to sessionStorage
    let tableToClone = copiedTable;
    if (!tableToClone) {
      const stored = sessionStorage.getItem('copiedTable');
      if (stored) {
        try {
          tableToClone = JSON.parse(stored);
        } catch {
          return;
        }
      }
    }
    if (!tableToClone) return;

    // Find position for new element - use next position below existing elements
    const position = getNextPosition();

    // Create new element with new ID
    const newElement: SystemsTableElement = {
      ...tableToClone,
      id: crypto.randomUUID(),
      workspaceId,
      position,
      zIndex: elements.length,
      name: tableToClone.name ? `${tableToClone.name} (Copy)` : undefined
    };

    // Add to state and save to DB
    setElements(prev => [...prev, newElement]);
    await elementOperations.create(newElement as any);
    console.log('[WorkspaceEditor] Table pasted:', newElement.name || '(unnamed)');
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
    const rowHeight = 34; // Actual rendered height per row (measured from browser)
    const nameHeaderHeight = 34; // Name header row height: padding (6px top + 6px bottom) + minHeight (20px) + borders (~2px)

    let totalHeight = visibleRowCount * rowHeight;
    if (hasVisibleName) {
      totalHeight += nameHeaderHeight;
    }

    return totalHeight;
  };

  // Track original names for elements to detect when name was actually changed
  // Key: elementId, Value: original name when element was first loaded
  const originalNamesRef = useRef<Map<string, string>>(new Map());

  // Track pending name changes with debounce
  const pendingNameChangeRef = useRef<{ elementId: string; newName: string; timeoutId: NodeJS.Timeout } | null>(null);

  // Handle element name change - debounced to only act when user finishes typing
  // Creates a new element when name changes to preserve the original as a saved version
  const handleElementNameChange = async (elementId: string, newName: string, nameHtmlContent?: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    // Initialize original name if not already tracked
    if (!originalNamesRef.current.has(elementId)) {
      originalNamesRef.current.set(elementId, element.name || '');
    }

    // Clear any pending name change for this element
    if (pendingNameChangeRef.current?.elementId === elementId) {
      clearTimeout(pendingNameChangeRef.current.timeoutId);
    }

    // Update local state immediately for responsive UI
    setElements(prev => prev.map(el =>
      el.id === elementId ? { ...el, name: newName } : el
    ));

    // Debounce the actual save/create logic - wait for user to stop typing
    const timeoutId = setTimeout(async () => {
      await commitNameChange(elementId, newName, nameHtmlContent);
      pendingNameChangeRef.current = null;
    }, 1000); // 1 second debounce

    pendingNameChangeRef.current = { elementId, newName, timeoutId };
  };

  // Commit the name change - either update existing element or create new one
  const commitNameChange = async (elementId: string, newName: string, nameHtmlContent?: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const trimmedName = newName.trim();
    const originalName = originalNamesRef.current.get(elementId) || '';

    // If name hasn't actually changed from original, just update the element
    if (trimmedName === originalName.trim()) {
      if (nameHtmlContent !== undefined && element.type === 'systems-table') {
        await elementOperations.update(elementId, { nameHtmlContent } as Partial<DBWorkspaceElement>);
      }
      return;
    }

    // If new name is empty, just update the existing element (remove the name)
    if (!trimmedName) {
      await elementOperations.update(elementId, { name: '' } as Partial<DBWorkspaceElement>);
      originalNamesRef.current.set(elementId, '');
      return;
    }

    // Check if an element with this name already exists
    const allElements = await elementOperations.getAll();
    const existingWithSameName = allElements.find(
      el => el.name?.trim() === trimmedName && el.type === element.type && el.id !== elementId
    );

    if (existingWithSameName) {
      // Name already exists - just update the current element's name
      await elementOperations.update(elementId, {
        name: trimmedName,
        ...(nameHtmlContent !== undefined && element.type === 'systems-table' ? { nameHtmlContent } : {})
      } as Partial<DBWorkspaceElement>);
      originalNamesRef.current.set(elementId, trimmedName);
      return;
    }

    // Name is unique and different from original - create a new element with this name
    // The original element stays in the database as a saved version
    const newElementId = crypto.randomUUID();

    // Get the current rows from the ref (most up-to-date content)
    const currentRows = tableRowsRef.current.get(elementId);

    if (element.type === 'systems-table') {
      const tableEl = element as SystemsTableElement;
      const newElement: SystemsTableElement & { workspaceId: string } = {
        ...tableEl,
        id: newElementId,
        workspaceId,
        name: trimmedName,
        initialRows: currentRows || tableEl.initialRows,
        nameHtmlContent: nameHtmlContent,
        showName: true
      };

      await elementOperations.create(newElement);

      // Replace the old element with the new one in state
      setElements(prev => prev.map(el =>
        el.id === elementId ? newElement : el
      ));

      // Update the rows ref to point to the new element ID
      if (currentRows) {
        tableRowsRef.current.delete(elementId);
        tableRowsRef.current.set(newElementId, currentRows);
      }

      // Track the new element's name as its original
      originalNamesRef.current.delete(elementId);
      originalNamesRef.current.set(newElementId, trimmedName);
    } else if (element.type === 'text') {
      const textEl = element as TextElement;
      const newElement: TextElement & { workspaceId: string } = {
        ...textEl,
        id: newElementId,
        workspaceId,
        name: trimmedName
      };

      await elementOperations.create(newElement);

      // Replace the old element with the new one in state
      setElements(prev => prev.map(el =>
        el.id === elementId ? newElement : el
      ));

      // Track the new element's name as its original
      originalNamesRef.current.delete(elementId);
      originalNamesRef.current.set(newElementId, trimmedName);
    }
  };

  const handleRowsChange = async (elementId: string, rows: RowData[]) => {
    tableRowsRef.current.set(elementId, rows);

    // Use functional setState to avoid stale closure issues - calculate height and update in one atomic operation
    setElements(prevElements => {
      const element = prevElements.find(el => el.id === elementId);
      if (!element || element.type !== 'systems-table') {
        return prevElements; // Element not found or not a table
      }

      const tableEl = element as SystemsTableElement;
      const hasVisibleName = element.name && (tableEl.showName !== false);
      const newHeight = calculateTableHeight(rows, hasVisibleName);
      const width = element.size.width;

      const heightChanged = element.size.height !== newHeight;
      if (!heightChanged) {
        return prevElements; // No height change needed
      }

      // Update element with new rows and calculated height
      const updatedElements = prevElements.map(el =>
        el.id === elementId
          ? { ...el, initialRows: rows, size: { width, height: newHeight } }
          : el
      );

      // Update size in DB
      elementOperations.update(elementId, { size: { width, height: newHeight } });

      // Don't reposition elements during normal editing operations (row changes, expand/collapse, etc.)
      // This prevents disruptive jumping. Repositioning only happens:
      // 1. When elements are explicitly dragged (handleElementDragEnd)
      // 2. When the page is initially loaded
      return updatedElements;
    });

    // Persist rows to database (outside of setState since it's async)
    await elementOperations.update(elementId, { initialRows: rows } as Partial<DBWorkspaceElement>);
  };

  const handleContentSizeChange = (elementId: string, width: number, height: number) => {
    // Use functional setState to always work with latest state and avoid stale closure issues
    setElements(prevElements => {
      const currentElement = prevElements.find(el => el.id === elementId);
      if (!currentElement) {
        return prevElements; // Element not found, don't modify state
      }

      const heightChanged = currentElement.size.height !== height;
      const sizeChanged = currentElement.size.height !== height || currentElement.size.width !== width;

      const updatedElements = prevElements.map(el =>
        el.id === elementId
          ? { ...el, size: { width, height } }
          : el
      );

      // Update size in DB if it changed
      if (sizeChanged) {
        elementOperations.update(elementId, { size: { width, height } });
      }

      // Don't auto-reposition on height changes - just return updated elements
      // Repositioning only happens when explicitly dragging elements
      return updatedElements;
    });
  };

  // Callback for table height changes from ResizeObserver
  // Updates the height AND repositions elements below to maintain consistent spacing
  const handleTableHeightChange = useCallback((elementId: string, height: number) => {
    setElements(prevElements => {
      const element = prevElements.find(el => el.id === elementId);
      if (!element || element.size.height === height) return prevElements;

      const width = element.size.width;
      const elementBottom = element.position.y + height;
      const gap = 20; // Standard gap between elements
      const maxGap = 40; // Maximum allowed gap before pulling up

      // Update the changed element's height in database
      elementOperations.update(elementId, { size: { width, height } });

      // Find elements that are below this element (by y position)
      // and check if they need to be repositioned
      const updatedElements = prevElements.map(el => {
        if (el.id === elementId) {
          return { ...el, size: { width, height } };
        }

        // Only consider elements that are below the changed element
        if (el.position.y <= element.position.y) {
          return el;
        }

        const currentGap = el.position.y - elementBottom;

        // If element overlaps (negative or zero gap) or gap is too small, push down
        if (currentGap < gap) {
          const newY = elementBottom + gap;
          elementOperations.update(el.id, { position: { x: el.position.x, y: newY } });
          return { ...el, position: { x: el.position.x, y: newY } };
        }

        // If gap is too large (element was pushed down and table collapsed), pull up
        if (currentGap > maxGap) {
          const newY = elementBottom + gap;
          elementOperations.update(el.id, { position: { x: el.position.x, y: newY } });
          return { ...el, position: { x: el.position.x, y: newY } };
        }

        return el;
      });

      return updatedElements;
    });
  }, []);

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
      setFocusedWorkspaceName(false);
      setWorkspaceSelected(false);
      setFormatPanelId(null);
    }
  };

  // Handle paste event on the canvas - directly create a SystemsTable with pasted content
  const handleCanvasPaste = async (e: React.ClipboardEvent) => {
    // Don't handle paste if we're in view mode or if focus is on an editable element
    if (isViewMode) return;

    // Check if we're pasting into a contentEditable element (text element, table cell, etc.)
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.getAttribute('contenteditable') === 'true' ||
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA'
    )) {
      // Let the default paste handling occur in the focused element
      return;
    }

    // Try to parse clipboard content as a table (with hierarchy detection)
    const parsedRows = parseClipboardAsTable(e.clipboardData);

    if (parsedRows && parsedRows.length > 0) {
      e.preventDefault();

      // Calculate table height based on total rows (including nested children)
      const countAllRows = (rows: RowData[]): number => {
        let count = 0;
        for (const row of rows) {
          count += 1;
          if (row.children && row.children.length > 0) {
            count += countAllRows(row.children);
          }
        }
        return count;
      };

      const totalRows = countAllRows(parsedRows);
      const tableWidth = defaultElementWidth;
      const rowHeight = 32;
      const headerHeight = 0; // No name header for pasted tables
      const tableHeight = Math.max(100, headerHeight + (totalRows * rowHeight) + 20);

      // Use standard positioning
      const position = getNextPosition();

      const newElementId = crypto.randomUUID();
      const newElement: SystemsTableElement & { workspaceId: string } = {
        id: newElementId,
        workspaceId,
        name: '',
        type: 'systems-table',
        position,
        size: { width: tableWidth, height: tableHeight },
        zIndex: elements.length,
        borderColor: 'transparent',
        borderWidth: 0,
        gridlines: {
          enabled: false,
          color: '#D1D5DB',
          width: 1
        },
        levelWidths: { 0: 120 },
        meaningWidth: tableWidth - 120,
        showName: false,
        initialRows: parsedRows
      };

      // Save to database and update local state
      await elementOperations.create(newElement);
      setElements([...elements, newElement]);

      // Select the newly created table
      setSelectedId(newElementId);

      console.log(`Pasted table with ${totalRows} rows (including nested children)`);
    }
  };

  // NOTE: Auto-repositioning on size changes has been removed to prevent disruptive jumping.
  // Elements are now only repositioned when:
  // 1. Explicitly dragged by the user (handleElementDragEnd)
  // 2. Deleted (handleDelete - to close gaps)
  // Users maintain control over their layout.
  
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const selectedElement = elements.find(el => el.id === formatPanelId);

  return (
    <div
      className={`w-full flex flex-col relative ${isPopup ? 'flex-1' : 'h-full'}`}
      style={isPopup ? { minHeight: 0, overflow: 'hidden' } : undefined}
    >
      {/* Title Bar - Show for Systems or when forceTitleBar is true (e.g., split view) */}
      {!hideControls && (workspace?.isSystem || forceTitleBar) && (
        <div className="bg-white border-b border-gray-200 px-8 py-3 flex-shrink-0 flex items-center gap-3">
          <div
            ref={workspaceNameRef}
            contentEditable={!isViewMode}
            suppressContentEditableWarning
            onFocus={handleWorkspaceNameFocus}
            onBlur={handleWorkspaceNameBlur}
            onInput={handleWorkspaceNameInput}
            onMouseUp={handleWorkspaceNameSelect}
            onKeyUp={handleWorkspaceNameSelect}
            className={`text-lg font-semibold flex-1 min-h-[32px] px-3 py-1 rounded-md border outline-none text-center ${
              isViewMode
                ? 'bg-gray-50 text-gray-700 border-transparent cursor-default'
                : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            } ${!title ? 'empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400' : ''}`}
            style={{
              minWidth: '200px',
              whiteSpace: 'nowrap',
              overflow: 'hidden'
            }}
            data-placeholder="Enter workspace name..."
          />
          {/* X button in title bar */}
          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
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
        className="flex-1 relative bg-white overflow-auto"
        onClick={handleContainerClick}
        onPaste={handleCanvasPaste}
        tabIndex={0}
        style={{
          outline: 'none',
          minHeight: 0,
          // For popups: force height to 0 so flexGrow takes over and constrains properly
          ...(isPopup ? { height: 0, flexGrow: 1 } : {})
        }}
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
            width: `${canvasDimensions.width}px`,
            height: `${canvasDimensions.height}px`,
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
            if (e.target === e.currentTarget && !isViewMode) {
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
                  onSelect: isViewMode ? undefined : () => {
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
                  onUpdate: isViewMode ? undefined : (updates) => handleUpdate(element.id, updates),
                  onDelete: isViewMode ? undefined : () => handleDelete(element.id),
                  onInteractionStart: isViewMode ? undefined : () => setIsInteracting(true),
                  onInteractionEnd: isViewMode ? undefined : () => {
                    setIsInteracting(false);
                    handleElementDragEnd(element.id);
                  }
                }}
                data-table-element
                data-element-id={element.id}
              >
                <TableContainer
                  elementId={element.id}
                  borderWidth={element.borderWidth}
                  borderColor={element.borderColor}
                  onHeightChange={handleTableHeightChange}
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
                    initialNameHtmlContent={tableElement.nameHtmlContent}
                    initialShowName={tableElement.showName ?? true}
                    onRowsChange={(rows) => handleRowsChange(element.id, rows)}
                    onLevelWidthsChange={(levelWidths) => {
                      elementOperations.update(element.id, { levelWidths } as Partial<DBWorkspaceElement>);
                    }}
                    onMeaningWidthChange={(meaningWidth) => {
                      handleTableWidthChange(element.id, meaningWidth);
                    }}
                    onNameChange={(name) => {
                      // Use the new handler that creates a new element when name changes
                      handleElementNameChange(element.id, name);
                    }}
                    onShowNameChange={(showName) => {
                      elementOperations.update(element.id, { showName } as Partial<DBWorkspaceElement>);
                    }}
                    onNameHtmlContentChange={(nameHtmlContent) => {
                      // HTML content changes are saved to current element (formatting doesn't trigger new element)
                      elementOperations.update(element.id, { nameHtmlContent } as Partial<DBWorkspaceElement>);
                    }}
                    onCellFocusChange={(rowId, column, isFocused, applyFormatFn, applyHyperlinkFn, selectedText, removeHyperlinkFn, isHyperlinkSelected) => {
                      if (isFocused) {
                        setFocusedCellId({ tableId: element.id, rowId, column });
                        if (applyFormatFn) {
                          cellApplyFormatRef.current = applyFormatFn;
                        }
                        if (applyHyperlinkFn) {
                          cellApplyHyperlinkRef.current = applyHyperlinkFn;
                        }
                        if (removeHyperlinkFn) {
                          cellRemoveHyperlinkRef.current = removeHyperlinkFn;
                        }
                        setCellIsHyperlinkSelected(isHyperlinkSelected || false);
                        if (selectedText) {
                          setCellSelectedText(selectedText);
                        }
                      } else if (focusedCellId?.tableId === element.id && focusedCellId?.rowId === rowId && focusedCellId?.column === column) {
                        setFocusedCellId(null);
                        cellApplyFormatRef.current = null;
                        cellApplyHyperlinkRef.current = null;
                        cellRemoveHyperlinkRef.current = null;
                        setCellIsHyperlinkSelected(false);
                        setCellSelectedText('');
                      }
                    }}
                    workspaceId={workspaceId}
                    elementId={element.id}
                    isViewMode={isViewMode}
                    isActive={selectedId === element.id || focusedCellId?.tableId === element.id}
                  />
                </TableContainer>
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
                onSelect={isViewMode ? undefined : () => {
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
                    setFocusedTextElementId(null); // Clear edit mode when selecting element
                    setFormatPanelId(element.id); // Show format panel when selected
                    setWorkspaceSelected(false); // Deselect workspace
                  }
                }}
                onUpdate={isViewMode ? undefined : (updates) => handleUpdate(element.id, updates)}
                onDelete={isViewMode ? undefined : () => handleDelete(element.id)}
                existingWorkspaces={existingWorkspaces}
                onNavigateToWorkspace={onNavigateToWorkspace}
                onFocusChange={isViewMode ? undefined : (isFocused, applyFormatFn, applyHyperlinkFn, selectedText, removeHyperlinkFn, isHyperlinkSelected) => {
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
                    if (removeHyperlinkFn) {
                      textElementRemoveHyperlinkRef.current = removeHyperlinkFn;
                    }
                    setTextElementIsHyperlinkSelected(isHyperlinkSelected || false);
                    // Update selected text
                    setTextElementSelectedText(selectedText || '');
                  } else if (focusedTextElementId === element.id) {
                    setFocusedTextElementId(null);
                    textElementApplyFormatRef.current = null;
                    textElementApplyHyperlinkRef.current = null;
                    textElementRemoveHyperlinkRef.current = null;
                    setTextElementIsHyperlinkSelected(false);
                    setTextElementSelectedText('');
                  }
                }}
                readOnly={isViewMode}
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
                  onSelect: isViewMode ? undefined : () => {
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
                  onUpdate: isViewMode ? undefined : (updates) => handleUpdate(element.id, updates),
                  onDelete: isViewMode ? undefined : () => handleDelete(element.id),
                  onInteractionStart: isViewMode ? undefined : () => setIsInteracting(true),
                  onInteractionEnd: isViewMode ? undefined : () => {
                    setIsInteracting(false);
                    handleElementDragEnd(element.id);
                  }
                }}
                data-element-id={element.id}
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
                data-element-id={element.id}
                onSelect={isViewMode ? undefined : () => {
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
                onUpdate={isViewMode ? undefined : (updates) => handleUpdate(element.id, updates)}
                onDelete={isViewMode ? undefined : () => handleDelete(element.id)}
                onInteractionStart={isViewMode ? undefined : () => setIsInteracting(true)}
                onInteractionEnd={isViewMode ? undefined : () => setIsInteracting(false)}
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
                  onSelect: isViewMode ? undefined : () => {
                    setSelectedId(element.id);
                    setWorkspaceSelected(false);
                  },
                  onUpdate: isViewMode ? undefined : (updates) => handleUpdate(element.id, updates),
                  onDelete: isViewMode ? undefined : () => handleDelete(element.id),
                  onInteractionStart: isViewMode ? undefined : () => setIsInteracting(true),
                  onInteractionEnd: isViewMode ? undefined : () => {
                    setIsInteracting(false);
                    handleElementDragEnd(element.id);
                  }
                }}
                data-element-id={element.id}
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
            onCopy={() => {
              if (formatPanelId) {
                handleCopyTable(formatPanelId);
              }
            }}
            onMoveUp={() => {
              if (formatPanelId) {
                handleMoveUp(formatPanelId);
              }
            }}
            onMoveDown={() => {
              if (formatPanelId) {
                handleMoveDown(formatPanelId);
              }
            }}
            onMoveAlongsideUp={() => {
              if (formatPanelId) {
                handleMoveAlongsideUp(formatPanelId);
              }
            }}
            onMoveAlongsideDown={() => {
              if (formatPanelId) {
                handleMoveAlongsideDown(formatPanelId);
              }
            }}
            canMoveUp={formatPanelId ? canMoveUp(formatPanelId) : false}
            canMoveDown={formatPanelId ? canMoveDown(formatPanelId) : false}
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
            onMoveUp={() => {
              if (formatPanelId) {
                handleMoveUp(formatPanelId);
              }
            }}
            onMoveDown={() => {
              if (formatPanelId) {
                handleMoveDown(formatPanelId);
              }
            }}
            onMoveAlongsideUp={() => {
              if (formatPanelId) {
                handleMoveAlongsideUp(formatPanelId);
              }
            }}
            onMoveAlongsideDown={() => {
              if (formatPanelId) {
                handleMoveAlongsideDown(formatPanelId);
              }
            }}
            canMoveUp={formatPanelId ? canMoveUp(formatPanelId) : false}
            canMoveDown={formatPanelId ? canMoveDown(formatPanelId) : false}
          />
        )}

        {/* Format Panel for Text Elements */}
        {selectedElement && selectedElement.type === 'text' && formatPanelId && (
          <TextElementFormatPanel
            element={selectedElement as TextElement}
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
            onMoveUp={() => {
              if (formatPanelId) {
                handleMoveUp(formatPanelId);
              }
            }}
            onMoveDown={() => {
              if (formatPanelId) {
                handleMoveDown(formatPanelId);
              }
            }}
            onMoveAlongsideUp={() => {
              if (formatPanelId) {
                handleMoveAlongsideUp(formatPanelId);
              }
            }}
            onMoveAlongsideDown={() => {
              if (formatPanelId) {
                handleMoveAlongsideDown(formatPanelId);
              }
            }}
            canMoveUp={formatPanelId ? canMoveUp(formatPanelId) : false}
            canMoveDown={formatPanelId ? canMoveDown(formatPanelId) : false}
          />
        )}

        {/* Text Format Panel - Appears on right side when text element is focused */}
        {focusedTextElementId && (
          <div
            className="fixed right-4 top-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-72 max-w-72 max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden"
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
              onRemoveHyperlink={() => {
                if (textElementRemoveHyperlinkRef.current) {
                  textElementRemoveHyperlinkRef.current();
                }
              }}
              isHyperlinkSelected={textElementIsHyperlinkSelected}
              onDuplicateToWorkspace={onDuplicateToWorkspace}
              existingWorkspaces={existingWorkspaces}
              linkedWorkspaces={linkedWorkspaces}
              systemWorkspaces={systemWorkspaces}
              workspaceHierarchy={workspaceHierarchy}
              isSidePanel={true}
              namingPrefix={namingPrefix}
              currentSystemName={currentSystemName}
            />
          </div>
        )}

        {/* Cell Format Panel - Appears on right side when table cell is focused */}
        {focusedCellId && (
          <div
            className="fixed right-4 top-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-72 max-w-72 max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden"
            data-text-format-panel
          >
            <TextFormatPanel
              position={{ x: 0, y: 0 }}
              selectedText={cellSelectedText}
              onClose={() => {
                setFocusedCellId(null);
                cellApplyFormatRef.current = null;
                cellApplyHyperlinkRef.current = null;
                cellRemoveHyperlinkRef.current = null;
                setCellIsHyperlinkSelected(false);
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
              onRemoveHyperlink={() => {
                if (cellRemoveHyperlinkRef.current) {
                  cellRemoveHyperlinkRef.current();
                }
              }}
              isHyperlinkSelected={cellIsHyperlinkSelected}
              onDuplicateToWorkspace={onDuplicateToWorkspace}
              existingWorkspaces={existingWorkspaces}
              linkedWorkspaces={linkedWorkspaces}
              systemWorkspaces={systemWorkspaces}
              workspaceHierarchy={workspaceHierarchy}
              isSidePanel={true}
              namingPrefix={namingPrefix}
              currentSystemName={currentSystemName}
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
      {(!hideControls || isPopup) && (
        <div className={`bg-white border-t border-gray-200 flex-shrink-0 ${isPopup ? 'px-3 py-2' : 'px-8 py-4'}`}>
          <div className={`flex gap-2 ${isPopup ? 'justify-center' : 'justify-between'} items-center`}>
            {/* Insert buttons - only show in edit mode */}
            {!isViewMode && (
              <div className={`flex ${isPopup ? 'gap-2' : 'gap-4'}`}>
                <Button onClick={handleInsertSystemsTable} variant="outline" size={isPopup ? 'sm' : 'default'}>
                  {isPopup ? 'Table' : 'Insert Table'}
                </Button>
                <Button onClick={handleInsertText} variant="outline" size={isPopup ? 'sm' : 'default'}>
                  {isPopup ? 'Text' : 'Insert Text'}
                </Button>
                <Button onClick={handleUploadFile} variant="outline" size={isPopup ? 'sm' : 'default'}>
                  {isPopup ? 'PDF' : 'Upload PDF'}
                </Button>
                {copiedTable && (
                  <Button
                    onClick={handlePasteTable}
                    variant="outline"
                    size={isPopup ? 'sm' : 'default'}
                    className="bg-green-50 border-green-500 text-green-700 hover:bg-green-100"
                  >
                    Paste
                  </Button>
                )}
              </div>
            )}
            {isViewMode && !isPopup && <div />}

            {/* Share and Save/Close - hide in popup mode */}
            {!isPopup && (
              <div className="flex gap-2">
                <Button onClick={() => setShowShareDialog(true)} variant="outline" disabled={!title.trim()}>
                  Share
                </Button>
                {isViewMode && onSwitchToEditMode && (
                  <Button onClick={onSwitchToEditMode} variant="default">
                    Edit
                  </Button>
                )}
              </div>
            )}
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