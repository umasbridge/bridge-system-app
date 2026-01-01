import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Plus, X } from 'lucide-react';
import { WorkspaceEditor } from './WorkspaceEditor';
import { WorkspaceNameDialog } from './WorkspaceNameDialog';
import { BackupConfirmDialog } from './BackupConfirmDialog';
import { workspaceOperations, imageOperations, elementOperations, Workspace as DBWorkspace } from '../../lib/supabase-db';
import { createSystemBackup, buildWorkspaceHierarchy, WorkspaceHierarchyEntry } from '../../lib/backup-operations';
import { getDisplayName, getDisplayHtml } from '../../lib/workspace-utils';

interface Workspace {
  id: string;
  title: string;
  titleHtmlContent?: string;
  isSystem: boolean;
  canvasWidth?: number;
  leftMargin?: number;
  topMargin?: number;
}

// Popup state for supporting multiple stacked popups
interface PopupState {
  workspaceId: string;
  position: { x: number; y: number };
}

// Navigation state for preserving full UI state (including popup) when navigating
interface NavigationState {
  activeWorkspaceId: string;
  popupWorkspaceId: string | null;
  popupPosition: { x: number; y: number } | null;
  splitViewWorkspaceId: string | null;
  // For backwards compatibility, also store popup stack
  popupStack?: PopupState[];
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  openWorkspacePopup: (workspaceName: string, position?: { x: number; y: number }, fromPopup?: boolean) => void;
  openWorkspaceSplitView: (workspaceName: string, position?: { x: number; y: number }, fromPopup?: boolean) => void;
  openWorkspaceNewPage: (workspaceName: string, fromPopup?: boolean) => void;
  currentSystemName: string | null;
  namingPrefix: string;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext must be used within WorkspaceSystem');
  }
  return context;
}

