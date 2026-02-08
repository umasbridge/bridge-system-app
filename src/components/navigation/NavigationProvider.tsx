import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Page, HyperlinkTarget, HyperlinkMode } from '@/types';

// Popup state for stack management
interface PopupState {
  pageId: string;
  position: { x: number; y: number };
}

// Full navigation state for history
interface NavigationState {
  activePageId: string;
  splitViewPageId: string | null;
  popupStack: PopupState[];
}

// Navigation context type
interface NavigationContextType {
  // Current state
  activePageId: string | null;
  splitViewPageId: string | null;
  popupStack: PopupState[];
  isViewMode: boolean;

  // Pages data
  pages: Page[];
  getPage: (id: string) => Page | undefined;

  // Navigation functions
  openPopup: (pageId: string, position?: { x: number; y: number }, fromPopup?: boolean) => void;
  openSplitView: (pageId: string, fromPopup?: boolean) => void;
  openNewPage: (pageId: string, fromPopup?: boolean) => void;
  closePopup: (pageId: string) => void;
  closeAllPopups: () => void;
  closeSplitView: () => void;
  goBack: () => void;

  // Popup promotion
  promotePopupToPage: (pageId: string) => void;

  // Set active page directly
  setActivePage: (pageId: string) => void;

  // Handle hyperlink clicks
  handleHyperlinkClick: (target: HyperlinkTarget, position?: { x: number; y: number }, fromPopup?: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}

// Optional hook that doesn't throw
export function useNavigationOptional() {
  return useContext(NavigationContext);
}

interface NavigationProviderProps {
  children: ReactNode;
  pages: Page[];
  initialPageId?: string;
  isViewMode?: boolean;
}

export function NavigationProvider({
  children,
  pages,
  initialPageId,
  isViewMode = false,
}: NavigationProviderProps) {
  // State
  const [activePageId, setActivePageId] = useState<string | null>(initialPageId || pages[0]?.id || null);
  const [splitViewPageId, setSplitViewPageId] = useState<string | null>(null);
  const [popupStack, setPopupStack] = useState<PopupState[]>([]);
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([]);

  // Get page by ID
  const getPage = useCallback((id: string) => {
    return pages.find(p => p.id === id);
  }, [pages]);

  // Open popup
  const openPopup = useCallback((pageId: string, position?: { x: number; y: number }, _fromPopup?: boolean) => {
    const defaultPosition = position || { x: window.innerWidth / 2 - 200, y: 100 };

    // Check if popup already exists
    const existingIndex = popupStack.findIndex(p => p.pageId === pageId);
    if (existingIndex >= 0) {
      // Bring to front by moving to end
      setPopupStack(prev => {
        const updated = [...prev];
        const [existing] = updated.splice(existingIndex, 1);
        existing.position = defaultPosition;
        return [...updated, existing];
      });
      return;
    }

    // Add new popup
    setPopupStack(prev => [...prev, { pageId, position: defaultPosition }]);
  }, [popupStack]);

  // Open split view
  const openSplitView = useCallback((pageId: string, _fromPopup?: boolean) => {
    setSplitViewPageId(pageId);
  }, []);

  // Open new page (full navigation)
  const openNewPage = useCallback((pageId: string, fromPopup?: boolean) => {
    // Save current state to history
    if (activePageId) {
      setNavigationHistory(prev => [...prev, {
        activePageId,
        splitViewPageId,
        popupStack: fromPopup ? popupStack : [],
      }]);
    }

    // Navigate to new page
    setActivePageId(pageId);

    // Clear popups if navigating from main (not from popup)
    if (!fromPopup) {
      setPopupStack([]);
    }

    // Close split view
    setSplitViewPageId(null);
  }, [activePageId, splitViewPageId, popupStack]);

  // Close specific popup
  const closePopup = useCallback((pageId: string) => {
    setPopupStack(prev => prev.filter(p => p.pageId !== pageId));
  }, []);

  // Close all popups
  const closeAllPopups = useCallback(() => {
    setPopupStack([]);
  }, []);

  // Close split view
  const closeSplitView = useCallback(() => {
    setSplitViewPageId(null);
  }, []);

  // Go back in history
  const goBack = useCallback(() => {
    if (navigationHistory.length === 0) return;

    const prevState = navigationHistory[navigationHistory.length - 1];
    setNavigationHistory(prev => prev.slice(0, -1));

    setActivePageId(prevState.activePageId);
    setSplitViewPageId(prevState.splitViewPageId);
    setPopupStack(prevState.popupStack);
  }, [navigationHistory]);

  // Promote popup to full page
  const promotePopupToPage = useCallback((pageId: string) => {
    // Save current state
    if (activePageId) {
      setNavigationHistory(prev => [...prev, {
        activePageId,
        splitViewPageId,
        popupStack: popupStack.filter(p => p.pageId !== pageId),
      }]);
    }

    // Promote
    setActivePageId(pageId);
    closePopup(pageId);
  }, [activePageId, splitViewPageId, popupStack, closePopup]);

  // Set active page directly
  const setActivePage = useCallback((pageId: string) => {
    setActivePageId(pageId);
    setPopupStack([]);
    setSplitViewPageId(null);
  }, []);

  // Handle hyperlink click based on mode
  const handleHyperlinkClick = useCallback((
    target: HyperlinkTarget,
    position?: { x: number; y: number },
    fromPopup?: boolean
  ) => {
    const modeMap: Record<HyperlinkMode, () => void> = {
      popup: () => openPopup(target.pageId, position, fromPopup),
      split: () => openSplitView(target.pageId, fromPopup),
      newpage: () => openNewPage(target.pageId, fromPopup),
    };

    modeMap[target.mode]?.();
  }, [openPopup, openSplitView, openNewPage]);

  const contextValue: NavigationContextType = {
    activePageId,
    splitViewPageId,
    popupStack,
    isViewMode,
    pages,
    getPage,
    openPopup,
    openSplitView,
    openNewPage,
    closePopup,
    closeAllPopups,
    closeSplitView,
    goBack,
    promotePopupToPage,
    setActivePage,
    handleHyperlinkClick,
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}
