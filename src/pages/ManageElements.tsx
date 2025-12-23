import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Table2, FileText, Folder, Upload, Database, Pencil, Trash2, AlertTriangle, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { workspaceOperations, elementOperations, type Workspace, type WorkspaceElement } from '../lib/supabase-db';
import { useAuth } from '../lib/auth-context';
import logoImg from '../assets/logo.png';

type ElementCategory = 'tables' | 'text' | 'workspaces' | 'uploads' | 'systems';

interface ElementUsage {
  element: WorkspaceElement | Workspace;
  elements?: (WorkspaceElement | Workspace)[]; // For grouped items (multiple elements with same name)
  usageCount: number;
  usedIn: string[];
  isActive: boolean;
  isExpanded?: boolean;
}

// Helper to extract hyperlink targets from HTML content
function extractHyperlinks(htmlContent: string | undefined): string[] {
  if (!htmlContent) return [];
  const targets: string[] = [];

  // Match data-workspace="..." patterns (how hyperlinks are stored in RichTextCell/SystemsTable)
  const regex1 = /data-workspace="([^"]+)"/g;
  let match;
  while ((match = regex1.exec(htmlContent)) !== null) {
    targets.push(match[1]);
  }

  // Also match data-workspace-link="..." patterns (how hyperlinks are stored in TextElement)
  const regex2 = /data-workspace-link="([^"]+)"/g;
  while ((match = regex2.exec(htmlContent)) !== null) {
    // Decode HTML entities (e.g., &amp; -> &)
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

// Helper to get display name from an element directly
function getElementDisplayName(el: WorkspaceElement | Workspace): string {
  if ('title' in el) {
    // It's a workspace
    return el.title || extractTextFromHtml(el.titleHtmlContent) || 'Untitled';
  } else {
    // It's an element
    if (el.type === 'systems-table') {
      const tableEl = el as any;
      return tableEl.name || extractTextFromHtml(tableEl.nameHtmlContent) || 'Unnamed Table';
    } else if (el.type === 'text') {
      return el.name || 'Unnamed Text';
    } else if (el.type === 'pdf') {
      return (el as any).fileName || el.name || 'Unnamed PDF';
    } else if (el.type === 'image') {
      return el.name || 'Unnamed Image';
    } else if (el.type === 'file') {
      return (el as any).fileName || el.name || 'Unnamed File';
    }
    return el.name || 'Unnamed';
  }
}

export function ManageElements() {
  const navigate = useNavigate();
  const { verifyPassword } = useAuth();
  const [activeCategory, setActiveCategory] = useState<ElementCategory>('tables');
  const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([]);
  const [allElements, setAllElements] = useState<WorkspaceElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ElementUsage | null>(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRetrieveDialog, setShowRetrieveDialog] = useState(false);
  const [deletedSystems, setDeletedSystems] = useState<Workspace[]>([]);
  const [newName, setNewName] = useState('');
  const [renameError, setRenameError] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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

  // Build a map of what links to what
  const buildUsageMap = () => {
    const usageMap: Map<string, { usedIn: string[]; isActive: boolean }> = new Map();

    // Check all elements for hyperlinks to workspaces
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
      targets.forEach(target => {
        const existing = usageMap.get(target) || { usedIn: [], isActive: false };
        // Find the workspace this element belongs to
        const parentWorkspace = allWorkspaces.find(w => w.id === element.workspaceId);
        const workspaceName = parentWorkspace?.title || parentWorkspace?.id || 'Unknown';
        if (!existing.usedIn.includes(workspaceName)) {
          existing.usedIn.push(workspaceName);
        }
        usageMap.set(target, existing);
      });
    });

    // Check workspace titles for hyperlinks
    allWorkspaces.forEach(workspace => {
      const targets = extractHyperlinks(workspace.titleHtmlContent);
      targets.forEach(target => {
        const existing = usageMap.get(target) || { usedIn: [], isActive: false };
        if (!existing.usedIn.includes(workspace.title || workspace.id)) {
          existing.usedIn.push(workspace.title || workspace.id);
        }
        usageMap.set(target, existing);
      });
    });

    return usageMap;
  };

  const getItemsForCategory = (): ElementUsage[] => {
    const usageMap = buildUsageMap();

    // Get set of valid workspace IDs for filtering orphaned elements
    const validWorkspaceIds = new Set(allWorkspaces.map(w => w.id));

    switch (activeCategory) {
      case 'tables': {
        // Filter out tables whose workspace no longer exists
        const tables = allElements.filter(e =>
          e.type === 'systems-table' &&
          (!e.workspaceId || validWorkspaceIds.has(e.workspaceId))
        );

        // Helper to find the system(s) that link to a workspace (via hyperlinks)
        const findParentSystems = (workspaceTitle: string): string[] => {
          const systems: string[] = [];
          // Look for systems that have a hyperlink to this workspace title
          for (const element of allElements) {
            const elementWorkspace = allWorkspaces.find(w => w.id === element.workspaceId);
            if (elementWorkspace?.isSystem && !elementWorkspace.deletedAt) {
              // Check if this system's elements contain a hyperlink to the workspace
              // The data structure varies by element type - need to stringify the whole element
              const htmlContent = JSON.stringify(element);
              // The JSON.stringify escapes quotes as \" which becomes \\" in the string
              const searchPattern = `data-workspace=\\"${workspaceTitle}\\"`;
              const altPattern = `data-workspace="${workspaceTitle}"`;

              if (htmlContent.includes(searchPattern) || htmlContent.includes(altPattern)) {
                const systemName = elementWorkspace.title || extractTextFromHtml(elementWorkspace.titleHtmlContent) || 'Unknown System';
                if (!systems.includes(systemName)) {
                  systems.push(systemName);
                }
              }
            }
          }
          return systems;
        };

        // Don't group tables - each table instance is independent
        // Show each table with its workspace location and parent system
        return tables.map(table => {
          const displayName = getElementDisplayName(table);
          const parentWorkspace = allWorkspaces.find(w => w.id === table.workspaceId);

          if (!parentWorkspace) {
            return {
              element: table,
              usageCount: 0,
              usedIn: [],
              isActive: false
            };
          }

          const workspaceName = parentWorkspace.title || extractTextFromHtml(parentWorkspace.titleHtmlContent) || '';
          const usedIn: string[] = [];

          // Build location string: "WorkspaceName (System1, System2)" or just "SystemName" if it's a system
          if (parentWorkspace.isSystem) {
            if (workspaceName) {
              usedIn.push(workspaceName);
            }
          } else {
            // Find which system(s) link to this workspace
            const parentSystems = findParentSystems(workspaceName);
            if (parentSystems.length > 0) {
              // Combine all parent systems into one entry
              usedIn.push(`${workspaceName} (${parentSystems.join(', ')})`);
            } else {
              // No parent system found, just show workspace name
              if (workspaceName) {
                usedIn.push(workspaceName);
              }
            }
          }

          return {
            element: table,
            usageCount: usedIn.length > 0 ? 1 : 0,
            usedIn,
            isActive: usedIn.length > 0
          };
        });
      }
      case 'text': {
        // Filter out text elements whose workspace no longer exists
        const texts = allElements.filter(e =>
          e.type === 'text' &&
          (!e.workspaceId || validWorkspaceIds.has(e.workspaceId))
        );
        return texts.map(text => {
          // A text element is "used" if it's placed on a workspace
          const parentWorkspace = allWorkspaces.find(w => w.id === text.workspaceId);
          const workspaceName = parentWorkspace?.title || extractTextFromHtml(parentWorkspace?.titleHtmlContent) || '';
          const isOnWorkspace = !!text.workspaceId && !!parentWorkspace;
          return {
            element: text,
            usageCount: isOnWorkspace ? 1 : 0,
            usedIn: isOnWorkspace && workspaceName ? [workspaceName] : [],
            isActive: isOnWorkspace
          };
        });
      }
      case 'workspaces': {
        // Non-system workspaces (linked workspaces created via hyperlink)
        const linkedWorkspaces = allWorkspaces.filter(w => !w.isSystem);
        return linkedWorkspaces.map(workspace => {
          const usage = usageMap.get(workspace.title) || { usedIn: [], isActive: false };
          return {
            element: workspace,
            usageCount: usage.usedIn.length,
            usedIn: usage.usedIn,
            isActive: usage.usedIn.length > 0
          };
        });
      }
      case 'uploads': {
        // Filter out uploads whose workspace no longer exists
        const uploads = allElements.filter(e =>
          (e.type === 'pdf' || e.type === 'image' || e.type === 'file') &&
          (!e.workspaceId || validWorkspaceIds.has(e.workspaceId))
        );
        return uploads.map(upload => {
          // An upload is "used" if it's placed on a workspace
          const parentWorkspace = allWorkspaces.find(w => w.id === upload.workspaceId);
          const workspaceName = parentWorkspace?.title || extractTextFromHtml(parentWorkspace?.titleHtmlContent) || '';
          const isOnWorkspace = !!upload.workspaceId && !!parentWorkspace;
          return {
            element: upload,
            usageCount: isOnWorkspace ? 1 : 0,
            usedIn: isOnWorkspace && workspaceName ? [workspaceName] : [],
            isActive: isOnWorkspace
          };
        });
      }
      case 'systems': {
        // Top-level systems
        const systems = allWorkspaces.filter(w => w.isSystem);
        return systems.map(system => ({
          element: system,
          usageCount: 0, // Systems are always "active" - they are the root
          usedIn: [],
          isActive: true // Systems are always active
        }));
      }
      default:
        return [];
    }
  };

  const getDisplayName = (item: ElementUsage): string => {
    const el = item.element;
    if ('title' in el) {
      // It's a workspace
      return el.title || extractTextFromHtml(el.titleHtmlContent) || 'Untitled';
    } else {
      // It's an element
      if (el.type === 'systems-table') {
        const tableEl = el as any;
        return tableEl.name || extractTextFromHtml(tableEl.nameHtmlContent) || 'Unnamed Table';
      } else if (el.type === 'text') {
        return el.name || 'Unnamed Text';
      } else if (el.type === 'pdf') {
        return (el as any).fileName || el.name || 'Unnamed PDF';
      } else if (el.type === 'image') {
        return el.name || 'Unnamed Image';
      } else if (el.type === 'file') {
        return (el as any).fileName || el.name || 'Unnamed File';
      }
      return el.name || 'Unnamed';
    }
  };

  const handleRename = async () => {
    if (!selectedItem || !newName.trim()) return;

    setRenameError('');

    try {
      const el = selectedItem.element;
      if ('title' in el) {
        // It's a workspace - update title and all hyperlinks pointing to old name
        const oldName = el.title || extractTextFromHtml(el.titleHtmlContent) || '';
        const trimmedNewName = newName.trim();

        // Update the workspace itself
        await workspaceOperations.update(el.id, {
          title: trimmedNewName,
          titleHtmlContent: `<span style="font-weight: 700">${trimmedNewName}</span>`
        });

        // Update all hyperlinks in elements that point to the old workspace name
        if (oldName && oldName !== trimmedNewName) {
          for (const element of allElements) {
            let updated = false;
            const updates: any = {};

            if (element.type === 'text') {
              let htmlContent = (element as any).htmlContent || '';
              const escapedOldName = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              // Also need to handle HTML-encoded version for data-workspace-link
              const htmlEncodedOldName = oldName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              const escapedHtmlEncodedOldName = htmlEncodedOldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const htmlEncodedNewName = trimmedNewName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

              // Update data-workspace attributes
              if (htmlContent.includes(`data-workspace="${oldName}"`)) {
                htmlContent = htmlContent.replace(
                  new RegExp(`data-workspace="${escapedOldName}"`, 'g'),
                  `data-workspace="${trimmedNewName}"`
                );
                updated = true;
              }
              // Update data-workspace-link attributes (may have HTML-encoded values)
              if (htmlContent.includes(`data-workspace-link="${oldName}"`) ||
                  htmlContent.includes(`data-workspace-link="${htmlEncodedOldName}"`)) {
                htmlContent = htmlContent.replace(
                  new RegExp(`data-workspace-link="${escapedOldName}"`, 'g'),
                  `data-workspace-link="${trimmedNewName}"`
                );
                htmlContent = htmlContent.replace(
                  new RegExp(`data-workspace-link="${escapedHtmlEncodedOldName}"`, 'g'),
                  `data-workspace-link="${htmlEncodedNewName}"`
                );
                updated = true;
              }
              if (updated) {
                updates.htmlContent = htmlContent;
              }
            } else if (element.type === 'systems-table') {
              // Update hyperlinks in table rows
              const rows = (element as any).initialRows || [];
              const updatedRows = updateHyperlinksInRows(rows, oldName, trimmedNewName);
              if (JSON.stringify(rows) !== JSON.stringify(updatedRows)) {
                updates.initialRows = updatedRows;
                updated = true;
              }

              // Also check nameHtmlContent
              const nameHtml = (element as any).nameHtmlContent || '';
              if (nameHtml.includes(`data-workspace="${oldName}"`)) {
                updates.nameHtmlContent = nameHtml.replace(
                  new RegExp(`data-workspace="${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
                  `data-workspace="${trimmedNewName}"`
                );
                updated = true;
              }
            }

            if (updated) {
              await elementOperations.update(element.id, updates);
            }
          }

          // Also update hyperlinks in workspace titles
          for (const workspace of allWorkspaces) {
            if (workspace.titleHtmlContent?.includes(`data-workspace="${oldName}"`)) {
              const newTitleHtml = workspace.titleHtmlContent.replace(
                new RegExp(`data-workspace="${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
                `data-workspace="${trimmedNewName}"`
              );
              await workspaceOperations.update(workspace.id, { titleHtmlContent: newTitleHtml });
            }
          }
        }
      } else {
        // It's an element - update name for all grouped elements
        const elementsToUpdate = selectedItem.elements || [el];
        for (const element of elementsToUpdate) {
          if (!('title' in element)) {
            await elementOperations.update(element.id, { name: newName.trim() });
          }
        }
      }

      await loadData();
      setShowRenameDialog(false);
      setSelectedItem(null);
      setNewName('');
    } catch (err) {
      console.error('Failed to rename:', err);
      setRenameError('Failed to rename. Please try again.');
    }
  };

  // Helper to recursively update hyperlinks in table rows
  const updateHyperlinksInRows = (rows: any[], oldName: string, newName: string): any[] => {
    const escapedOldName = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`data-workspace="${escapedOldName}"`, 'g');

    return rows.map(row => {
      const newRow = { ...row };

      if (row.meaningHtmlContent?.includes(`data-workspace="${oldName}"`)) {
        newRow.meaningHtmlContent = row.meaningHtmlContent.replace(regex, `data-workspace="${newName}"`);
      }
      if (row.bidHtmlContent?.includes(`data-workspace="${oldName}"`)) {
        newRow.bidHtmlContent = row.bidHtmlContent.replace(regex, `data-workspace="${newName}"`);
      }

      if (row.children && row.children.length > 0) {
        newRow.children = updateHyperlinksInRows(row.children, oldName, newName);
      }

      return newRow;
    });
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    const el = selectedItem.element;
    const isSystem = 'isSystem' in el && el.isSystem;

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
      if ('title' in el) {
        // It's a workspace
        if (isSystem) {
          // Soft delete for systems
          await workspaceOperations.softDelete(el.id);
        } else {
          // Hard delete for non-system workspaces
          await workspaceOperations.delete(el.id);
        }
      } else {
        // It's an element - delete all grouped elements
        const elementsToDelete = selectedItem.elements || [el];
        for (const element of elementsToDelete) {
          if (!('title' in element)) {
            await elementOperations.delete(element.id);
          }
        }
      }

      await loadData();
      setShowDeleteDialog(false);
      setSelectedItem(null);
      setDeletePassword('');
      setDeleteError('');
    } catch (err) {
      console.error('Failed to delete:', err);
      setDeleteError('Failed to delete. Please try again.');
    }
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

  const openRenameDialog = (item: ElementUsage) => {
    setSelectedItem(item);
    setNewName(getDisplayName(item));
    setRenameError('');
    setShowRenameDialog(true);
  };

  const openDeleteDialog = (item: ElementUsage) => {
    setSelectedItem(item);
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteDialog(true);
  };

  const categories: { id: ElementCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'tables', label: 'Tables', icon: <Table2 className="w-5 h-5" /> },
    { id: 'text', label: 'Text Elements', icon: <FileText className="w-5 h-5" /> },
    { id: 'workspaces', label: 'Workspaces', icon: <Folder className="w-5 h-5" /> },
    { id: 'uploads', label: 'Uploads', icon: <Upload className="w-5 h-5" /> },
    { id: 'systems', label: 'Systems', icon: <Database className="w-5 h-5" /> },
  ];

  const items = getItemsForCategory();

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
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">Manage System Elements</h1>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 border-b border-neutral-200 pb-4">
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? 'default' : 'outline'}
              onClick={() => setActiveCategory(cat.id)}
              className="flex items-center gap-2"
            >
              {cat.icon}
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Elements List */}
        {loading ? (
          <div className="text-center py-12 text-neutral-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            No {activeCategory} found.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-neutral-600">Usage</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const displayName = getDisplayName(item);
                  const isUnused = item.usageCount === 0 && activeCategory !== 'systems';

                  return (
                    <tr
                      key={item.element.id}
                      className={`border-b border-neutral-100 last:border-0 ${isUnused ? 'bg-neutral-50' : ''}`}
                    >
                      <td className={`px-4 py-3 ${isUnused ? 'text-neutral-400' : 'text-neutral-900'}`}>
                        {displayName}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-500">
                        {activeCategory === 'systems' ? (
                          <span className="text-green-600">Active System</span>
                        ) : item.usageCount > 0 ? (
                          <div>
                            <span>
                              Used in {item.usageCount} place{item.usageCount !== 1 ? 's' : ''}
                            </span>
                            {item.usedIn.length > 0 && (
                              <div className="mt-1">
                                {item.usedIn.length <= 2 ? (
                                  <span className="text-neutral-400">
                                    ({item.usedIn.join(', ')})
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        const newExpanded = new Set(expandedItems);
                                        if (newExpanded.has(item.element.id)) {
                                          newExpanded.delete(item.element.id);
                                        } else {
                                          newExpanded.add(item.element.id);
                                        }
                                        setExpandedItems(newExpanded);
                                      }}
                                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                      {expandedItems.has(item.element.id) ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                      {expandedItems.has(item.element.id) ? 'Hide locations' : 'Show locations'}
                                    </button>
                                    {expandedItems.has(item.element.id) && (
                                      <ul className="mt-1 ml-5 text-neutral-400 list-disc">
                                        {item.usedIn.map((location, idx) => (
                                          <li key={idx}>{location}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400">Not used</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRenameDialog(item)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(item)}
                            disabled={item.isActive && activeCategory !== 'systems'}
                            className={item.isActive && activeCategory !== 'systems' ? 'opacity-50 cursor-not-allowed' : ''}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Retrieve Deleted Button - only shown for systems tab */}
        {activeCategory === 'systems' && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={openRetrieveDialog}
              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Retrieve Deleted Systems
            </button>
          </div>
        )}
      </main>

      {/* Rename Dialog */}
      {showRenameDialog && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Rename</h2>

            {selectedItem.usageCount > 1 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  The new name will be displayed wherever it is called ({selectedItem.usageCount} places).
                  Confirm to proceed.
                </p>
              </div>
            )}

            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 mb-4"
              placeholder="Enter new name"
              autoFocus
            />

            {renameError && (
              <p className="text-red-500 text-sm mb-4">{renameError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename}>
                Rename
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {showDeleteDialog && selectedItem && (() => {
        const isSystem = 'isSystem' in selectedItem.element && selectedItem.element.isSystem;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-lg font-semibold mb-4">
                {isSystem ? 'Delete System' : 'Delete'}
              </h2>

              {selectedItem.isActive && activeCategory !== 'systems' ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800">
                    This element is currently active and cannot be deleted.
                    It is linked from {selectedItem.usageCount} place{selectedItem.usageCount !== 1 ? 's' : ''}.
                  </p>
                </div>
              ) : isSystem ? (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Warning: Deleting a System</p>
                      <p>You are about to delete "{getDisplayName(selectedItem)}". This will remove the system and all its contents.</p>
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
                <p className="text-neutral-600 mb-4">
                  Are you sure you want to delete "{getDisplayName(selectedItem)}"?
                  This action cannot be undone.
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                {(!selectedItem.isActive || activeCategory === 'systems') && (
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                )}
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
