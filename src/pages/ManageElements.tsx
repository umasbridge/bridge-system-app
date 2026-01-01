import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight, Folder, FolderOpen, FileText, Trash2, Eye, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { workspaceOperations, elementOperations, type Workspace, type WorkspaceElement } from '../lib/supabase-db';
import { useAuth } from '../lib/auth-context';
import logoImg from '../assets/logo.png';

// Helper to extract hyperlink targets from HTML content
function extractHyperlinks(htmlContent: string | undefined): string[] {
  if (!htmlContent) return [];
  const targets: string[] = [];

  // Match data-workspace="..." patterns
  const regex1 = /data-workspace="([^"]+)"/g;
  let match;
  while ((match = regex1.exec(htmlContent)) !== null) {
    targets.push(match[1]);
  }

  // Also match data-workspace-link="..." patterns
  const regex2 = /data-workspace-link="([^"]+)"/g;
  while ((match = regex2.exec(htmlContent)) !== null) {
    const decoded = match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    targets.push(decoded);
  }

  return targets;
}

// Helper to extract text from HTML
function extractTextFromHtml(html: string | undefined): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

// Tree node for hierarchical display
interface TreeNode {
  id: string;
  name: string;
  type: 'system' | 'workspace';
  workspace: Workspace;
  children: TreeNode[];
  depth: number;
}

