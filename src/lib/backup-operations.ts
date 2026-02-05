/**
 * Backup Operations Module
 *
 * Provides functionality to create complete backups of a system workspace
 * including all linked workspaces with hyperlinks rewritten to point to backup copies.
 */

import { supabase } from './supabase';
import {
  workspaceOperations,
  elementOperations,
  type Workspace,
  type WorkspaceElement,
  type SystemsTableElement,
  type TextElement,
  type RowData,
} from './supabase-db';

export interface BackupResult {
  success: boolean;
  backupGroupId?: string;
  backupSystemId?: string;
  error?: string;
}

// =====================
// HYPERLINK EXTRACTION
// =====================

/**
 * Extract workspace names from hyperlinks in HTML content.
 * Hyperlinks are stored as:
 * - data-workspace="WorkspaceName" (in RichTextCell/SystemsTable)
 * - data-workspace-link="WorkspaceName" (in TextElement)
 */
function extractHyperlinksFromHtml(htmlContent: string | undefined): string[] {
  if (!htmlContent) return [];
  const targets: string[] = [];

  // Match data-workspace="..." patterns
  const regex1 = /data-workspace="([^"]+)"/g;
  let match;
  while ((match = regex1.exec(htmlContent)) !== null) {
    targets.push(match[1]);
  }

  // Match data-workspace-link="..." patterns
  const regex2 = /data-workspace-link="([^"]+)"/g;
  while ((match = regex2.exec(htmlContent)) !== null) {
    // Decode HTML entities
    const decoded = match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    targets.push(decoded);
  }

  return targets;
}

/**
 * Extract all HTML content from an element (including nested rows in tables).
 */
function extractAllHtmlFromElement(element: WorkspaceElement): string {
  let html = '';

  if (element.type === 'text') {
    const textEl = element as TextElement;
    html += textEl.htmlContent || '';
  } else if (element.type === 'systems-table') {
    const tableEl = element as SystemsTableElement;
    if (tableEl.initialRows) {
      html += extractHtmlFromRows(tableEl.initialRows);
    }
    html += tableEl.nameHtmlContent || '';
  }

  return html;
}

/**
 * Recursively extract HTML from table rows (including nested children).
 */
function extractHtmlFromRows(rows: RowData[]): string {
  let html = '';
  for (const row of rows) {
    html += row.meaningHtmlContent || '';
    html += row.bidHtmlContent || '';
    if (row.children && row.children.length > 0) {
      html += extractHtmlFromRows(row.children);
    }
  }
  return html;
}

// =====================
// WORKSPACE HIERARCHY
// =====================

/**
 * Workspace hierarchy entry showing parent-child relationships based on hyperlinks.
 */
export interface WorkspaceHierarchyEntry {
  workspaceId: string;
  workspaceName: string;
  isSystem: boolean;
  children: string[]; // Names of workspaces this workspace links to (direct children only)
}

/**
 * Build a map of workspace hierarchies by analyzing hyperlinks in all workspace elements.
 * Returns a map from workspace name to its hierarchy entry.
 */
export async function buildWorkspaceHierarchy(
  allWorkspaces: Workspace[]
): Promise<Map<string, WorkspaceHierarchyEntry>> {
  const hierarchy = new Map<string, WorkspaceHierarchyEntry>();

  // Initialize entries for all non-backup workspaces
  for (const ws of allWorkspaces) {
    // Skip backup workspaces
    if (ws.backupOf || ws.backupGroupId) continue;
    if (!ws.title) continue;

    hierarchy.set(ws.title, {
      workspaceId: ws.id,
      workspaceName: ws.title,
      isSystem: ws.type === 'bidding_system',
      children: []
    });
  }

  // For each workspace, find what it links to
  for (const ws of allWorkspaces) {
    // Skip backup workspaces
    if (ws.backupOf || ws.backupGroupId) continue;
    if (!ws.title) continue;

    const entry = hierarchy.get(ws.title);
    if (!entry) continue;

    // Get all elements in this workspace
    const elements = await elementOperations.getByWorkspaceId(ws.id);

    // Extract hyperlinks from all elements
    const linkedNames = new Set<string>();
    for (const element of elements) {
      const htmlContent = extractAllHtmlFromElement(element);
      const links = extractHyperlinksFromHtml(htmlContent);
      links.forEach(name => linkedNames.add(name));
    }

    // Add valid children (workspaces that exist in our hierarchy)
    for (const name of linkedNames) {
      if (hierarchy.has(name) && name !== ws.title) {
        entry.children.push(name);
      }
    }
  }

  return hierarchy;
}

