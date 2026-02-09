import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Plus, X } from 'lucide-react';
import { WorkspaceNameDialog } from './WorkspaceNameDialog';
import { BackupConfirmDialog } from './BackupConfirmDialog';
import { ShareDialog } from './ShareDialog';
import { workspaceOperations, elementOperations, Workspace as DBWorkspace, WorkspaceElement } from '../../lib/supabase-db';
import { createSystemBackup, buildWorkspaceHierarchy, WorkspaceHierarchyEntry } from '../../lib/backup-operations';
import { getDisplayName, getDisplayHtml } from '../../lib/workspace-utils';

// V2 components
import { Page } from '../page-v2';
import { PopupView } from '../navigation';
import type {
  Page as PageType,
  Element as V2Element,
  TextElement as V2TextElement,
  BidTableElement as V2BidTableElement,
  HyperlinkTarget,
  RowData as V2RowData,
} from '@/types';

// V2 adapter
import {
  workspaceToPage,
  v2ElementToV1Update,
  v2PageToV1WorkspaceUpdate,
  convertRowsV2toV1,
  getAvailablePages,
} from '../../lib/v2-adapter';

type WorkspaceType = 'bidding_system' | 'bidding_convention' | 'user_defined';

interface Workspace {
  id: string;
  title: string;
  titleHtmlContent?: string;
  type: WorkspaceType;
  canvasWidth?: number;
  leftMargin?: number;
  topMargin?: number;
  descriptionHtml?: string;
}

// Popup state for supporting multiple stacked popups
interface PopupState {
  workspaceId: string;
  position: { x: number; y: number };
}

// Source of a hyperlink click — determines chain truncation behavior
type LinkSource =
  | { type: 'main' }
  | { type: 'split'; index: number }
  | { type: 'popup'; index: number };

// Navigation state for preserving full UI state (including popup) when navigating
interface NavigationState {
  activeWorkspaceId: string;
  popupWorkspaceId: string | null;
  popupPosition: { x: number; y: number } | null;
  splitViewChain: string[];
  popupStack: PopupState[];
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  openWorkspacePopup: (workspaceName: string, position?: { x: number; y: number }) => void;
  openWorkspaceSplitView: (workspaceName: string, position?: { x: number; y: number }) => void;
  openWorkspaceNewPage: (workspaceName: string) => void;
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

export function WorkspaceSystem() {
  const { id: workspaceIdFromUrl } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [splitViewChain, setSplitViewChain] = useState<string[]>([]);
  const [popupStack, setPopupStack] = useState<PopupState[]>([]);
  const [popupWorkspaceId, setPopupWorkspaceId] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggingPopupIndex, setDraggingPopupIndex] = useState<number | null>(null);
  const [showWorkspaceNameDialog, setShowWorkspaceNameDialog] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([]);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [workspaceHierarchy, setWorkspaceHierarchy] = useState<Map<string, WorkspaceHierarchyEntry>>(new Map());

  // V2 page state: converted pages keyed by workspace ID
  const [pages, setPages] = useState<Map<string, PageType>>(new Map());
  // Track which workspace elements we've loaded
  const [loadedWorkspaceIds, setLoadedWorkspaceIds] = useState<Set<string>>(new Set());

  // Load workspaces from DB and handle URL-based workspace loading
  useEffect(() => {
    const loadWorkspaces = async () => {
      const dbWorkspaces = await workspaceOperations.getAll();
      setWorkspaces(dbWorkspaces);

      const hierarchy = await buildWorkspaceHierarchy(dbWorkspaces);
      setWorkspaceHierarchy(hierarchy);

      if (workspaceIdFromUrl) {
        setActiveWorkspaceId(workspaceIdFromUrl);
        const mode = searchParams.get('mode');
        setIsViewMode(mode === 'view');
      } else if (dbWorkspaces.length > 0) {
        setActiveWorkspaceId(dbWorkspaces[0].id);
      }
    };
    loadWorkspaces();
  }, [workspaceIdFromUrl, searchParams]);

