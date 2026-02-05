import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ChevronDown, ChevronRight, MessageSquare, Columns, FileText, FolderOpen, Folder, File } from 'lucide-react';
import { WorkspaceHierarchyEntry } from '../../lib/backup-operations';

interface HyperlinkDialogProps {
  selectedText: string;
  namingPrefix: string;
  existingWorkspaces: string[];
  linkedWorkspaces: string[];
  systemWorkspaces?: string[]; // System names (type='bidding_system' workspaces)
  workspaceHierarchy?: Map<string, WorkspaceHierarchyEntry>; // Workspace parent-child relationships
  onConfirm: (workspaceName: string, linkType: 'comment' | 'split-view' | 'new-page') => void;
  onConfirmWithCopy?: (newWorkspaceName: string, sourceWorkspaceName: string, linkType: 'comment' | 'split-view' | 'new-page') => void;
  onCancel: () => void;
}

// Tree node structure for hierarchical workspace display
interface TreeNode {
  name: string;           // Display name (workspace title)
  fullPath: string;       // Full workspace name for selection
  children: Map<string, TreeNode>;
  isWorkspace: boolean;   // true if this node represents an actual workspace (selectable)
  isSystem?: boolean;     // true if this is a system (top-level folder)
}

// Build a tree structure from the workspace hierarchy data
// Uses actual hyperlink relationships to determine parent-child nesting
function buildWorkspaceTreeFromHierarchy(
  hierarchy: Map<string, WorkspaceHierarchyEntry> | undefined,
  linkedWorkspaces: string[],
  systemWorkspaces: string[] = []
): Map<string, TreeNode> {
  const root = new Map<string, TreeNode>();

  // If no hierarchy data, fall back to flat list
  if (!hierarchy || hierarchy.size === 0) {
    // Systems as folders
    for (const systemName of systemWorkspaces) {
      root.set(systemName, {
        name: systemName,
        fullPath: systemName,
        children: new Map(),
        isWorkspace: false,
        isSystem: true
      });
    }
    // Non-system workspaces as files
    for (const ws of linkedWorkspaces) {
      if (!systemWorkspaces.includes(ws)) {
        root.set(ws, {
          name: ws,
          fullPath: ws,
          children: new Map(),
          isWorkspace: true,
          isSystem: false
        });
      }
    }
    return root;
  }

  // Track which workspaces are children of other workspaces
  const isChildOfSomeone = new Set<string>();

  // Build set of child workspaces
  for (const entry of hierarchy.values()) {
    for (const childName of entry.children) {
      isChildOfSomeone.add(childName);
    }
  }

  // Helper to recursively build tree node with children
  const buildNode = (wsName: string, visited: Set<string>): TreeNode | null => {
    if (visited.has(wsName)) return null; // Prevent cycles
    visited.add(wsName);

    const entry = hierarchy.get(wsName);
    if (!entry) return null;

    const node: TreeNode = {
      name: wsName,
      fullPath: wsName,
      children: new Map(),
      isWorkspace: !entry.isSystem, // Non-systems are selectable
      isSystem: entry.isSystem
    };

    // Recursively add children
    for (const childName of entry.children) {
      const childNode = buildNode(childName, new Set(visited));
      if (childNode) {
        node.children.set(childName, childNode);
      }
    }

    return node;
  };

  // Add systems at root level
  for (const entry of hierarchy.values()) {
    if (entry.isSystem) {
      const node = buildNode(entry.workspaceName, new Set());
      if (node) {
        root.set(entry.workspaceName, node);
      }
    }
  }

  // Add orphan workspaces (not a child of any workspace and not a system) at root level as files
  for (const entry of hierarchy.values()) {
    if (!entry.isSystem && !isChildOfSomeone.has(entry.workspaceName)) {
      // This is a non-system workspace that isn't linked from anywhere
      // Add it at root level as a file
      if (!root.has(entry.workspaceName)) {
        root.set(entry.workspaceName, {
          name: entry.workspaceName,
          fullPath: entry.workspaceName,
          children: new Map(),
          isWorkspace: true,
          isSystem: false
        });
      }
    }
  }

  return root;
}

// Count total workspaces under a node
function countWorkspaces(node: TreeNode): number {
  let count = node.isWorkspace ? 1 : 0;
  for (const child of node.children.values()) {
    count += countWorkspaces(child);
  }
  return count;
}