// =====================
// WORKSPACE TRAVERSAL
// =====================

/**
 * Find all workspaces linked from the given system workspace.
 * Uses BFS to traverse hyperlinks and find all transitively linked workspaces.
 */
async function findAllLinkedWorkspaces(
  systemWorkspaceId: string,
  allWorkspaces: Workspace[]
): Promise<Set<string>> {
  const visited = new Set<string>();
  const workspaceQueue: string[] = [systemWorkspaceId];

  // Build workspace title-to-id map (only non-backup workspaces)
  const titleToWorkspace = new Map<string, Workspace>();
  for (const ws of allWorkspaces) {
    // Skip backup workspaces
    if (ws.backupOf || ws.backupGroupId) continue;
    if (ws.title) {
      titleToWorkspace.set(ws.title, ws);
    }
  }

  while (workspaceQueue.length > 0) {
    const currentId = workspaceQueue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Get all elements in this workspace
    const elements = await elementOperations.getByWorkspaceId(currentId);

    // Extract hyperlinks from all elements
    const linkedNames = new Set<string>();
    for (const element of elements) {
      const htmlContent = extractAllHtmlFromElement(element);
      const links = extractHyperlinksFromHtml(htmlContent);
      links.forEach(name => linkedNames.add(name));
    }

    // Queue linked workspaces that haven't been visited
    for (const name of linkedNames) {
      const linkedWs = titleToWorkspace.get(name);
      if (linkedWs && !visited.has(linkedWs.id)) {
        workspaceQueue.push(linkedWs.id);
      }
    }
  }

  return visited;
}

// =====================
// HYPERLINK REWRITING
// =====================

/**
 * Rewrite hyperlinks in HTML content to point to backup workspace names.
 */
