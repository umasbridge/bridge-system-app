import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Button } from '../ui/button';
import { Plus, X } from 'lucide-react';
import { WorkspaceEditor } from './WorkspaceEditor';
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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [splitViewWorkspaceId, setSplitViewWorkspaceId] = useState<string | null>(null);
  const [splitViewPosition, setSplitViewPosition] = useState<{ x: number; y: number } | null>(null);
  const [popupWorkspace, setPopupWorkspace] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Load workspaces from DB on initial load
  useEffect(() => {
    const loadWorkspaces = async () => {
      const dbWorkspaces = await workspaceOperations.getAll();
      if (dbWorkspaces.length === 0) {
        // Create default workspace if none exist
        const defaultWorkspace = await workspaceOperations.create('Workspace 1');
        setWorkspaces([defaultWorkspace]);
        setActiveWorkspaceId(defaultWorkspace.id);
      } else {
        setWorkspaces(dbWorkspaces);
        setActiveWorkspaceId(dbWorkspaces[0].id);
      }
    };
    loadWorkspaces();
  }, []);

  const handleCreateWorkspace = async (title?: string) => {
    const existingWorkspace = workspaces.find(ws => ws.title === (title || 'Untitled Workspace'));
    if (existingWorkspace) {
      return existingWorkspace.id;
    }

    const newWorkspace = await workspaceOperations.create(title || 'Untitled Workspace');
    setWorkspaces([...workspaces, newWorkspace]);
    setActiveWorkspaceId(newWorkspace.id);
    return newWorkspace.id;
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
      // Open in split view next to active workspace
      if (existingWorkspace) {
        setSplitViewWorkspaceId(existingWorkspace.id);
        setSplitViewPosition(position || { x: window.innerWidth / 2, y: 0 });
      }
    } else {
      // For new-page, navigate to the workspace tab
      if (existingWorkspace) {
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
    await workspaceOperations.delete(workspaceId);
    setWorkspaces(workspaces.filter(ws => ws.id !== workspaceId));
    if (activeWorkspaceId === workspaceId) {
      const remainingWorkspaces = workspaces.filter(ws => ws.id !== workspaceId);
      setActiveWorkspaceId(remainingWorkspaces.length > 0 ? remainingWorkspaces[0].id : null);
    }
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
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 flex items-center px-4 py-2 gap-2">
        <Button
          onClick={() => handleCreateWorkspace()}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Workspace
        </Button>

        {/* Workspace Tabs */}
        {workspaces.length > 0 && (
          <div className="flex-1 flex items-center gap-1 overflow-x-auto ml-4">
            {workspaces.map(workspace => (
              <div
                key={workspace.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t border-b-2 cursor-pointer transition-colors ${
                  activeWorkspaceId === workspace.id
                    ? 'bg-gray-50 border-blue-500'
                    : 'bg-white border-transparent hover:bg-gray-50'
                }`}
                onClick={() => setActiveWorkspaceId(workspace.id)}
              >
                <span className="text-sm truncate max-w-[150px]">
                  {workspace.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseWorkspace(workspace.id);
                  }}
                  className="hover:bg-gray-200 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Close Split View Button */}
        {splitViewWorkspaceId && (
          <Button
            onClick={() => setSplitViewWorkspaceId(null)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Close Split View
          </Button>
        )}
      </div>

      {/* Workspace Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeWorkspace ? (
          <div className="absolute inset-0">
            {/* Main Workspace */}
            <div className="w-full h-full">
              <WorkspaceEditor
                key={activeWorkspace.id}
                workspaceId={activeWorkspace.id}
                initialTitle={activeWorkspace.title}
                onTitleChange={(newTitle) => handleTitleChange(activeWorkspace.id, newTitle)}
                onClose={() => handleCloseWorkspace(activeWorkspace.id)}
                existingWorkspaces={workspaces.map(ws => ws.title)}
                onNavigateToWorkspace={handleNavigateToWorkspace}
              />
            </div>

            {/* Split View Workspace - Absolutely positioned */}
            {splitViewWorkspaceId && splitViewWorkspace && splitViewPosition && (
              <div
                className="fixed border-l-2 border-blue-500 bg-white shadow-2xl"
                style={{
                  left: `${splitViewPosition.x}px`,
                  top: `${splitViewPosition.y}px`,
                  right: 0,
                  bottom: 0,
                  zIndex: 50
                }}
              >
                <WorkspaceEditor
                  key={splitViewWorkspace.id}
                  workspaceId={splitViewWorkspace.id}
                  initialTitle={splitViewWorkspace.title}
                  onTitleChange={(newTitle) => handleTitleChange(splitViewWorkspace.id, newTitle)}
                  onClose={() => {
                    setSplitViewWorkspaceId(null);
                    setSplitViewPosition(null);
                  }}
                  existingWorkspaces={workspaces.map(ws => ws.title)}
                  onNavigateToWorkspace={handleNavigateToWorkspace}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No workspace open</p>
              <Button onClick={() => handleCreateWorkspace()} className="gap-2">
                <Plus className="h-4 w-4" />
                Create New Workspace
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
      </div>
    </div>
    </WorkspaceContext.Provider>
  );
}