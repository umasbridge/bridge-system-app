import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Plus, X } from 'lucide-react';
import { WorkspaceEditor } from './WorkspaceEditor';
import { WorkspaceNameDialog } from './WorkspaceNameDialog';
import { workspaceOperations, Workspace as DBWorkspace } from '../../db/database';

interface Workspace {
  id: string;
  title: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  openWorkspacePopup: (workspaceName: string, position?: { x: number; y: number }) => void;
  openWorkspaceSplitView: (workspaceName: string, position?: { x: number; y: number }) => void;
  openWorkspaceNewPage: (workspaceName: string) => void;
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
        {workspace && (
          <WorkspaceEditor
            key={workspace.id}
            workspaceId={workspace.id}
            initialTitle={workspace.title}
            hideControls={true}
          />
        )}
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

export function WorkspaceSystem() {
  const { id: workspaceIdFromUrl } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [splitViewWorkspaceId, setSplitViewWorkspaceId] = useState<string | null>(null);
  const [popupWorkspace, setPopupWorkspace] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showWorkspaceNameDialog, setShowWorkspaceNameDialog] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]); // Track which workspace we came from

  // Load workspaces from DB and handle URL-based workspace loading
  useEffect(() => {
    const loadWorkspaces = async () => {
      const dbWorkspaces = await workspaceOperations.getAll();
      setWorkspaces(dbWorkspaces);

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

  const handleNavigateToWorkspace = async (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page', position?: { x: number; y: number }) => {
    // Check if workspace already exists, create if not
    let existingWorkspace = workspaces.find(ws => ws.title === workspaceName);
    if (!existingWorkspace) {
      const newWorkspace = await workspaceOperations.create(workspaceName);
      setWorkspaces([...workspaces, newWorkspace]);
      existingWorkspace = newWorkspace;
    }

    if (linkType === 'comment') {
      // Open as popup comment box
      setPopupWorkspace(workspaceName);
      setPopupPosition(position || { x: 100, y: 100 });
    } else if (linkType === 'split-view') {
      // Open in split view (50/50) next to active workspace
      if (existingWorkspace) {
        setSplitViewWorkspaceId(existingWorkspace.id);
      }
    } else {
      // For new-page, navigate to the workspace tab
      if (existingWorkspace) {
        // Push current workspace to history before navigating
        if (activeWorkspaceId) {
          setNavigationHistory(prev => [...prev, activeWorkspaceId]);
        }
        setActiveWorkspaceId(existingWorkspace.id);
        setSplitViewWorkspaceId(null); // Close split view when switching tabs
      }
    }
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

  const handleReadMore = () => {
    if (popupWorkspace) {
      const workspace = workspaces.find(ws => ws.title === popupWorkspace);
      if (workspace) {
        setActiveWorkspaceId(workspace.id);
        setPopupWorkspace(null);
        setPopupPosition(null);
      }
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

  const handleCloseWorkspace = async (workspaceId: string) => {
    // Check if we have navigation history - if so, go back instead of deleting
    if (navigationHistory.length > 0 && activeWorkspaceId === workspaceId) {
      // Pop the last workspace from history and navigate back to it
      const previousWorkspaceId = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setActiveWorkspaceId(previousWorkspaceId);
    } else {
      // No history, so delete the workspace (this is the original behavior)
      await workspaceOperations.delete(workspaceId);
      setWorkspaces(workspaces.filter(ws => ws.id !== workspaceId));
      if (activeWorkspaceId === workspaceId) {
        const remainingWorkspaces = workspaces.filter(ws => ws.id !== workspaceId);
        setActiveWorkspaceId(remainingWorkspaces.length > 0 ? remainingWorkspaces[0].id : null);
      }
    }
  };

  const handleSaveAndClose = () => {
    // Check if we have navigation history - if so, go back to previous workspace
    if (navigationHistory.length > 0) {
      const previousWorkspaceId = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setActiveWorkspaceId(previousWorkspaceId);
    } else {
      // No history, navigate back to dashboard
      navigate('/dashboard');
    }
  };

  const handleSwitchToEditMode = () => {
    setIsViewMode(false);
    // Update URL to reflect edit mode
    searchParams.set('mode', 'edit');
    setSearchParams(searchParams);
  };

  const activeWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId);
  const splitViewWorkspace = workspaces.find(ws => ws.id === splitViewWorkspaceId);

  const contextValue: WorkspaceContextType = {
    workspaces,
    openWorkspacePopup: (workspaceName: string, position?: { x: number; y: number }) => {
      handleNavigateToWorkspace(workspaceName, 'comment', position);
    },
    openWorkspaceSplitView: (workspaceName: string, position?: { x: number; y: number }) => {
      handleNavigateToWorkspace(workspaceName, 'split-view', position);
    },
    openWorkspaceNewPage: (workspaceName: string) => {
      handleNavigateToWorkspace(workspaceName, 'new-page');
    }
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      <div className="w-full h-screen flex flex-col">
      {/* Top Navigation Bar - Hidden per user request */}
      {/* Workspace Content Area */}
      <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center px-8 pb-8 pt-1">
        {activeWorkspace ? (
          <div className={splitViewWorkspaceId ? "flex w-full max-w-[1600px]" : "w-full max-w-[800px]"}>
            {/* Main Workspace - A4 Page Layout */}
            <div className={splitViewWorkspaceId ? "w-1/2 pr-4" : "w-full"}>
              <div className="bg-white border-2 border-gray-300 rounded-sm shadow-lg" style={{ height: '1123px', width: '794px' }}>
                <WorkspaceEditor
                  key={activeWorkspace.id}
                  workspaceId={activeWorkspace.id}
                  initialTitle={activeWorkspace.title}
                  onTitleChange={(newTitle) => handleTitleChange(activeWorkspace.id, newTitle)}
                  onClose={() => handleCloseWorkspace(activeWorkspace.id)}
                  onSaveAndClose={handleSaveAndClose}
                  existingWorkspaces={workspaces.map(ws => ws.title)}
                  onNavigateToWorkspace={handleNavigateToWorkspace}
                  isViewMode={isViewMode}
                  onSwitchToEditMode={handleSwitchToEditMode}
                />
              </div>
            </div>

            {/* Split View Workspace - 50/50 Layout */}
            {splitViewWorkspaceId && splitViewWorkspace && (
              <div className="w-1/2 pl-4">
                <div className="bg-white border-2 border-gray-300 rounded-sm shadow-lg relative" style={{ height: '1123px', width: '794px' }}>
                {/* Close Split View Button */}
                <button
                  onClick={() => setSplitViewWorkspaceId(null)}
                  className="absolute top-2 right-2 z-10 p-1 border border-gray-300 rounded hover:bg-gray-100 hover:border-gray-400 transition-colors"
                  title="Close split view"
                >
                  <X className="h-4 w-4" />
                </button>

                <WorkspaceEditor
                  key={splitViewWorkspace.id}
                  workspaceId={splitViewWorkspace.id}
                  initialTitle={splitViewWorkspace.title}
                  onTitleChange={(newTitle) => handleTitleChange(splitViewWorkspace.id, newTitle)}
                  onClose={() => setSplitViewWorkspaceId(null)}
                  onSaveAndClose={handleSaveAndClose}
                  existingWorkspaces={workspaces.map(ws => ws.title)}
                  onNavigateToWorkspace={handleNavigateToWorkspace}
                  isViewMode={isViewMode}
                  onSwitchToEditMode={handleSwitchToEditMode}
                />
                </div>
              </div>
            )}
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

        {/* Popup Workspace - Comment Box */}
        {popupWorkspace && popupPosition && (
          <CommentBox
            workspaceName={popupWorkspace}
            position={popupPosition}
            workspace={workspaces.find(w => w.title === popupWorkspace)}
            onClose={() => {
              setPopupWorkspace(null);
              setPopupPosition(null);
            }}
            onMouseDown={handlePopupMouseDown}
            onReadMore={handleReadMore}
          />
        )}

        {/* Workspace Name Dialog */}
        {showWorkspaceNameDialog && (
          <WorkspaceNameDialog
            onConfirm={handleCreateWorkspace}
            onCancel={() => setShowWorkspaceNameDialog(false)}
          />
        )}
      </div>
    </div>
    </WorkspaceContext.Provider>
  );
}