function rewriteHyperlinks(html: string, nameMapping: Map<string, string>): string {
  let result = html;

  for (const [originalName, backupName] of nameMapping) {
    // Escape special regex characters in the name
    const escapedOriginal = originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Rewrite data-workspace attributes
    result = result.replace(
      new RegExp(`data-workspace="${escapedOriginal}"`, 'g'),
      `data-workspace="${backupName}"`
    );

    // Rewrite data-workspace-link attributes
    result = result.replace(
      new RegExp(`data-workspace-link="${escapedOriginal}"`, 'g'),
      `data-workspace-link="${backupName}"`
    );

    // Handle HTML-encoded versions
    const htmlEncodedOriginal = originalName.replace(/&/g, '&amp;');
    const htmlEncodedBackup = backupName.replace(/&/g, '&amp;');
    if (htmlEncodedOriginal !== originalName) {
      result = result.replace(
        new RegExp(`data-workspace-link="${htmlEncodedOriginal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
        `data-workspace-link="${htmlEncodedBackup}"`
      );
    }
  }

  return result;
}

/**
 * Recursively rewrite hyperlinks in table rows.
 */
function rewriteRowHyperlinks(rows: RowData[], nameMapping: Map<string, string>): RowData[] {
  return rows.map(row => ({
    ...row,
    meaningHtmlContent: row.meaningHtmlContent
      ? rewriteHyperlinks(row.meaningHtmlContent, nameMapping)
      : undefined,
    bidHtmlContent: row.bidHtmlContent
      ? rewriteHyperlinks(row.bidHtmlContent, nameMapping)
      : undefined,
    children: row.children ? rewriteRowHyperlinks(row.children, nameMapping) : [],
  }));
}

/**
 * Copy an element with hyperlinks rewritten to point to backup workspaces.
 */
function copyElementWithRewrittenLinks(
  element: WorkspaceElement,
  newWorkspaceId: string,
  nameMapping: Map<string, string>
): WorkspaceElement {
  const newElement = {
    ...element,
    id: crypto.randomUUID(),
    workspaceId: newWorkspaceId,
  };

  // Rewrite hyperlinks based on element type
  if (element.type === 'text') {
    const textEl = newElement as TextElement;
    if (textEl.htmlContent) {
      textEl.htmlContent = rewriteHyperlinks(textEl.htmlContent, nameMapping);
    }
  } else if (element.type === 'systems-table') {
    const tableEl = newElement as SystemsTableElement;
    if (tableEl.initialRows) {
      tableEl.initialRows = rewriteRowHyperlinks(tableEl.initialRows, nameMapping);
    }
    if (tableEl.nameHtmlContent) {
      tableEl.nameHtmlContent = rewriteHyperlinks(tableEl.nameHtmlContent, nameMapping);
    }
  }

  return newElement;
}

// =====================
// AUTH HELPER
// =====================

async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}

// =====================
// BACKUP CREATION
// =====================

/**
 * Create a backup workspace with metadata.
 */
async function createBackupWorkspace(
  original: Workspace,
  backupName: string,
  backupGroupId: string,
  backupOf: string,
  isBackupSystem: boolean
): Promise<Workspace> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      user_id: userId,
      title: backupName,
      title_html_content: original.titleHtmlContent,
      title_text_align: original.titleTextAlign,
      border_color: original.borderColor || '#000000',
      border_width: original.borderWidth || 1,
      background_color: original.backgroundColor || 'white',
      canvas_width: original.canvasWidth || 794,
      canvas_height: original.canvasHeight || 1123,
      partners: original.partners,
      type: isBackupSystem ? 'bidding_system' : 'user_defined', // Only the main backup workspace is a "system"
      backup_group_id: backupGroupId,
      backup_of: backupOf,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    titleHtmlContent: data.title_html_content || undefined,
    titleTextAlign: data.title_text_align || undefined,
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: new Date(data.updated_at).getTime(),
    borderColor: data.border_color || undefined,
    borderWidth: data.border_width || undefined,
    backgroundColor: data.background_color || undefined,
    canvasWidth: data.canvas_width || undefined,
    canvasHeight: data.canvas_height || undefined,
    partners: data.partners || undefined,
    type: data.type,
    backupGroupId: data.backup_group_id || undefined,
    backupOf: data.backup_of || undefined,
  };
}

/**
 * Format a timestamp for backup naming.
 * Returns format: "Dec 21 2:30pm"
 */
function formatBackupTimestamp(): string {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[now.getMonth()];
  const day = now.getDate();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12

  return `${month} ${day} ${hours}:${minutes}${ampm}`;
}

/**
 * Create a complete backup of a system workspace and all its linked workspaces.
 */
export async function createSystemBackup(systemWorkspaceId: string): Promise<BackupResult> {
  const backupGroupId = crypto.randomUUID();
  const timestamp = formatBackupTimestamp();

  try {
    // Step 1: Get the system workspace
    const systemWorkspace = await workspaceOperations.getById(systemWorkspaceId);
    if (!systemWorkspace) {
      return { success: false, error: 'System workspace not found' };
    }
    if (systemWorkspace.type !== 'bidding_system') {
      return { success: false, error: 'Can only backup system workspaces' };
    }
    // Don't backup backups
    if (systemWorkspace.backupOf || systemWorkspace.backupGroupId) {
      return { success: false, error: 'Cannot backup a backup' };
    }

    // Step 2: Get all workspaces
    const allWorkspaces = await workspaceOperations.getAll();

    // Step 3: Find all transitively linked workspaces
    const linkedWorkspaceIds = await findAllLinkedWorkspaces(systemWorkspaceId, allWorkspaces);

    // Step 4: Build mapping from original names to backup names
    const nameMapping = new Map<string, string>();
    const idMapping = new Map<string, string>(); // original ID -> backup ID

    // Create backup name for the system
    const systemBackupName = `${systemWorkspace.title} Backup ${timestamp}`;
    nameMapping.set(systemWorkspace.title, systemBackupName);

    // Step 5: Create backup workspaces
    const workspacesToBackup = allWorkspaces.filter(ws =>
      linkedWorkspaceIds.has(ws.id) && !ws.backupOf && !ws.backupGroupId
    );

    // Create backup names for all linked workspaces first
    for (const originalWs of workspacesToBackup) {
      if (originalWs.id !== systemWorkspaceId) {
        const backupName = `${originalWs.title} [Backup ${timestamp}]`;
        nameMapping.set(originalWs.title, backupName);
      }
    }

    // Now create the backup workspaces
    let backupSystemWorkspace: Workspace | null = null;

    for (const originalWs of workspacesToBackup) {
      const isSystem = originalWs.id === systemWorkspaceId;
      const backupName = nameMapping.get(originalWs.title)!;

      // Create the backup workspace
      const backupWs = await createBackupWorkspace(
        originalWs,
        backupName,
        backupGroupId,
        systemWorkspaceId, // All backups reference the original system
        isSystem
      );
      idMapping.set(originalWs.id, backupWs.id);

      if (isSystem) {
        backupSystemWorkspace = backupWs;
      }
    }

    // Step 6: Deep copy elements with hyperlink rewriting
    for (const originalWs of workspacesToBackup) {
      const backupWsId = idMapping.get(originalWs.id)!;
      const elements = await elementOperations.getByWorkspaceId(originalWs.id);

      for (const element of elements) {
        const backupElement = copyElementWithRewrittenLinks(
          element,
          backupWsId,
          nameMapping
        );
        await elementOperations.create(backupElement);
      }
    }

    // Step 7: Clean up old backups (keep only 3)
    await cleanupOldBackups(systemWorkspaceId);

    return {
      success: true,
      backupGroupId,
      backupSystemId: backupSystemWorkspace?.id,
    };

  } catch (error) {
    console.error('Backup creation failed:', error);
    return { success: false, error: String(error) };
  }
}

// =====================
// BACKUP CLEANUP
// =====================

/**
 * Get all backup system workspaces for a given original system.
 * Returns oldest first.
 */
async function getBackupsForSystem(systemWorkspaceId: string): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('backup_of', systemWorkspaceId)
    .eq('type', 'bidding_system') // Only get the backup "root" workspaces
    .order('created_at', { ascending: true }); // Oldest first

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    title: row.title,
    titleHtmlContent: row.title_html_content || undefined,
    titleTextAlign: row.title_text_align || undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    borderColor: row.border_color || undefined,
    borderWidth: row.border_width || undefined,
    backgroundColor: row.background_color || undefined,
    canvasWidth: row.canvas_width || undefined,
    canvasHeight: row.canvas_height || undefined,
    partners: row.partners || undefined,
    type: row.type,
    backupGroupId: row.backup_group_id || undefined,
    backupOf: row.backup_of || undefined,
  }));
}

/**
 * Delete an entire backup group (system + all linked workspace copies).
 */
async function deleteBackupGroup(backupGroupId: string): Promise<void> {
  // Get all workspaces in this backup group
  const { data: workspaces, error: fetchError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('backup_group_id', backupGroupId);

  if (fetchError) throw fetchError;

  // Delete each workspace (elements cascade via FK)
  for (const ws of workspaces || []) {
    const { error: deleteError } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', ws.id);

    if (deleteError) {
      console.error('Failed to delete backup workspace:', ws.id, deleteError);
    }
  }
}

/**
 * Clean up old backups, keeping only the 3 most recent.
 */
async function cleanupOldBackups(systemWorkspaceId: string): Promise<void> {
  const backups = await getBackupsForSystem(systemWorkspaceId);

  // Keep only the 3 most recent backups (oldest are at the beginning)
  while (backups.length > 3) {
    const oldestBackup = backups.shift()!;
    if (oldestBackup.backupGroupId) {
      await deleteBackupGroup(oldestBackup.backupGroupId);
    }
  }
}

// =====================
// BACKUP INFO
// =====================

export interface LastBackupInfo {
  title: string;
  createdAt: Date;
}

/**
 * Get information about the most recent backup for a system workspace.
 * Returns null if no backups exist.
 */
export async function getLastBackupForSystem(systemWorkspaceId: string): Promise<LastBackupInfo | null> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('title, created_at')
    .eq('backup_of', systemWorkspaceId)
    .eq('type', 'bidding_system')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    title: data.title,
    createdAt: new Date(data.created_at),
  };
}
