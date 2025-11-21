import { useState, createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { BiddingTableWorkspace } from './BiddingTableWorkspace';

export interface Workspace {
  id: string;
  name: string;
  content?: ReactNode;
  isCommentView?: boolean;
}

interface WorkspaceLink {
  workspaceName: string;
  linkType: 'comment' | 'split-view' | 'new-page';
  text: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  createWorkspace: (name: string) => void;
  openWorkspacePopup: (workspaceName: string, position?: { x: number; y: number }) => void;
  openWorkspaceSplitView: (workspaceName: string) => void;
  openWorkspaceNewPage: (workspaceName: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext must be used within WorkspaceProvider');
  }
  return context;
}

interface CommentBoxProps {
  workspaceName: string;
  position: { x: number; y: number };
  workspace?: Workspace;
  onClose: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onReadMore: () => void;
}

function CommentBox({ workspaceName, position, workspace, onClose, onMouseDown, onReadMore }: CommentBoxProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        const hasOverflow = contentRef.current.scrollHeight > contentRef.current.clientHeight;
        setIsOverflowing(hasOverflow);
      }
    };

    checkOverflow();
    // Check again after a short delay to account for content loading
    const timer = setTimeout(checkOverflow, 500);

    return () => clearTimeout(timer);
  }, [workspace]);

  return (
    <div 
      className="fixed bg-white rounded-lg shadow-2xl flex flex-col border-2 border-gray-300"
      style={{
        left: `${position.x + 20}px`,
        top: `${position.y + 10}px`,
        width: '400px',
        height: '300px',
        zIndex: 100
      }}
      onMouseDown={onMouseDown}
    >
      {/* Header */}
      <div 
        data-popup-header
        className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 cursor-move"
      >
        <h2 className="text-sm select-none">{workspaceName}</h2>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Content */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-auto"
        style={{ maxHeight: isOverflowing ? 'calc(100% - 84px)' : 'calc(100% - 48px)' }}
      >
        {workspace?.content}
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
}

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [popupWorkspace, setPopupWorkspace] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [splitViewWorkspace, setSplitViewWorkspace] = useState<string | null>(null);
  const [splitViewPosition, setSplitViewPosition] = useState<{ x: number; y: number } | null>(null);

  const createWorkspace = (name: string, isCommentView = false) => {
    const exists = workspaces.some(w => w.name === name);
    if (!exists) {
      setWorkspaces([...workspaces, {
        id: Math.random().toString(36).substring(7),
        name,
        content: <BiddingTableWorkspace hideControls={isCommentView} />,
        isCommentView
      }]);
    }
  };

  const openWorkspacePopup = (workspaceName: string, position?: { x: number; y: number }) => {
    createWorkspace(workspaceName, true); // true = isCommentView
    setPopupWorkspace(workspaceName);
    setPopupPosition(position || { x: 100, y: 100 });
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
    if (isDragging) {
      setPopupPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handlePopupMouseUp = () => {
    setIsDragging(false);
  };

  const openWorkspaceSplitView = (workspaceName: string, position?: { x: number; y: number }) => {
    createWorkspace(workspaceName, true); // true = read-only view (hide controls)
    setSplitViewWorkspace(workspaceName);
    setSplitViewPosition(position || { x: 0, y: 0 });
  };

  const openWorkspaceNewPage = (workspaceName: string) => {
    createWorkspace(workspaceName);
    // For now, just log - in real app would open in new tab
    console.log('Opening workspace in new page:', workspaceName);
    alert(`Opening workspace "${workspaceName}" in new page (functionality placeholder)`);
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

  const contextValue: WorkspaceContextType = {
    workspaces,
    createWorkspace,
    openWorkspacePopup,
    openWorkspaceSplitView,
    openWorkspaceNewPage,
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      <div className="relative w-full h-full">
        {/* Main workspace content */}
        {children}
        
        {/* Split View Workspace - Overlapping */}
        {splitViewWorkspace && splitViewPosition && (
          <div 
            className="fixed top-0 border-l-2 border-gray-300 bg-white shadow-2xl overflow-auto"
            style={{
              left: `${splitViewPosition.x}px`,
              height: '100vh',
              width: `calc(100vw - ${splitViewPosition.x}px)`,
              zIndex: 50
            }}
          >
            <div className="sticky top-4 right-4 z-10 flex justify-end p-4">
              <Button
                onClick={() => {
                  setSplitViewWorkspace(null);
                  setSplitViewPosition(null);
                }}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
            <div className="w-full h-full overflow-auto px-4 pb-4">
              {workspaces.find(w => w.name === splitViewWorkspace)?.content}
            </div>
          </div>
        )}

        {/* Popup Workspace - Comment Box */}
        {popupWorkspace && popupPosition && (
          <CommentBox
            workspaceName={popupWorkspace}
            position={popupPosition}
            workspace={workspaces.find(w => w.name === popupWorkspace)}
            onClose={() => {
              setPopupWorkspace(null);
              setPopupPosition(null);
            }}
            onMouseDown={handlePopupMouseDown}
            onReadMore={() => openWorkspaceNewPage(popupWorkspace)}
          />
        )}
      </div>
    </WorkspaceContext.Provider>
  );
}