  // Load elements for a workspace and convert to V2 Page format
  const loadWorkspacePage = useCallback(async (workspaceId: string) => {
    if (loadedWorkspaceIds.has(workspaceId)) return;

    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (!workspace) return;

    const elements = await elementOperations.getByWorkspaceId(workspaceId);
    const isMain = workspace.type === 'bidding_system';
    const page = workspaceToPage(workspace as any, elements, workspaces as any, isMain);

    setPages(prev => new Map(prev).set(workspaceId, page));
    setLoadedWorkspaceIds(prev => new Set(prev).add(workspaceId));
  }, [workspaces, loadedWorkspaceIds]);

  // Load pages for active, split, and popup workspaces
  useEffect(() => {
    if (activeWorkspaceId && workspaces.length > 0) {
      loadWorkspacePage(activeWorkspaceId);
    }
  }, [activeWorkspaceId, workspaces, loadWorkspacePage]);

  useEffect(() => {
    splitViewChain.forEach(id => {
      if (workspaces.length > 0) {
        loadWorkspacePage(id);
      }
    });
  }, [splitViewChain, workspaces, loadWorkspacePage]);

  useEffect(() => {
    popupStack.forEach(popup => {
      if (workspaces.length > 0) {
        loadWorkspacePage(popup.workspaceId);
      }
    });
  }, [popupStack, workspaces, loadWorkspacePage]);

  // Global mousedown handler to blur contentEditable elements when clicking on a different container
  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const activeElement = document.activeElement as HTMLElement;
      if (!activeElement || !activeElement.isContentEditable) return;

      const targetPopup = target.closest('.fixed.bg-white.rounded-lg.shadow-2xl');
      const activePopup = activeElement.closest('.fixed.bg-white.rounded-lg.shadow-2xl');

      if (targetPopup && activePopup && targetPopup !== activePopup) {
        activeElement.blur();
      }

      const mainWorkspace = document.querySelector('[data-main-workspace]');
      const targetInMain = mainWorkspace?.contains(target);
      const activeInMain = mainWorkspace?.contains(activeElement);