interface CommentBoxProps {
  workspaceName: string;
  position: { x: number; y: number };
  workspace: Workspace;
  onClose: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onReadMore: () => void;
  isViewMode: boolean;
  existingWorkspaces: string[];
  linkedWorkspaces: string[];
  systemWorkspaces: string[];
  workspaceHierarchy?: Map<string, WorkspaceHierarchyEntry>;
  onNavigateToWorkspace: (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page', position?: { x: number; y: number }, fromPopup?: boolean) => void;
  onDuplicateToWorkspace?: (newWorkspaceName: string, sourceWorkspaceName: string, linkType: 'comment' | 'split-view' | 'new-page') => void;
  onWorkspaceUpdate?: (updates: Partial<Workspace>) => void;
  zIndex?: number;
}

function CommentBox({ workspaceName, position, workspace, onClose, onMouseDown, onReadMore, isViewMode, existingWorkspaces, linkedWorkspaces, systemWorkspaces, workspaceHierarchy, onNavigateToWorkspace, onDuplicateToWorkspace, onWorkspaceUpdate, zIndex = 100 }: CommentBoxProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [availableHeight, setAvailableHeight] = useState<number | null>(null);

  // Get parent context and create a popup-specific context that always passes fromPopup: true
  const parentContext = useContext(WorkspaceContext);
  const popupContextValue: WorkspaceContextType | null = parentContext ? {
    ...parentContext,
    openWorkspacePopup: (name: string, pos?: { x: number; y: number }) => {
      parentContext.openWorkspacePopup(name, pos, true);
    },
    openWorkspaceSplitView: (name: string, pos?: { x: number; y: number }) => {
      parentContext.openWorkspaceSplitView(name, pos, true);
    },
    openWorkspaceNewPage: (name: string) => {
      parentContext.openWorkspaceNewPage(name, true);
    }
  } : null;

  // Calculate available height based on position and viewport
  useEffect(() => {
    const calculateHeight = () => {
      const viewportHeight = window.innerHeight;
      const popupTop = position.y + 10; // Same offset used in style
      const bottomPadding = 40; // Match main workspace's bottom padding
      const headerHeight = 40; // Popup header height

      // Available height = viewport height - popup top position - bottom padding
      const maxAvailable = viewportHeight - popupTop - bottomPadding;
      setAvailableHeight(Math.max(200, maxAvailable)); // Minimum 200px
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, [position.y]);

  // Scroll content to top when popup opens or workspace changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [workspace.id]);

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        const hasOverflow = contentRef.current.scrollHeight > contentRef.current.clientHeight;
        setIsOverflowing(hasOverflow);
      }
    };

    checkOverflow();
    const timer = setTimeout(checkOverflow, 500);

    return () => clearTimeout(timer);
  }, [workspace, availableHeight]);

  // A4 dimensions for max size constraints
  const A4_WIDTH = 794;
  const A4_HEIGHT = 1123;
  const MIN_WIDTH = Math.ceil(A4_WIDTH / 2) + 20; // ~417px (content + padding)
  const HEADER_HEIGHT = 44; // Popup header height
  const READ_MORE_HEIGHT = 40; // Read more button height (only when overflow)

  // Use workspace's canvasWidth if set, otherwise fit-content with constraints
  const popupWidth = workspace.canvasWidth ? `${workspace.canvasWidth}px` : 'fit-content';
  const effectiveMaxWidth = workspace.canvasWidth ? workspace.canvasWidth : A4_WIDTH + 20;

  // Use the lesser of A4 height or available viewport height
  const effectiveMaxHeight = availableHeight ? Math.min(A4_HEIGHT + HEADER_HEIGHT, availableHeight) : A4_HEIGHT + HEADER_HEIGHT;
  const contentMaxHeight = availableHeight ? Math.min(A4_HEIGHT, availableHeight - HEADER_HEIGHT) : A4_HEIGHT;

  // Handle mousedown to blur any focused contentEditable elements from other popups
  const handleMouseDown = (e: React.MouseEvent) => {
    // Get the currently focused element
    const activeElement = document.activeElement as HTMLElement;

    // If there's a focused contentEditable element, blur it first
    // This ensures focus can properly transfer to elements in this popup
    if (activeElement && activeElement.isContentEditable) {
      // Check if the active element is NOT within this popup
      const thisPopup = e.currentTarget as HTMLElement;
      if (!thisPopup.contains(activeElement)) {
        activeElement.blur();
      }
    }

    // Call the original onMouseDown handler for drag functionality
    onMouseDown(e);
  };

  // Wrap content in nested context that always passes fromPopup: true
  const content = (
    <div
      className="fixed bg-white rounded-lg shadow-2xl flex flex-col border-2 border-gray-300"
      style={{
        left: `${position.x + 20}px`,
        top: `${position.y + 10}px`,
        minWidth: `${MIN_WIDTH}px`,
        maxWidth: `${effectiveMaxWidth}px`,
        maxHeight: `${effectiveMaxHeight}px`, // Constrained by viewport
        width: popupWidth,
        zIndex
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        data-popup-header
        className="flex items-center justify-center px-3 py-2 border-b border-gray-200 bg-gray-50 cursor-move relative"
      >
        {workspace.titleHtmlContent ? (
          <h2
            className="select-none"
            dangerouslySetInnerHTML={{ __html: getDisplayHtml(workspace.titleHtmlContent, workspace.title) }}
          />
        ) : (
          <h2 className="text-sm font-medium select-none">{getDisplayName(workspaceName)}</h2>
        )}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 absolute right-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content - flex container for proper height propagation */}
      <div
        ref={contentRef}
        className="flex-1 min-h-0 overflow-hidden flex flex-col"
        style={{
          maxHeight: `${contentMaxHeight}px`
        }}
      >
        <WorkspaceEditor
          key={workspace.id}
          workspaceId={workspace.id}
          initialTitle={workspace.title}
          isPopup={true}
          isViewMode={isViewMode}
          existingWorkspaces={existingWorkspaces}
          linkedWorkspaces={linkedWorkspaces}
          systemWorkspaces={systemWorkspaces}
          workspaceHierarchy={workspaceHierarchy}
          onNavigateToWorkspace={(name, type, pos) => onNavigateToWorkspace(name, type, pos, true)}
          onDuplicateToWorkspace={onDuplicateToWorkspace}
          onWorkspaceUpdate={onWorkspaceUpdate}
        />
      </div>

      {/* Read More Button */}
      {isOverflowing && (
        <div className="border-t border-gray-200 px-3 py-2 bg-gray-50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReadMore();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer"
          >
            Read More
          </button>
        </div>
      )}
    </div>
  );

  // Wrap in nested context provider so child components use popup-aware navigation
  return popupContextValue ? (
    <WorkspaceContext.Provider value={popupContextValue}>
      {content}
    </WorkspaceContext.Provider>
  ) : content;
}