export function ManageElements() {
  const navigate = useNavigate();
  const { verifyPassword } = useAuth();
  const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([]);
  const [allElements, setAllElements] = useState<WorkspaceElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showRetrieveDialog, setShowRetrieveDialog] = useState(false);
  const [deletedSystems, setDeletedSystems] = useState<Workspace[]>([]);
  const [activeTab, setActiveTab] = useState<'systems' | 'backups' | 'orphaned'>('systems');
  const [selectedOrphans, setSelectedOrphans] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workspaces, elements] = await Promise.all([
        workspaceOperations.getAll(),
        elementOperations.getAll()
      ]);
      setAllWorkspaces(workspaces);
      setAllElements(elements);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  };

  // Helper to check if a workspace is a backup
  const isBackup = (ws: Workspace): boolean => {
    const title = ws.title || extractTextFromHtml(ws.titleHtmlContent) || '';
    return title.toLowerCase().includes('backup');
  };

  // Build hierarchy based on hyperlinks
  const { mainHierarchy, backupSystems, orphanedWorkspaces } = useMemo(() => {
    // Map workspace titles to workspace objects
    const workspaceByTitle = new Map<string, Workspace>();
    allWorkspaces.forEach(ws => {
      const title = ws.title || extractTextFromHtml(ws.titleHtmlContent);
      if (title) {
        workspaceByTitle.set(title, ws);
      }
    });

    // Find all hyperlink targets from each workspace's elements
    const childrenMap = new Map<string, Set<string>>(); // parent workspace id -> set of child workspace titles

    allElements.forEach(element => {
      let htmlContent = '';

      if (element.type === 'text') {
        htmlContent = (element as any).htmlContent || '';
      } else if (element.type === 'systems-table') {
        // Check all rows for hyperlinks
        const rows = (element as any).initialRows || [];
        const extractFromRows = (rows: any[]): string => {
          let html = '';
          rows.forEach(row => {
            html += row.meaningHtmlContent || '';
            html += row.bidHtmlContent || '';
            if (row.children) {
              html += extractFromRows(row.children);
            }
          });
          return html;
        };
        htmlContent = extractFromRows(rows);
        htmlContent += (element as any).nameHtmlContent || '';
      }

      const targets = extractHyperlinks(htmlContent);
      if (targets.length > 0 && element.workspaceId) {
        const existing = childrenMap.get(element.workspaceId) || new Set();
        targets.forEach(t => existing.add(t));
        childrenMap.set(element.workspaceId, existing);
      }
    });

    // Also check workspace title HTML for hyperlinks
    allWorkspaces.forEach(ws => {
      const targets = extractHyperlinks(ws.titleHtmlContent);
      if (targets.length > 0) {
        const existing = childrenMap.get(ws.id) || new Set();
        targets.forEach(t => existing.add(t));
        childrenMap.set(ws.id, existing);
      }
    });

    // Track which workspaces are linked from at least one parent
    const hasParent = new Set<string>();

    childrenMap.forEach((childTitles, parentId) => {
      childTitles.forEach(childTitle => {
        const childWs = workspaceByTitle.get(childTitle);
        if (childWs && !childWs.isSystem) {
          hasParent.add(childWs.id);
        }
      });
    });

    // Build tree nodes recursively - allow same workspace to appear under multiple parents
    const buildNode = (ws: Workspace, depth: number, visited: Set<string>): TreeNode => {
      if (visited.has(ws.id)) {
        // Prevent cycles - return node without children
        return {
          id: ws.id,
          name: ws.title || extractTextFromHtml(ws.titleHtmlContent) || 'Untitled',
          type: ws.isSystem ? 'system' : 'workspace',
          workspace: ws,
          children: [],
          depth
        };
      }
      visited.add(ws.id);

      const childTitles = childrenMap.get(ws.id) || new Set();
      const children: TreeNode[] = [];

      // Add all linked workspaces as children (no restriction on single parent)
      childTitles.forEach(childTitle => {
        const childWs = workspaceByTitle.get(childTitle);
        if (childWs && !childWs.isSystem) {
          children.push(buildNode(childWs, depth + 1, new Set(visited)));
        }
      });

      // Sort children alphabetically
      children.sort((a, b) => a.name.localeCompare(b.name));

      return {
        id: ws.id,
        name: ws.title || extractTextFromHtml(ws.titleHtmlContent) || 'Untitled',
        type: ws.isSystem ? 'system' : 'workspace',
        workspace: ws,
        children,
        depth
      };
    };

    // Separate systems into main systems and backups
    const allSystems = allWorkspaces.filter(ws => ws.isSystem && !ws.deletedAt);
    const mainSystems = allSystems.filter(ws => !isBackup(ws));
    const backups = allSystems.filter(ws => isBackup(ws));

    // Build hierarchy only for main systems
    const rootNodes = mainSystems.map(sys => buildNode(sys, 0, new Set()));

    // Sort root nodes alphabetically (all are systems now)
    rootNodes.sort((a, b) => a.name.localeCompare(b.name));

    // Sort backups by name
    backups.sort((a, b) => {
      const nameA = a.title || extractTextFromHtml(a.titleHtmlContent) || 'Untitled';
      const nameB = b.title || extractTextFromHtml(b.titleHtmlContent) || 'Untitled';
      return nameA.localeCompare(nameB);
    });

    // Find orphan workspaces (not linked from any workspace and not a system)
    const orphans = allWorkspaces.filter(ws =>
      !ws.isSystem &&
      !ws.deletedAt &&
      !hasParent.has(ws.id)
    );

    // Sort orphans by name
    orphans.sort((a, b) => {
      const nameA = a.title || extractTextFromHtml(a.titleHtmlContent) || 'Untitled';
      const nameB = b.title || extractTextFromHtml(b.titleHtmlContent) || 'Untitled';
      return nameA.localeCompare(nameB);
    });

    return { mainHierarchy: rootNodes, backupSystems: backups, orphanedWorkspaces: orphans };
  }, [allWorkspaces, allElements]);

  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleOpenWorkspace = (workspace: Workspace) => {
    navigate(`/workspace/${workspace.id}?mode=view&returnTo=/manage-elements`);
  };

  const handleDelete = async () => {
    if (!selectedNode) return;

    const isSystem = selectedNode.type === 'system';

    // For systems, require password verification
    if (isSystem) {
      if (!deletePassword) {
        setDeleteError('Please enter your password');
        return;
      }

      const { success, error } = await verifyPassword(deletePassword);
      if (!success) {
        setDeleteError(error || 'Incorrect password');
        return;
      }
    }

    try {
      if (isSystem) {
        // Soft delete for systems
        await workspaceOperations.softDelete(selectedNode.workspace.id);
      } else {
        // Hard delete for non-system workspaces
        await workspaceOperations.delete(selectedNode.workspace.id);
      }

      await loadData();
      setShowDeleteDialog(false);
      setSelectedNode(null);
      setDeletePassword('');
      setDeleteError('');
    } catch (err) {
      console.error('Failed to delete:', err);
      setDeleteError('Failed to delete. Please try again.');
    }
  };

  const openDeleteDialog = (node: TreeNode) => {
    setSelectedNode(node);
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteDialog(true);
  };

  const loadDeletedSystems = async () => {
    try {
      const deleted = await workspaceOperations.getDeletedSystems();
      setDeletedSystems(deleted);
    } catch (err) {
      console.error('Failed to load deleted systems:', err);
    }
  };

  const openRetrieveDialog = async () => {
    await loadDeletedSystems();
    setShowRetrieveDialog(true);
  };

  const handleRetrieve = async (systemId: string) => {
    try {
      await workspaceOperations.restore(systemId);
      await loadData();
      await loadDeletedSystems();
    } catch (err) {
      console.error('Failed to restore system:', err);
    }
  };

  // Count total descendants
  const countDescendants = (node: TreeNode): number => {
    let count = node.children.length;
    node.children.forEach(child => {
      count += countDescendants(child);
    });
    return count;
  };

  // Toggle orphan selection
  const toggleOrphanSelection = (id: string) => {
    setSelectedOrphans(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all orphans
  const selectAllOrphans = () => {
    setSelectedOrphans(new Set(orphanedWorkspaces.map(w => w.id)));
  };

  // Deselect all orphans
  const deselectAllOrphans = () => {
    setSelectedOrphans(new Set());
  };

  // Delete selected orphans
  const [deletingOrphans, setDeletingOrphans] = useState(false);
  const deleteSelectedOrphans = async () => {
    if (selectedOrphans.size === 0) return;

    setDeletingOrphans(true);
    try {
      for (const id of selectedOrphans) {
        await workspaceOperations.delete(id);
      }
      setSelectedOrphans(new Set());
      await loadData();
    } catch (err) {
      console.error('Failed to delete orphans:', err);
    }
    setDeletingOrphans(false);
  };

  // Render a tree node
  const renderNode = (node: TreeNode): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const descendantCount = countDescendants(node);

    // Show folder icon if it's a system OR if it has children (is a parent)
    const isFolder = node.type === 'system' || hasChildren;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer ${
            selectedNode?.id === node.id ? 'bg-blue-50' : ''
          }`}
          style={{ paddingLeft: `${16 + node.depth * 24}px` }}
          onClick={() => setSelectedNode(node)}
        >
          {/* Expand/collapse button */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : (
            <span className="w-6" /> // Spacer
          )}

          {/* Icon - folder for systems or any workspace with children, file otherwise */}
          {isFolder ? (
            isExpanded ? (
              <FolderOpen className={`w-5 h-5 ${node.type === 'system' ? 'text-blue-500' : 'text-yellow-500'}`} />
            ) : (
              <Folder className={`w-5 h-5 ${node.type === 'system' ? 'text-blue-500' : 'text-yellow-500'}`} />
            )
          ) : (
            <FileText className="w-5 h-5 text-gray-400" />
          )}

          {/* Name */}
          <span className={`flex-1 ${node.type === 'system' ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>
            {node.name}
          </span>

          {/* Count badge for folders with children */}
          {hasChildren && (
            <span className="text-sm text-gray-400 mr-4">
              ({descendantCount})
            </span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenWorkspace(node.workspace)}
              title="Open workspace"
            >
              <Eye className="w-4 h-4 text-gray-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeleteDialog(node)}
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        {/* Render children if expanded */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoImg} alt="Bridge System App" className="h-10" />
          </div>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Manage System Elements</h1>
          <button
            onClick={openRetrieveDialog}
            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Retrieve Deleted Systems
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 mb-4">
          <button
            onClick={() => setActiveTab('systems')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'systems'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Systems & Workspaces
              <span className="text-xs text-gray-400">
                ({allWorkspaces.filter(w => w.isSystem && !w.deletedAt && !isBackup(w)).length})
              </span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'backups'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Backups
              <span className="text-xs text-gray-400">
                ({backupSystems.length})
              </span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('orphaned')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'orphaned'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Orphaned
              <span className="text-xs text-gray-400">
                ({orphanedWorkspaces.length})
              </span>
            </span>
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="text-center py-12 text-neutral-500">Loading...</div>
        ) : (
          <>
            {/* Systems & Workspaces Tab */}
            {activeTab === 'systems' && (
              mainHierarchy.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  No systems or workspaces found.
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                  {/* Tree */}
                  <div className="max-h-[600px] overflow-y-auto">
                    {mainHierarchy.map(node => renderNode(node))}
                  </div>
                </div>
              )
            )}

            {/* Backups Tab */}
            {activeTab === 'backups' && (
              backupSystems.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  No backups found.
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                  {/* Flat list of backups */}
                  <div className="max-h-[600px] overflow-y-auto">
                    {backupSystems.map(backup => {
                      const backupName = backup.title || extractTextFromHtml(backup.titleHtmlContent) || 'Untitled';
                      return (
                        <div
                          key={backup.id}
                          className={`flex items-center gap-2 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer ${
                            selectedNode?.workspace.id === backup.id ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedNode({
                            id: backup.id,
                            name: backupName,
                            type: 'system',
                            workspace: backup,
                            children: [],
                            depth: 0
                          })}
                        >
                          {/* Icon */}
                          <Folder className="w-5 h-5 text-orange-500" />

                          {/* Name */}
                          <span className="flex-1 text-gray-700">{backupName}</span>

                          {/* Actions */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenWorkspace(backup)}
                              title="Open backup"
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog({
                                id: backup.id,
                                name: backupName,
                                type: 'system',
                                workspace: backup,
                                children: [],
                                depth: 0
                              })}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}

            {/* Orphaned Tab */}
            {activeTab === 'orphaned' && (
              orphanedWorkspaces.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  No orphaned workspaces found.
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                  {/* Info banner */}
                  <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium">These workspaces are not linked from any system.</p>
                      <p className="text-red-600">Deleting them will not affect any system documentation.</p>
                    </div>
                  </div>
                  {/* Selection toolbar */}
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedOrphans.size === orphanedWorkspaces.length && orphanedWorkspaces.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              selectAllOrphans();
                            } else {
                              deselectAllOrphans();
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-600">Select All</span>
                      </label>
                      {selectedOrphans.size > 0 && (
                        <span className="text-sm text-gray-500">
                          ({selectedOrphans.size} selected)
                        </span>
                      )}
                    </div>
                    {selectedOrphans.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={deleteSelectedOrphans}
                        disabled={deletingOrphans}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deletingOrphans ? 'Deleting...' : `Delete ${selectedOrphans.size} Selected`}
                      </Button>
                    )}
                  </div>
                  {/* Flat list of orphaned workspaces */}
                  <div className="max-h-[500px] overflow-y-auto">
                    {orphanedWorkspaces.map(orphan => {
                      const orphanName = orphan.title || extractTextFromHtml(orphan.titleHtmlContent) || 'Untitled';
                      const isSelected = selectedOrphans.has(orphan.id);
                      return (
                        <div
                          key={orphan.id}
                          className={`flex items-center gap-2 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer ${
                            isSelected ? 'bg-red-50' : ''
                          }`}
                          onClick={() => toggleOrphanSelection(orphan.id)}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOrphanSelection(orphan.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />

                          {/* Icon */}
                          <FileText className="w-5 h-5 text-red-400" />

                          {/* Name */}
                          <span className="flex-1 text-gray-700">{orphanName}</span>

                          {/* Actions */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenWorkspace(orphan)}
                              title="Open workspace"
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog({
                                id: orphan.id,
                                name: orphanName,
                                type: 'workspace',
                                workspace: orphan,
                                children: [],
                                depth: 0
                              })}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </>
        )}
      </main>

      {/* Delete Dialog */}
      {showDeleteDialog && selectedNode && (() => {
        const isSystem = selectedNode.type === 'system';
        const hasChildren = selectedNode.children.length > 0;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-lg font-semibold mb-4">
                Delete {isSystem ? 'System' : 'Workspace'}
              </h2>

              {isSystem ? (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Warning: Deleting a System</p>
                      <p>You are about to delete "{selectedNode.name}".</p>
                      {hasChildren && (
                        <p className="mt-1">This system contains {countDescendants(selectedNode)} workspace(s).</p>
                      )}
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Please enter your password to confirm:
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2"
                      placeholder="Password"
                      autoFocus
                    />
                  </div>
                  {deleteError && (
                    <p className="text-red-500 text-sm mb-4">{deleteError}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-neutral-600 mb-4">
                    Are you sure you want to delete "{selectedNode.name}"?
                    This action cannot be undone.
                  </p>
                  {hasChildren && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800">
                        This workspace has {countDescendants(selectedNode)} linked workspace(s) that will become orphaned.
                      </p>
                    </div>
                  )}
                  {deleteError && (
                    <p className="text-red-500 text-sm mb-4">{deleteError}</p>
                  )}
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Retrieve Deleted Systems Dialog */}
      {showRetrieveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Retrieve Deleted Systems</h2>

            {deletedSystems.length === 0 ? (
              <p className="text-neutral-500 text-center py-8">
                No recently deleted systems found.
              </p>
            ) : (
              <div className="space-y-3 mb-4">
                {deletedSystems.map(system => (
                  <div
                    key={system.id}
                    className="flex items-center justify-between border border-neutral-200 rounded-lg p-3"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">
                        {system.title || extractTextFromHtml(system.titleHtmlContent) || 'Untitled'}
                      </p>
                      <p className="text-sm text-neutral-500">
                        Deleted {system.deletedAt ? new Date(system.deletedAt).toLocaleDateString() : 'recently'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetrieve(system.id)}
                      className="flex items-center gap-1"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowRetrieveDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