      if ((targetPopup && activeInMain) || (targetInMain && activePopup)) {
        activeElement.blur();
      }
    };

    document.addEventListener('mousedown', handleGlobalMouseDown, true);
    return () => document.removeEventListener('mousedown', handleGlobalMouseDown, true);
  }, []);

  // =====================
  // V2 PAGE CALLBACKS - Wire to Supabase
  // =====================

  const handlePageChange = useCallback(async (workspaceId: string, updates: Partial<PageType>) => {
    // Update local page state
    setPages(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(workspaceId);
      if (existing) {
        newMap.set(workspaceId, { ...existing, ...updates });
      }
      return newMap;
    });

    // Save to Supabase
    const v1Updates = v2PageToV1WorkspaceUpdate(updates, workspaces as any);
    if (Object.keys(v1Updates).length > 0) {
      await workspaceOperations.update(workspaceId, v1Updates as any);
      // Update local workspace state too
      if (v1Updates.title !== undefined || v1Updates.titleHtmlContent !== undefined) {
        setWorkspaces(prev => prev.map(ws =>
          ws.id === workspaceId ? { ...ws, ...v1Updates } : ws
        ));
      }
    }
  }, [workspaces]);

  const handleElementChange = useCallback(async (workspaceId: string, elementId: string, updates: Partial<V2Element>) => {
    // Update local page state
    setPages(prev => {
      const newMap = new Map(prev);
      const page = newMap.get(workspaceId);
      if (page) {
        newMap.set(workspaceId, {
          ...page,
          elements: page.elements.map(el =>
            el.id === elementId ? { ...el, ...updates } : el
          ),
        });
      }
      return newMap;
    });

    // Convert and save to Supabase
    const v1Updates = v2ElementToV1Update(updates, workspaces as any);
    if (Object.keys(v1Updates).length > 0) {
      await elementOperations.update(elementId, v1Updates as any);
    }
  }, [workspaces]);

  const handleAddElement = useCallback(async (workspaceId: string, type: 'text' | 'bidtable') => {
    const page = pages.get(workspaceId);
    const maxOrder = page ? Math.max(0, ...page.elements.map(el => el.order)) : 0;
    const maxY = (maxOrder + 1) * 100; // Approximate y position

    if (type === 'text') {
      const newElement: WorkspaceElement = {
        id: crypto.randomUUID(),
        workspaceId,
        type: 'text',
        position: { x: 0, y: maxY },
        size: { width: 400, height: 100 },
        zIndex: maxOrder + 1,
        content: '',
        htmlContent: '<p></p>',
      } as any;
      await elementOperations.create(newElement);

      // Add to local V2 page state
      const v2El: V2TextElement = {
        id: newElement.id,
        type: 'text',
        order: maxOrder + 1,
        mode: 'default',
        content: '',
        htmlContent: '<p></p>',
        borderColor: '#d1d5db',
        borderWidth: 2,
        fillColor: 'transparent',
      };
      setPages(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(workspaceId);
        if (existing) {
          newMap.set(workspaceId, { ...existing, elements: [...existing.elements, v2El] });
        }
        return newMap;
      });
    } else {
      const newElement: WorkspaceElement = {
        id: crypto.randomUUID(),
        workspaceId,
        type: 'systems-table',
        position: { x: 0, y: maxY },
        size: { width: 400, height: 100 },
        zIndex: maxOrder + 1,
        initialRows: [{ id: `r-${Date.now()}`, bid: '', meaning: '', children: [] }],
        levelWidths: { 0: 80 },
        meaningWidth: 400,
        showName: true,
      } as any;
      await elementOperations.create(newElement);

      const v2El: V2BidTableElement = {
        id: newElement.id,
        type: 'bidtable',
        order: maxOrder + 1,
        name: 'New Table',
        showName: true,
        rows: [{ id: `r-${Date.now()}`, bid: '', meaning: '', children: [] }],
        levelWidths: { 0: 80 },
        width: 400,
      };
      setPages(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(workspaceId);
        if (existing) {
          newMap.set(workspaceId, { ...existing, elements: [...existing.elements, v2El] });
        }
        return newMap;
      });
    }
  }, [pages]);

  const handleDeleteElement = useCallback(async (workspaceId: string, elementId: string) => {
    await elementOperations.delete(elementId);

    setPages(prev => {
      const newMap = new Map(prev);
      const page = newMap.get(workspaceId);
      if (page) {
        newMap.set(workspaceId, {
          ...page,
          elements: page.elements.filter(el => el.id !== elementId),
        });
      }
      return newMap;
    });
  }, []);

  const handleMoveElement = useCallback((workspaceId: string, elementId: string, direction: 'up' | 'down') => {
    setPages(prev => {
      const newMap = new Map(prev);
      const page = newMap.get(workspaceId);
      if (!page) return prev;

      const sorted = [...page.elements].sort((a, b) => a.order - b.order);
      const currentIndex = sorted.findIndex(el => el.id === elementId);
      if (currentIndex === -1) return prev;
      if (direction === 'up' && currentIndex === 0) return prev;
      if (direction === 'down' && currentIndex === sorted.length - 1) return prev;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      const currentOrder = sorted[currentIndex].order;
      const targetOrder = sorted[targetIndex].order;

      newMap.set(workspaceId, {
        ...page,
        elements: page.elements.map(el => {
          if (el.id === elementId) return { ...el, order: targetOrder };
          if (el.id === sorted[targetIndex].id) return { ...el, order: currentOrder };
          return el;
        }),
      });
      return newMap;
    });
  }, []);

  const handlePasteTable = useCallback(async (workspaceId: string, rows: V2RowData[], name: string, options?: { width?: number; levelWidths?: Record<number, number>; gridlines?: any; defaultRowHeight?: number }) => {
    const page = pages.get(workspaceId);
    const maxOrder = page ? Math.max(0, ...page.elements.map(el => el.order)) : 0;
    const maxY = (maxOrder + 1) * 100;

    const pastedLevelWidths = options?.levelWidths || { 0: 80 };
    const pastedWidth = options?.width || 400;

    const v1Rows = convertRowsV2toV1(rows);
    const newElement: WorkspaceElement = {
      id: crypto.randomUUID(),
      workspaceId,
      type: 'systems-table',
      position: { x: 0, y: maxY },
      size: { width: 400, height: 100 },
      zIndex: maxOrder + 1,
      initialRows: v1Rows as any,
      levelWidths: pastedLevelWidths,
      meaningWidth: pastedWidth,
      showName: true,
      name: `${name} (copy)`,
      gridlines: options?.gridlines,
      defaultRowHeight: options?.defaultRowHeight,
    } as any;
    await elementOperations.create(newElement);

    const v2El: V2BidTableElement = {
      id: newElement.id,
      type: 'bidtable',
      order: maxOrder + 1,
      name: `${name} (copy)`,
      showName: true,
      rows: JSON.parse(JSON.stringify(rows)),
      levelWidths: pastedLevelWidths,
      width: pastedWidth,
      gridlines: options?.gridlines,
      defaultRowHeight: options?.defaultRowHeight,
    };
    setPages(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(workspaceId);
      if (existing) {
        newMap.set(workspaceId, { ...existing, elements: [...existing.elements, v2El] });
      }
      return newMap;
    });
  }, [pages]);

  // =====================
  // HYPERLINK CLICK HANDLER
  // =====================

  const handleHyperlinkClick = useCallback((target: HyperlinkTarget, source?: LinkSource) => {
    // Map V2 hyperlink mode to V1 link type
    const linkTypeMap: Record<string, 'comment' | 'split-view' | 'new-page'> = {
      popup: 'comment',
      split: 'split-view',
      newpage: 'new-page',
    };
    const linkType = linkTypeMap[target.mode] || 'split-view';

    // V2 uses page IDs, but V1 navigation works by workspace title
    // Try to find the workspace by ID first, then by name
    const workspace = workspaces.find(ws => ws.id === target.pageId);
    const workspaceName = workspace?.title || target.pageName;

    handleNavigateToWorkspace(workspaceName, linkType, target.position, source);
  }, [workspaces]);

  // =====================
  // EXISTING BUSINESS LOGIC (kept from V1)
  // =====================

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
    handleCreateWorkspace('');
  };

  const handleNavigateToWorkspace = async (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page', position?: { x: number; y: number }, source?: LinkSource) => {
    // Blur all contentEditable elements
    const contentEditables = document.querySelectorAll('[contenteditable="true"]');
    contentEditables.forEach(el => {
      if (el instanceof HTMLElement) el.blur();
    });
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    let targetWorkspace = workspaces.find(ws => ws.title === workspaceName);
    let updatedWorkspaces = workspaces;

    if (!targetWorkspace) {
      const dbWorkspace = await workspaceOperations.getByTitle(workspaceName);
      if (dbWorkspace) {
        targetWorkspace = dbWorkspace;
        updatedWorkspaces = [...workspaces, dbWorkspace];
        setWorkspaces(updatedWorkspaces);
      }
    }

    if (!targetWorkspace) {
      const newWorkspace = await workspaceOperations.create(workspaceName, 'user_defined');
      const titleHtmlContent = `<span style="font-weight: 700; font-size: 18px">${workspaceName}</span>`;
      await workspaceOperations.update(newWorkspace.id, { titleHtmlContent });
      const updatedWorkspace = { ...newWorkspace, titleHtmlContent };
      updatedWorkspaces = [...workspaces, updatedWorkspace];
      setWorkspaces(updatedWorkspaces);
      targetWorkspace = updatedWorkspace;
    }

    if (linkType === 'comment') {
      const baseX = position?.x ?? 100;
      const baseY = position?.y ?? 50;
      const newPopup: PopupState = { workspaceId: targetWorkspace.id, position: { x: baseX, y: baseY } };

      if (source?.type === 'popup') {
        // From popup[i]: keep parent chain up to i, add new child
        setPopupStack(prev => [...prev.slice(0, source.index + 1), newPopup]);
      } else {
        // From main/split: replace all popups with single new one
        setPopupStack([newPopup]);
      }

      setPopupWorkspaceId(targetWorkspace.id);
      setPopupPosition({ x: baseX, y: baseY });
    } else if (linkType === 'split-view') {
      // Close popups when opening split from non-popup source
      if (source?.type !== 'popup') {
        setPopupStack([]);
        setPopupWorkspaceId(null);
        setPopupPosition(null);
      } else {
        // From popup: close all popups, then open split
        setPopupStack([]);
        setPopupWorkspaceId(null);
        setPopupPosition(null);
      }

      if (source?.type === 'split') {
        // From split[i]: keep parent chain up to i, add new child
        setSplitViewChain(prev => [...prev.slice(0, source.index + 1), targetWorkspace.id]);
      } else {
        // From main or popup: replace entire split chain
        setSplitViewChain([targetWorkspace.id]);
      }
    } else {
      if (activeWorkspaceId) {
        setNavigationHistory(prev => [...prev, {
          activeWorkspaceId,
          popupWorkspaceId,
          popupPosition,
          splitViewChain,
          popupStack
        }]);
      }
      setPopupStack([]);
      setPopupWorkspaceId(null);
      setPopupPosition(null);
      setActiveWorkspaceId(targetWorkspace.id);
      setSplitViewChain([]);
    }
  };

  const handleDuplicateToWorkspace = async (newWorkspaceName: string, sourceWorkspaceName: string, linkType: 'comment' | 'split-view' | 'new-page') => {
    const sourceWorkspace = workspaces.find(ws => ws.title === sourceWorkspaceName);
    if (!sourceWorkspace) return;

    const newWorkspace = await workspaceOperations.create(newWorkspaceName, 'user_defined');
    const titleHtmlContent = `<span style="font-weight: 700; font-size: 18px">${newWorkspaceName}</span>`;
    await workspaceOperations.update(newWorkspace.id, { titleHtmlContent });
    const updatedNewWorkspace = { ...newWorkspace, titleHtmlContent };

    const sourceElements = await elementOperations.getByWorkspaceId(sourceWorkspace.id);
    for (const element of sourceElements) {
      const newElement = { ...element, id: crypto.randomUUID(), workspaceId: newWorkspace.id, isManuallyPositioned: false };
      await elementOperations.create(newElement);
    }

    setWorkspaces(prev => [...prev, updatedNewWorkspace]);
  };

  // Popup dragging
  const handlePopupMouseMove = (e: MouseEvent) => {
    if (isDragging && draggingPopupIndex !== null) {
      setPopupStack(prev => prev.map((popup, index) =>
        index === draggingPopupIndex
          ? { ...popup, position: { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } }
          : popup
      ));
    }
  };

  const handlePopupMouseUp = () => {
    setIsDragging(false);
    setDraggingPopupIndex(null);
  };

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

  const handleCloseWorkspace = async (workspaceId: string) => {
    if (navigationHistory.length > 0 && activeWorkspaceId === workspaceId) {
      const previousState = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setActiveWorkspaceId(previousState.activeWorkspaceId);
      setPopupWorkspaceId(previousState.popupWorkspaceId);
      setPopupPosition(previousState.popupPosition);
      setSplitViewChain(previousState.splitViewChain);
      setPopupStack(previousState.popupStack);
      return;
    }

    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (workspace?.type === 'bidding_system') {
      setShowBackupDialog(true);
      return;
    }

    sessionStorage.removeItem('copiedTable');
    const returnTo = searchParams.get('returnTo');
    navigate(returnTo || '/dashboard');
  };

  const handleBackupAndClose = () => {
    setShowBackupDialog(false);
    if (activeWorkspaceId) {
      const activeWs = workspaces.find(ws => ws.id === activeWorkspaceId);
      if (activeWs?.type === 'bidding_system') {
        workspaceOperations.getById(activeWorkspaceId).then(fullWorkspace => {
          if (fullWorkspace && !fullWorkspace.backupOf && !fullWorkspace.backupGroupId) {
            createSystemBackup(activeWorkspaceId).then(result => {
              if (!result.success) console.error('Backup creation failed:', result.error);
            });
          }
        });
      }
    }
    sessionStorage.removeItem('copiedTable');
    const returnTo = searchParams.get('returnTo');
    navigate(returnTo || '/dashboard');
  };

  const handleCloseWithoutBackup = () => {
    setShowBackupDialog(false);
    sessionStorage.removeItem('copiedTable');
    const returnTo = searchParams.get('returnTo');
    navigate(returnTo || '/dashboard');
  };

  const handleSwitchToEditMode = () => {
    setIsViewMode(false);
    searchParams.set('mode', 'edit');
    setSearchParams(searchParams);
  };

  const handleSwitchToViewMode = () => {
    setIsViewMode(true);
    searchParams.set('mode', 'view');
    setSearchParams(searchParams);
  };

  const activeWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId);

  // Compute current system name
  const getCurrentSystemName = (): string | null => {
    if (!activeWorkspace?.title) return null;
    if (activeWorkspace.type === 'bidding_system') return activeWorkspace.title;

    const parts = activeWorkspace.title.split('_');
    if (parts.length >= 2) return parts[0];

    const possibleSystemNames = workspaces
      .filter(ws => ws.type === 'bidding_system' && ws.title)
      .map(ws => ws.title);

    for (const sysName of possibleSystemNames) {
      if (activeWorkspace.title.startsWith(sysName + '_')) return sysName;
    }
    return null;
  };

  const currentSystemName = getCurrentSystemName();
  const namingPrefix = activeWorkspace?.title ? activeWorkspace.title + '_' : '';

  // Available pages for hyperlinks - filtered to current system's pages + library conventions
  const availablePagesList = (() => {
    if (!currentSystemName) return getAvailablePages(workspaces as any);
    const filtered = workspaces.filter(ws => {
      // Exclude backup workspaces
      if (ws.backupOf || ws.backupGroupId) return false;
      // Exclude the main system workspace (user is already on it)
      if (ws.title === currentSystemName) return false;
      // Include chapters (workspaces with systemName_ prefix)
      if (ws.title.startsWith(currentSystemName + '_')) return true;
      // Include library conventions
      if (ws.type === 'bidding_convention') return true;
      return false;
    });
    return filtered.map(w => ({ id: w.id, name: getDisplayName(w.title) }));
  })();

  // Get V2 pages for rendering
  const activePage = activeWorkspaceId ? pages.get(activeWorkspaceId) : null;
  // Split view pages from the chain
  const splitPages = splitViewChain.map(id => ({ id, page: pages.get(id) }));

  const pageHeight = 'calc(100vh - 32px)';

  const contextValue: WorkspaceContextType = {
    workspaces,
    openWorkspacePopup: (workspaceName: string, position?: { x: number; y: number }) => {
      handleNavigateToWorkspace(workspaceName, 'comment', position, { type: 'main' });
    },
    openWorkspaceSplitView: (workspaceName: string, position?: { x: number; y: number }) => {
      handleNavigateToWorkspace(workspaceName, 'split-view', position, { type: 'main' });
    },
    openWorkspaceNewPage: (workspaceName: string) => {
      handleNavigateToWorkspace(workspaceName, 'new-page', undefined, { type: 'main' });
    },
    currentSystemName,
    namingPrefix
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      <div className="w-full h-screen bg-gray-100 flex items-start justify-start overflow-auto" style={{ padding: '16px 16px 16px 32px', gap: '5px' }}>
        {/* Main Page */}
        {activePage ? (
          <div className="flex flex-col" style={{ height: pageHeight, maxHeight: pageHeight, flexShrink: 0 }}>
            <Page
              page={activePage}
              onPageChange={(updates) => handlePageChange(activeWorkspaceId!, updates)}
              onElementChange={(elementId, updates) => handleElementChange(activeWorkspaceId!, elementId, updates)}
              onAddElement={(type) => handleAddElement(activeWorkspaceId!, type)}
              onDeleteElement={(elementId) => handleDeleteElement(activeWorkspaceId!, elementId)}
              onMoveElement={(elementId, direction) => handleMoveElement(activeWorkspaceId!, elementId, direction)}
              onPasteTable={(rows, name, opts) => handlePasteTable(activeWorkspaceId!, rows, name, opts)}
              isViewMode={isViewMode}
              onExit={(shouldSave) => {
                if (shouldSave) {
                  // Changes already auto-saved to Supabase via onChange callbacks
                  // Optionally create a backup before closing
                  handleBackupAndClose();
                } else {
                  // Discard or no changes — just close, skip backup dialog
                  handleCloseWithoutBackup();
                }
              }}
              availablePages={availablePagesList}
              onHyperlinkClick={(target) => handleHyperlinkClick(target, { type: 'main' })}
              embedded={true}
            />
          </div>
        ) : workspaceIdFromUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-gray-500">Loading workspace...</p>
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

        {/* Split View Chain */}
        {splitPages.map(({ id: wsId, page: splitPage }, index) => {
          if (!splitPage) return null;
          return (
            <div key={wsId} className="flex flex-col" style={{ height: pageHeight, maxHeight: pageHeight, flexShrink: 0 }}>
              <Page
                page={splitPage}
                onPageChange={(updates) => handlePageChange(wsId, updates)}
                onElementChange={(elementId, updates) => handleElementChange(wsId, elementId, updates)}
                onAddElement={(type) => handleAddElement(wsId, type)}
                onDeleteElement={(elementId) => handleDeleteElement(wsId, elementId)}
                onMoveElement={(elementId, direction) => handleMoveElement(wsId, elementId, direction)}
                onPasteTable={(rows, name, opts) => handlePasteTable(wsId, rows, name, opts)}
                isViewMode={isViewMode}
                onExit={() => {
                  // Close this split and everything after it
                  setSplitViewChain(prev => prev.slice(0, index));
                }}
                availablePages={availablePagesList}
                onHyperlinkClick={(target) => handleHyperlinkClick(target, { type: 'split', index })}
                embedded={true}
                parentSideMargin={activePage?.leftMargin ?? 20}
              />
            </div>
          );
        })}

        {/* Popup Chain */}
        {popupStack.map((popup, index) => {
          const popupPage = pages.get(popup.workspaceId);
          if (!popupPage) return null;

          return (
            <PopupView
              key={popup.workspaceId}
              position={popup.position}
              zIndex={100 + index * 10}
            >
              <Page
                page={popupPage}
                onPageChange={(updates) => handlePageChange(popup.workspaceId, updates)}
                onElementChange={(elementId, updates) => handleElementChange(popup.workspaceId, elementId, updates)}
                onAddElement={(type) => handleAddElement(popup.workspaceId, type)}
                onDeleteElement={(elementId) => handleDeleteElement(popup.workspaceId, elementId)}
                onMoveElement={(elementId, direction) => handleMoveElement(popup.workspaceId, elementId, direction)}
                onPasteTable={(rows, name, opts) => handlePasteTable(popup.workspaceId, rows, name, opts)}
                isViewMode={isViewMode}
                onExit={() => {
                  // Close this popup and all children after it
                  setPopupStack(prev => prev.slice(0, index));
                  if (index === 0) {
                    setPopupWorkspaceId(null);
                    setPopupPosition(null);
                  }
                }}
                availablePages={availablePagesList}
                onHyperlinkClick={(target) => handleHyperlinkClick(target, { type: 'popup', index })}
                embedded={true}
                parentSideMargin={activePage?.leftMargin ?? 20}
              />
            </PopupView>
          );
        })}

        {/* Workspace Name Dialog */}
        {showWorkspaceNameDialog && (
          <WorkspaceNameDialog
            onConfirm={handleCreateWorkspace}
            onCancel={() => setShowWorkspaceNameDialog(false)}
          />
        )}

        {/* Share Dialog */}
        {showShareDialog && activeWorkspaceId && activeWorkspace && (
          <ShareDialog
            workspaceName={getDisplayName(activeWorkspace.title)}
            workspaceId={activeWorkspaceId}
            onClose={() => setShowShareDialog(false)}
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
    </WorkspaceContext.Provider>
  );
}