export function WorkspaceSystem() {
  const { id: workspaceIdFromUrl } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [splitViewWorkspaceId, setSplitViewWorkspaceId] = useState<string | null>(null);
  // Stack of popups - supports multiple nested popups
  const [popupStack, setPopupStack] = useState<PopupState[]>([]);
  // Legacy single popup state for backwards compatibility
  const [popupWorkspaceId, setPopupWorkspaceId] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggingPopupIndex, setDraggingPopupIndex] = useState<number | null>(null);
  const [showWorkspaceNameDialog, setShowWorkspaceNameDialog] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([]);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  // Workspace hierarchy for hyperlink dialog - shows parent-child relationships
  const [workspaceHierarchy, setWorkspaceHierarchy] = useState<Map<string, WorkspaceHierarchyEntry>>(new Map());

  // Load workspaces from DB and handle URL-based workspace loading
  useEffect(() => {
    const loadWorkspaces = async () => {
      const dbWorkspaces = await workspaceOperations.getAll();
      setWorkspaces(dbWorkspaces);

      // Build workspace hierarchy from hyperlinks
      const hierarchy = await buildWorkspaceHierarchy(dbWorkspaces);
      setWorkspaceHierarchy(hierarchy);

      // Check if there's a workspace ID in the URL
      if (workspaceIdFromUrl) {
        setActiveWorkspaceId(workspaceIdFromUrl);

        // Check if mode is specified in query params
        const mode = searchParams.get('mode');
        setIsViewMode(mode === 'view');
      } else if (dbWorkspaces.length > 0) {
        // Fallback to first workspace if no URL param
        setActiveWorkspaceId(dbWorkspaces[0].id);
      }
      // If no workspaces, user will see "Create Workspace" button
    };
    loadWorkspaces();
  }, [workspaceIdFromUrl, searchParams]);

  // Global mousedown handler to blur contentEditable elements when clicking on a different container
  // This fixes the issue where clicking on a popup doesn't transfer focus from another popup
  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const activeElement = document.activeElement as HTMLElement;

      // If there's no focused contentEditable element, nothing to do
      if (!activeElement || !activeElement.isContentEditable) {
        return;
      }

      // Find the popup container of the click target
      const targetPopup = target.closest('.fixed.bg-white.rounded-lg.shadow-2xl');
      // Find the popup container of the currently focused element
      const activePopup = activeElement.closest('.fixed.bg-white.rounded-lg.shadow-2xl');

      // If clicking on a different popup than where focus is, blur the active element
      if (targetPopup && activePopup && targetPopup !== activePopup) {
        activeElement.blur();
      }

      // Also handle clicking from popup to main workspace or vice versa
      const mainWorkspace = document.querySelector('[data-main-workspace]');
      const targetInMain = mainWorkspace?.contains(target);
      const activeInMain = mainWorkspace?.contains(activeElement);

      if ((targetPopup && activeInMain) || (targetInMain && activePopup)) {
        activeElement.blur();
      }
    };

    // Use capture phase to run before other mousedown handlers
    document.addEventListener('mousedown', handleGlobalMouseDown, true);

    return () => {
      document.removeEventListener('mousedown', handleGlobalMouseDown, true);
    };
  }, []);

  const handleCreateWorkspace = async (title: string) => {
    const existingWorkspace = workspaces.find(ws => ws.title === title);
    if (existingWorkspace) {
      setActiveWorkspaceId(existingWorkspace.id);
      return existingWorkspace.id;
    }

    const newWorkspace = await workspaceOperations.create(title);
    setWorkspaces([...workspaces, newWorkspace]);
    setActiveWorkspaceId(newWorkspace.id);
    setShowWorkspaceNameDialog(false);
    return newWorkspace.id;
  };

  const handleShowWorkspaceDialog = () => {
    // Directly create a workspace with empty name - user must enter name in title bar
    handleCreateWorkspace('');
  };

  const handleNavigateToWorkspace = async (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page', position?: { x: number; y: number }, fromPopup?: boolean) => {
    // Blur all contentEditable elements to hide format panels when navigating via hyperlink
    const contentEditables = document.querySelectorAll('[contenteditable="true"]');
    contentEditables.forEach(el => {
      if (el instanceof HTMLElement) {
        el.blur();
      }
    });
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // First check local state for the workspace
    let targetWorkspace = workspaces.find(ws => ws.title === workspaceName);
    let updatedWorkspaces = workspaces;

    // If not found locally, check the database directly to prevent duplicate creation
    if (!targetWorkspace) {
      const dbWorkspace = await workspaceOperations.getByTitle(workspaceName);
      if (dbWorkspace) {
        // Found in DB but not in local state - add to local state
        targetWorkspace = dbWorkspace;
        updatedWorkspaces = [...workspaces, dbWorkspace];
        setWorkspaces(updatedWorkspaces);
      }
    }

    if (!targetWorkspace) {
      // Workspace truly doesn't exist - create as linked workspace (isSystem: false)
      const newWorkspace = await workspaceOperations.create(workspaceName, false);

      // Set the title with bold and larger font for linked workspaces
      const titleHtmlContent = `<span style="font-weight: 700; font-size: 18px">${workspaceName}</span>`;
      await workspaceOperations.update(newWorkspace.id, { titleHtmlContent });

      // Update local workspace object with the titleHtmlContent
      const updatedWorkspace = { ...newWorkspace, titleHtmlContent };
      updatedWorkspaces = [...workspaces, updatedWorkspace];
      setWorkspaces(updatedWorkspaces);
      targetWorkspace = updatedWorkspace;
    }

    if (linkType === 'comment') {
      // Open as popup comment box using workspace ID
      // Position new popup at a consistent location
      const baseX = position?.x ?? 100;
      const baseY = position?.y ?? 50;

      if (fromPopup) {
        // Clicking from inside a popup - add new popup to stack (offset for visibility)
        // But first check if this workspace is already in the stack
        setPopupStack(prev => {
          const existingIndex = prev.findIndex(p => p.workspaceId === targetWorkspace.id);
          if (existingIndex >= 0) {
            // Already exists - move to top of stack
            const existing = prev[existingIndex];
            const newStack = [...prev.slice(0, existingIndex), ...prev.slice(existingIndex + 1), existing];
            return newStack;
          }
          // Not in stack - add new popup, offset so it's visible
          const newPosition = { x: baseX + (prev.length * 30), y: 50 + (prev.length * 30) };
          return [...prev, { workspaceId: targetWorkspace.id, position: newPosition }];
        });
      } else {
        // Clicking from main workspace - replace entire stack with just the new popup
        const newPosition = { x: baseX, y: 50 };
        setPopupStack([{ workspaceId: targetWorkspace.id, position: newPosition }]);
      }

      // Also update legacy state for backwards compatibility
      setPopupWorkspaceId(targetWorkspace.id);
      setPopupPosition({ x: baseX, y: fromPopup ? baseY + 30 : 50 });
    } else if (linkType === 'split-view') {
      // Open in split view (50/50) next to active workspace
      // Keep popups open if navigating from within a popup
      if (!fromPopup) {
        setPopupStack([]);
        setPopupWorkspaceId(null);
        setPopupPosition(null);
      }
      setSplitViewWorkspaceId(targetWorkspace.id);
    } else {
      // For new-page, navigate to the workspace tab
      // Save the FULL current UI state (including popup if open) before navigating
      if (activeWorkspaceId) {
        setNavigationHistory(prev => [...prev, {
          activeWorkspaceId,
          popupWorkspaceId,
          popupPosition,
          splitViewWorkspaceId,
          popupStack
        }]);
      }
      // Keep popups open if navigating from within a popup
      if (!fromPopup) {
        setPopupStack([]);
        setPopupWorkspaceId(null);
        setPopupPosition(null);
      }
      setActiveWorkspaceId(targetWorkspace.id);
      setSplitViewWorkspaceId(null); // Close split view when switching tabs
    }
  };

  // Handle duplicating an existing workspace to a new workspace name
  // NOTE: This only creates the workspace - navigation happens when user clicks the hyperlink
  const handleDuplicateToWorkspace = async (newWorkspaceName: string, sourceWorkspaceName: string, linkType: 'comment' | 'split-view' | 'new-page') => {
    // Find the source workspace by name
    const sourceWorkspace = workspaces.find(ws => ws.title === sourceWorkspaceName);
    if (!sourceWorkspace) return;

    // Create new workspace with the given name (as linked workspace, not top-level system)
    const newWorkspace = await workspaceOperations.create(newWorkspaceName, false);

    // Set the title with bold and larger font for linked workspaces
    const titleHtmlContent = `<span style="font-weight: 700; font-size: 18px">${newWorkspaceName}</span>`;
    await workspaceOperations.update(newWorkspace.id, { titleHtmlContent });

    // Update local workspace object with the titleHtmlContent
    const updatedNewWorkspace = { ...newWorkspace, titleHtmlContent };

    // Get all elements from the source workspace
    const sourceElements = await elementOperations.getByWorkspaceId(sourceWorkspace.id);

    // Duplicate each element to the new workspace
    // Set isManuallyPositioned to false so elements participate in auto-layout
    for (const element of sourceElements) {
      const newElement = {
        ...element,
        id: crypto.randomUUID(),
        workspaceId: newWorkspace.id,
        isManuallyPositioned: false
      };
      await elementOperations.create(newElement);
    }

    // Update local state with the new workspace (with titleHtmlContent)
    setWorkspaces(prev => [...prev, updatedNewWorkspace]);

    // NOTE: Do NOT navigate here - navigation will happen when user clicks the hyperlink
    // The hyperlink click handler (in RichTextCell) will open the popup/split-view/new-page
  };

  const handlePopupMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if clicking on the header
    if ((e.target as HTMLElement).closest('[data-popup-header]')) {
      setIsDragging(true);
      if (popupPosition) {
        setDragOffset({
          x: e.clientX - popupPosition.x,
          y: e.clientY - popupPosition.y
        });
      }
    }
  };

  const handlePopupMouseMove = (e: MouseEvent) => {
    if (isDragging && draggingPopupIndex !== null) {
      // Update the position of the specific popup being dragged
      setPopupStack(prev => prev.map((popup, index) =>
        index === draggingPopupIndex
          ? { ...popup, position: { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } }
          : popup
      ));
      // Also update legacy state for backwards compatibility
      setPopupPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handlePopupMouseUp = () => {
    setIsDragging(false);
    setDraggingPopupIndex(null);
  };

  const handleReadMore = () => {
    if (popupWorkspaceId) {
      // Save the FULL current UI state (including popup) before navigating
      if (activeWorkspaceId) {
        setNavigationHistory(prev => [...prev, {
          activeWorkspaceId,
          popupWorkspaceId,
          popupPosition,
          splitViewWorkspaceId
        }]);
      }
      setActiveWorkspaceId(popupWorkspaceId);
      setPopupWorkspaceId(null);
      setPopupPosition(null);
    }
  };

  // Handle dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePopupMouseMove);
      window.addEventListener('mouseup', handlePopupMouseUp);
      return () => {
        window.removeEventListener('mousemove', handlePopupMouseMove);
        window.removeEventListener('mouseup', handlePopupMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handleTitleChange = async (workspaceId: string, newTitle: string) => {
    await workspaceOperations.update(workspaceId, { title: newTitle });
    setWorkspaces(workspaces.map(ws =>
      ws.id === workspaceId ? { ...ws, title: newTitle } : ws
    ));
  };

  const handleWorkspaceUpdate = (workspaceId: string, updates: Partial<Workspace>) => {
    setWorkspaces(workspaces.map(ws =>
      ws.id === workspaceId ? { ...ws, ...updates } : ws
    ));
  };

  const handleCloseWorkspace = async (workspaceId: string) => {
    // Check if we have navigation history - if so, go back instead of showing dialog
    if (navigationHistory.length > 0 && activeWorkspaceId === workspaceId) {
      // Pop the last state from history and restore full UI state
      const previousState = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setActiveWorkspaceId(previousState.activeWorkspaceId);
      setPopupWorkspaceId(previousState.popupWorkspaceId);
      setPopupPosition(previousState.popupPosition);
      setSplitViewWorkspaceId(previousState.splitViewWorkspaceId);
      return;
    }

    // Check if this is a system workspace - if so, show backup dialog
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (workspace?.isSystem) {
      setShowBackupDialog(true);
      return;
    }

    // Non-system workspace - navigate back (to returnTo or dashboard)
    sessionStorage.removeItem('copiedTable');
    const returnTo = searchParams.get('returnTo');
    navigate(returnTo || '/dashboard');
  };

  const handleBackupAndClose = () => {
    // Close dialog first
    setShowBackupDialog(false);

    // Create backup in background
    if (activeWorkspaceId) {
      const activeWs = workspaces.find(ws => ws.id === activeWorkspaceId);
      if (activeWs?.isSystem) {
        workspaceOperations.getById(activeWorkspaceId).then(fullWorkspace => {
          if (fullWorkspace && !fullWorkspace.backupOf && !fullWorkspace.backupGroupId) {
            createSystemBackup(activeWorkspaceId).then(result => {
              if (!result.success) {
                console.error('Backup creation failed:', result.error);
              }
            });
          }
        });
      }
    }

    // Navigate back (to returnTo or dashboard)
    sessionStorage.removeItem('copiedTable');
    const returnTo = searchParams.get('returnTo');
    navigate(returnTo || '/dashboard');
  };

  const handleCloseWithoutBackup = () => {
    // Close dialog and navigate back (to returnTo or dashboard) without backup
    setShowBackupDialog(false);
    sessionStorage.removeItem('copiedTable');
    const returnTo = searchParams.get('returnTo');
    navigate(returnTo || '/dashboard');
  };

  const handleSwitchToEditMode = () => {
    setIsViewMode(false);
    // Update URL to reflect edit mode
    searchParams.set('mode', 'edit');
    setSearchParams(searchParams);
  };

  const activeWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId);
  const splitViewWorkspace = workspaces.find(ws => ws.id === splitViewWorkspaceId);
  const popupWorkspace = workspaces.find(ws => ws.id === popupWorkspaceId);

  // Compute current system name and naming prefix
  // If active workspace is a system, use its name directly
  // If it's a linked workspace, extract the system prefix from its name
  const getCurrentSystemName = (): string | null => {
    if (!activeWorkspace?.title) return null;

    if (activeWorkspace.isSystem) {
      return activeWorkspace.title;
    }

    // For linked workspaces, the system name is the first part before underscore
    // e.g., "MySystem_Openings" -> "MySystem"
    const parts = activeWorkspace.title.split('_');
    if (parts.length >= 2) {
      return parts[0];
    }

    // Fallback: try to find parent system by checking which system this workspace belongs to
    // by looking at the navigation history or matching prefix
    const possibleSystemNames = workspaces
      .filter(ws => ws.isSystem && ws.title)
      .map(ws => ws.title);

    for (const sysName of possibleSystemNames) {
      if (activeWorkspace.title.startsWith(sysName + '_')) {
        return sysName;
      }
    }

    return null;
  };

  const currentSystemName = getCurrentSystemName();

  // Naming prefix is the current workspace title + underscore
  // This creates a hierarchy like: System_Chapter_SubChapter_
  const namingPrefix = activeWorkspace?.title ? activeWorkspace.title + '_' : '';

  // Build list of all workspaces that should stay mounted (to preserve their state)
  // This includes the active workspace plus all workspaces in the navigation history
  const mountedWorkspaceIds = new Set<string>();
  if (activeWorkspaceId) mountedWorkspaceIds.add(activeWorkspaceId);
  navigationHistory.forEach(state => {
    mountedWorkspaceIds.add(state.activeWorkspaceId);
  });
  const mountedWorkspaces = workspaces.filter(ws => mountedWorkspaceIds.has(ws.id));

  const contextValue: WorkspaceContextType = {
    workspaces,
    openWorkspacePopup: (workspaceName: string, position?: { x: number; y: number }, fromPopup?: boolean) => {
      handleNavigateToWorkspace(workspaceName, 'comment', position, fromPopup);
    },
    openWorkspaceSplitView: (workspaceName: string, position?: { x: number; y: number }, fromPopup?: boolean) => {
      handleNavigateToWorkspace(workspaceName, 'split-view', position, fromPopup);
    },
    openWorkspaceNewPage: (workspaceName: string, fromPopup?: boolean) => {
      handleNavigateToWorkspace(workspaceName, 'new-page', undefined, fromPopup);
    },
    currentSystemName,
    namingPrefix
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      <div className="w-full h-screen flex flex-col">
      {/* Top Navigation Bar - Hidden per user request */}
      {/* Workspace Content Area */}
      <div className="flex-1 overflow-hidden bg-gray-100 flex items-stretch justify-center px-8 pb-8 pt-1">
        {mountedWorkspaces.length > 0 ? (
          <>
            {/* Render ALL workspaces in navigation stack - keep them mounted to preserve state */}
            {/* Only show the active one, hide others with CSS */}
            {mountedWorkspaces.map(workspace => {
              const isActive = workspace.id === activeWorkspaceId;
              return (
                <div
                  key={workspace.id}
                  className={splitViewWorkspaceId && isActive ? "flex w-full max-w-[1600px] h-full" : "w-full max-w-[800px] h-full"}
                  style={{ display: isActive ? undefined : 'none' }}
                >
                  {/* Main Workspace - A4 Page Layout with fixed header/footer */}
                  <div className={splitViewWorkspaceId && isActive ? "w-1/2 pr-4 h-full" : "w-full h-full"}>
                    <div data-main-workspace className="bg-white border-2 border-gray-300 rounded-sm shadow-lg flex flex-col h-full overflow-hidden" style={{ width: `${workspace.canvasWidth || 794}px`, maxHeight: '100%' }}>
                      {/* Main Workspace Header - shows workspace title for linked workspaces (non-systems) */}
                      {!workspace.isSystem && (
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                          {workspace.titleHtmlContent ? (
                            <h2
                              className="select-none"
                              dangerouslySetInnerHTML={{ __html: getDisplayHtml(workspace.titleHtmlContent, workspace.title) }}
                            />
                          ) : (
                            <h2 className="text-sm font-medium select-none">{getDisplayName(workspace.title)}</h2>
                          )}
                          <button
                            onClick={() => handleCloseWorkspace(workspace.id)}
                            className="p-1 border border-gray-300 rounded hover:bg-gray-100 hover:border-gray-400 transition-colors"
                            title="Close workspace"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      <WorkspaceEditor
                        workspaceId={workspace.id}
                        initialTitle={workspace.title}
                        onTitleChange={(newTitle) => handleTitleChange(workspace.id, newTitle)}
                        onClose={() => handleCloseWorkspace(workspace.id)}
                        existingWorkspaces={workspaces.map(ws => ws.title)}
                        linkedWorkspaces={workspaces.filter(ws => !ws.isSystem && !ws.title.includes('[Backup') && !ws.title.includes('Backup')).map(ws => ws.title)}
                        systemWorkspaces={workspaces.filter(ws => ws.isSystem && ws.title.trim() && !ws.title.includes('[Backup') && !ws.title.includes('Backup')).map(ws => ws.title)}
                        workspaceHierarchy={workspaceHierarchy}
                        onNavigateToWorkspace={handleNavigateToWorkspace}
                        onDuplicateToWorkspace={handleDuplicateToWorkspace}
                        isViewMode={isViewMode}
                        onSwitchToEditMode={handleSwitchToEditMode}
                        onWorkspaceUpdate={(updates) => handleWorkspaceUpdate(workspace.id, updates)}
                      />
                    </div>
                  </div>

                  {/* Split View Workspace - 50/50 Layout (only for active workspace) */}
                  {/* Split view should look exactly like the main workspace - with centered editable title and all controls */}
                  {isActive && splitViewWorkspaceId && splitViewWorkspace && (
                    <div className="w-1/2 pl-4 h-full">
                      <div className="bg-white border-2 border-gray-300 rounded-sm shadow-lg relative flex flex-col h-full overflow-hidden" style={{ width: `${splitViewWorkspace.canvasWidth || 794}px`, maxWidth: '100%', maxHeight: '100%' }}>
                      <WorkspaceEditor
                        workspaceId={splitViewWorkspace.id}
                        initialTitle={splitViewWorkspace.title}
                        onTitleChange={(newTitle) => handleTitleChange(splitViewWorkspace.id, newTitle)}
                        onClose={() => setSplitViewWorkspaceId(null)}
                        existingWorkspaces={workspaces.map(ws => ws.title)}
                        linkedWorkspaces={workspaces.filter(ws => !ws.isSystem && !ws.title.includes('[Backup') && !ws.title.includes('Backup')).map(ws => ws.title)}
                        systemWorkspaces={workspaces.filter(ws => ws.isSystem && ws.title.trim() && !ws.title.includes('[Backup') && !ws.title.includes('Backup')).map(ws => ws.title)}
                        workspaceHierarchy={workspaceHierarchy}
                        onNavigateToWorkspace={handleNavigateToWorkspace}
                        onDuplicateToWorkspace={handleDuplicateToWorkspace}
                        onWorkspaceUpdate={(updates) => handleWorkspaceUpdate(splitViewWorkspace.id, updates)}
                        isViewMode={isViewMode}
                        forceTitleBar={true}
                      />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : workspaceIdFromUrl ? (
          // Show loading state when we have a workspace ID from URL but workspaces haven't loaded yet
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 mb-4">Loading workspace...</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No workspace open</p>
              <Button onClick={handleShowWorkspaceDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Create New System
              </Button>
            </div>
          </div>
        )}

        {/* Popup Workspaces - Render all popups in the stack */}
        {popupStack.map((popup, index) => {
          const popupWs = workspaces.find(ws => ws.id === popup.workspaceId);
          if (!popupWs) return null;
          return (
            <CommentBox
              key={`popup-${popup.workspaceId}-${index}`}
              workspaceName={popupWs.title}
              position={popup.position}
              workspace={popupWs}
              onClose={() => {
                // Remove this popup from the stack
                setPopupStack(prev => prev.filter((_, i) => i !== index));
                // Update legacy state
                if (popupStack.length <= 1) {
                  setPopupWorkspaceId(null);
                  setPopupPosition(null);
                }
              }}
              onMouseDown={(e: React.MouseEvent) => {
                // Handle dragging for this specific popup
                if ((e.target as HTMLElement).closest('[data-popup-header]')) {
                  setIsDragging(true);
                  setDraggingPopupIndex(index);
                  setDragOffset({
                    x: e.clientX - popup.position.x,
                    y: e.clientY - popup.position.y
                  });
                }
              }}
              onReadMore={() => {
                // Navigate to the workspace in main view
                if (activeWorkspaceId) {
                  setNavigationHistory(prev => [...prev, {
                    activeWorkspaceId,
                    popupWorkspaceId,
                    popupPosition,
                    splitViewWorkspaceId,
                    popupStack
                  }]);
                }
                setActiveWorkspaceId(popup.workspaceId);
                // Remove this popup from stack when opening in main view
                setPopupStack(prev => prev.filter((_, i) => i !== index));
              }}
              isViewMode={isViewMode}
              existingWorkspaces={workspaces.map(ws => ws.title)}
              linkedWorkspaces={workspaces.filter(ws => !ws.isSystem && !ws.title.includes('[Backup') && !ws.title.includes('Backup')).map(ws => ws.title)}
              systemWorkspaces={workspaces.filter(ws => ws.isSystem && ws.title.trim() && !ws.title.includes('[Backup') && !ws.title.includes('Backup')).map(ws => ws.title)}
              workspaceHierarchy={workspaceHierarchy}
              onNavigateToWorkspace={handleNavigateToWorkspace}
              onDuplicateToWorkspace={handleDuplicateToWorkspace}
              onWorkspaceUpdate={(updates) => handleWorkspaceUpdate(popup.workspaceId, updates)}
              zIndex={100 + index * 10}
            />
          );
        })}

        {/* Workspace Name Dialog */}
        {showWorkspaceNameDialog && (
          <WorkspaceNameDialog
            onConfirm={handleCreateWorkspace}
            onCancel={() => setShowWorkspaceNameDialog(false)}
          />
        )}

        {/* Backup Confirmation Dialog */}
        {showBackupDialog && activeWorkspaceId && activeWorkspace && (
          <BackupConfirmDialog
            workspaceId={activeWorkspaceId}
            workspaceName={activeWorkspace.title}
            onBackupAndClose={handleBackupAndClose}
            onCloseWithoutBackup={handleCloseWithoutBackup}
            onCancel={() => setShowBackupDialog(false)}
          />
        )}
      </div>
    </div>
    </WorkspaceContext.Provider>
  );
}