export function HyperlinkDialog({
  selectedText,
  namingPrefix,
  existingWorkspaces,
  linkedWorkspaces,
  systemWorkspaces = [],
  workspaceHierarchy,
  onConfirm,
  onConfirmWithCopy,
  onCancel
}: HyperlinkDialogProps) {
  const [mode, setMode] = useState<'create' | 'existing'>('create');
  const [userNameSuffix, setUserNameSuffix] = useState('');
  const [linkType, setLinkType] = useState<'comment' | 'split-view' | 'new-page'>('new-page');
  const [selectedExistingWorkspace, setSelectedExistingWorkspace] = useState('');
  const [existingAction, setExistingAction] = useState<'link' | 'copy' | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build hierarchical tree from workspace hierarchy (actual hyperlink relationships)
  const workspaceTree = useMemo(() => buildWorkspaceTreeFromHierarchy(workspaceHierarchy, linkedWorkspaces, systemWorkspaces), [workspaceHierarchy, linkedWorkspaces, systemWorkspaces]);

  // Toggle expansion of a path
  const toggleExpanded = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Render a tree node recursively
  const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const hasChildren = node.children.size > 0;
    const isExpanded = expandedPaths.has(node.fullPath);
    const isSelected = selectedExistingWorkspace === node.fullPath;
    const workspaceCount = countWorkspaces(node);
    // Only show as expandable folder if it actually has children to show
    const isClickableFolder = hasChildren;
    // Systems without children should show as empty folders (not expandable)
    const isEmptySystemFolder = node.isSystem && !hasChildren;
    const canSelect = node.isWorkspace && !node.isSystem;

    return (
      <div key={node.fullPath}>
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Systems and folders with children can be expanded/collapsed
            if (isClickableFolder) {
              toggleExpanded(node.fullPath);
            }
            // Only non-system workspaces can be selected
            if (canSelect) {
              setSelectedExistingWorkspace(node.fullPath);
              setExistingAction(null);
            }
          }}
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-100 text-blue-900' : ''
          } ${depth === 0 ? 'border-b border-gray-200' : ''}`}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          {/* Expand/collapse chevron for folders with children */}
          {isClickableFolder ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
            )
          ) : (
            <span className="w-4 flex-shrink-0" /> // Spacer for alignment
          )}

          {/* Icon: folder (with/without children) or file */}
          {isClickableFolder ? (
            isExpanded ? (
              <FolderOpen className="w-5 h-5 text-blue-500 flex-shrink-0" />
            ) : (
              <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
            )
          ) : isEmptySystemFolder ? (
            <Folder className="w-5 h-5 text-gray-400 flex-shrink-0" />
          ) : (
            <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}

          {/* Name */}
          <span className={`${isClickableFolder ? 'font-medium' : ''} ${node.isWorkspace && !isClickableFolder && !isEmptySystemFolder ? 'text-gray-700' : ''} ${isEmptySystemFolder ? 'text-gray-400 font-semibold' : ''} ${node.isSystem && !isEmptySystemFolder ? 'font-semibold text-gray-800' : ''}`}>
            {node.name}
          </span>
          {/* Empty system indicator */}
          {isEmptySystemFolder && (
            <span className="text-xs text-gray-400 ml-1">(empty)</span>
          )}

          {/* Count for folders - show count of selectable workspaces */}
          {isClickableFolder && workspaceCount > 0 && (
            <span className="text-sm text-gray-400 ml-auto">({workspaceCount})</span>
          )}
        </div>

        {/* Render children if expanded */}
        {isClickableFolder && isExpanded && (
          <div className={depth === 0 ? 'bg-gray-50' : ''}>
            {Array.from(node.children.values()).map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Blur any active element when dialog mounts
  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }, []);

  // Focus input when appropriate
  useEffect(() => {
    if (mode === 'create' || (mode === 'existing' && existingAction === 'copy')) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mode, existingAction]);

  // Trap focus within dialog
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const dialog = document.querySelector('[data-hyperlink-dialog]');
      if (dialog && e.target && !dialog.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        if (inputRef.current) {
          inputRef.current.focus();
        } else {
          (dialog as HTMLElement).focus();
        }
      }
    };
    document.addEventListener('focusin', handleFocusIn, true);
    return () => document.removeEventListener('focusin', handleFocusIn, true);
  }, []);


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const getFullName = () => namingPrefix + userNameSuffix.trim();

  const canSubmit = () => {
    if (mode === 'create') {
      return userNameSuffix.trim().length > 0;
    } else {
      if (!selectedExistingWorkspace) return false;
      if (existingAction === 'copy') {
        return userNameSuffix.trim().length > 0;
      }
      return existingAction === 'link';
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    if (mode === 'create') {
      onConfirm(getFullName(), linkType);
    } else if (existingAction === 'link') {
      onConfirm(selectedExistingWorkspace, linkType);
    } else if (existingAction === 'copy' && onConfirmWithCopy) {
      await onConfirmWithCopy(getFullName(), selectedExistingWorkspace, linkType);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999 }}
      onClick={handleBackdropClick}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        ref={dialogRef}
        data-hyperlink-dialog
        tabIndex={-1}
        className="bg-white rounded-lg shadow-2xl w-[580px] max-h-[80vh] overflow-y-auto outline-none"
        style={{ position: 'relative' }}
        onKeyDown={handleKeyDown}
      >
        {/* Title */}
        <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '48px', paddingBottom: '40px' }}>
          <h2 style={{ fontSize: '30px', fontWeight: '800', textAlign: 'center', color: '#111827' }}>
            Create Hyperlink
          </h2>
        </div>

        {/* Mode Selection Buttons */}
        <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingBottom: '40px' }}>
          <div className="flex gap-4">
            <Button
              type="button"
              onClick={() => {
                setMode('create');
                setSelectedExistingWorkspace('');
                setExistingAction(null);
                setUserNameSuffix('');
              }}
              className="flex-1 h-12 px-8 text-base font-medium"
              variant={mode === 'create' ? 'default' : 'outline'}
            >
              Create New
            </Button>
            <Button
              type="button"
              onClick={() => {
                setMode('existing');
                setUserNameSuffix('');
              }}
              className="flex-1 h-12 px-8 text-base font-medium"
              variant={mode === 'existing' ? 'default' : 'outline'}
            >
              Link to Existing
            </Button>
          </div>
        </div>

        {/* Form Content */}
        <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingBottom: '40px' }}>
          {/* Create New Mode */}
          {mode === 'create' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold text-gray-800">
                  Workspace Name
                </Label>
                <Input
                  ref={inputRef}
                  type="text"
                  value={userNameSuffix}
                  onChange={(e) => setUserNameSuffix(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Enter name..."
                  className="w-full h-12 px-4 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Link to Existing Mode */}
          {mode === 'existing' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold text-gray-800">
                  Select Workspace
                </Label>
                {/* Hierarchical file browser - multi-level tree */}
                <div ref={dropdownRef} className="border-2 border-gray-300 rounded-md overflow-y-auto bg-white" style={{ maxHeight: '300px' }}>
                  {workspaceTree.size === 0 ? (
                    <div className="px-4 py-3 text-gray-500 text-center">
                      No workspaces available
                    </div>
                  ) : (
                    Array.from(workspaceTree.values()).map(node => renderTreeNode(node, 0))
                  )}
                </div>
                {selectedExistingWorkspace && (
                  <p className="text-sm text-gray-500">
                    Selected: <span className="font-medium">{selectedExistingWorkspace}</span>
                  </p>
                )}
              </div>

              {/* Action selection after workspace is chosen */}
              {selectedExistingWorkspace && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-gray-800">
                    Action
                  </Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      onClick={() => {
                        setExistingAction('link');
                        setUserNameSuffix('');
                      }}
                      className="flex-1 h-12 px-8 text-base font-medium"
                      variant={existingAction === 'link' ? 'default' : 'outline'}
                    >
                      Link (shared)
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setExistingAction('copy');
                        setUserNameSuffix('');
                      }}
                      className="flex-1 h-12 px-8 text-base font-medium"
                      variant={existingAction === 'copy' ? 'default' : 'outline'}
                    >
                      Copy (new)
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    {existingAction === 'link'
                      ? 'Changes will affect all links to this workspace'
                      : existingAction === 'copy'
                      ? 'Creates a new independent copy of the workspace'
                      : 'Choose whether to link to existing or create a copy'}
                  </p>
                </div>
              )}

              {/* Name input for copy action */}
              {existingAction === 'copy' && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-gray-800">
                    New Copy Name
                  </Label>
                  <Input
                    ref={inputRef}
                    type="text"
                    value={userNameSuffix}
                    onChange={(e) => setUserNameSuffix(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Enter name for copy..."
                    className="w-full h-12 px-4 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer with Link Type and Actions */}
        <div className="bg-gray-50 border-t border-gray-200 rounded-b-lg" style={{ padding: '32px 48px' }}>
          {/* Link Type Selection */}
          <div className="flex items-center justify-center" style={{ gap: '24px', marginBottom: '32px' }}>
            <Button
              type="button"
              onClick={() => setLinkType('comment')}
              variant={linkType === 'comment' ? 'default' : 'outline'}
              className="h-11 gap-3 text-base"
              style={{ paddingLeft: '24px', paddingRight: '24px' }}
            >
              <MessageSquare className="h-5 w-5" />
              Comment
            </Button>
            <Button
              type="button"
              onClick={() => setLinkType('split-view')}
              variant={linkType === 'split-view' ? 'default' : 'outline'}
              className="h-11 gap-3 text-base"
              style={{ paddingLeft: '24px', paddingRight: '24px' }}
            >
              <Columns className="h-5 w-5" />
              Split View
            </Button>
            <Button
              type="button"
              onClick={() => setLinkType('new-page')}
              variant={linkType === 'new-page' ? 'default' : 'outline'}
              className="h-11 gap-3 text-base"
              style={{ paddingLeft: '24px', paddingRight: '24px' }}
            >
              <FileText className="h-5 w-5" />
              New Page
            </Button>
          </div>

          {/* Cancel / Create Buttons */}
          <div className="flex justify-end" style={{ gap: '16px' }}>
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="h-12 text-base font-semibold"
              style={{ paddingLeft: '32px', paddingRight: '32px' }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit()}
              className="h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              style={{ paddingLeft: '32px', paddingRight: '32px' }}
            >
              {mode === 'existing' && existingAction === 'copy' ? 'Create Copy & Link' : 'Create Link'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
