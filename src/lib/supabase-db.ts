import { supabase } from './supabase';
import type {
  WorkspaceRow,
  WorkspaceInsert,
  WorkspaceUpdate,
  ElementRow,
  ElementInsert,
  ElementUpdate,
  Partner,
  ElementData,
  SystemsTableData,
  TextData,
  ImageData,
  PdfData,
  FileData,
} from './supabase-types';

// Re-export types for compatibility with existing code
export type {
  Partner,
  ElementData,
  SystemsTableData,
  TextData,
  ImageData,
  PdfData,
  FileData,
};

// Legacy interface compatibility types
export interface Workspace {
  id: string;
  title: string;
  titleHtmlContent?: string;
  titleTextAlign?: string;
  createdAt: number;
  updatedAt: number;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  leftMargin?: number;
  topMargin?: number;
  partners?: Partner[];
  isSystem: boolean; // true = top-level system (created via button), false = linked workspace (created via hyperlink)
  deletedAt?: number; // Timestamp when soft-deleted, undefined if not deleted
  backupGroupId?: string; // Groups all workspaces belonging to the same backup
  backupOf?: string; // References the original system workspace this backup was created from
}

export interface BaseElement {
  id: string;
  workspaceId: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  borderColor?: string;
  borderWidth?: number;
  fillColor?: string;
  isManuallyPositioned?: boolean;
  name?: string;
}

export interface SystemsTableElement extends BaseElement {
  type: 'systems-table';
  initialRows?: any[];
  gridlines?: {
    enabled: boolean;
    color: string;
    width: number;
    style?: 'solid' | 'dashed' | 'dotted' | 'double';
  };
  levelWidths?: { [level: number]: number };
  meaningWidth?: number;
  showName?: boolean;
  nameHtmlContent?: string;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content?: string;
  htmlContent?: string;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  alt?: string;
}

export interface PdfElement extends BaseElement {
  type: 'pdf';
  fileName: string;
  currentPage: number;
  totalPages: number;
  pageImages: string[];
  backgroundColor?: string;
}

export interface FileElement extends BaseElement {
  type: 'file';
  fileName: string;
  fileSize?: number;
  fileType?: string;
}

export type WorkspaceElement = SystemsTableElement | TextElement | ImageElement | PdfElement | FileElement;

// RowData for SystemsTable
export interface RowData {
  id: string;
  bid: string;
  bidHtmlContent?: string;
  bidFillColor?: string;
  meaning: string;
  meaningHtmlContent?: string;
  children: RowData[];
  collapsed?: boolean;
}

// =====================
// CONVERSION HELPERS
// =====================

function workspaceFromRow(row: WorkspaceRow): Workspace {
  return {
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
    leftMargin: row.left_margin ?? undefined,
    topMargin: row.top_margin ?? undefined,
    partners: row.partners || undefined,
    isSystem: row.is_system ?? true, // Default to true for backward compatibility
    deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : undefined,
    backupGroupId: row.backup_group_id || undefined,
    backupOf: row.backup_of || undefined,
  };
}

function elementFromRow(row: ElementRow): WorkspaceElement {
  const base: BaseElement = {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type,
    position: row.position,
    size: row.size,
    zIndex: row.z_index,
    borderColor: row.border_color || undefined,
    borderWidth: row.border_width || undefined,
    fillColor: row.fill_color || undefined,
    isManuallyPositioned: row.is_manually_positioned || undefined,
    name: row.name || undefined,
  };

  const data = row.data as ElementData;

  switch (row.type) {
    case 'systems-table': {
      const stData = data as SystemsTableData;
      return {
        ...base,
        type: 'systems-table',
        initialRows: stData.initialRows,
        gridlines: stData.gridlines,
        levelWidths: stData.levelWidths,
        meaningWidth: stData.meaningWidth,
        showName: stData.showName,
        nameHtmlContent: stData.nameHtmlContent,
      } as SystemsTableElement;
    }
    case 'text': {
      const tData = data as TextData;
      return {
        ...base,
        type: 'text',
        content: tData.content,
        htmlContent: tData.htmlContent,
      } as TextElement;
    }
    case 'image': {
      const iData = data as ImageData;
      return {
        ...base,
        type: 'image',
        src: iData.src,
        alt: iData.alt,
      } as ImageElement;
    }
    case 'pdf': {
      const pData = data as PdfData;
      return {
        ...base,
        type: 'pdf',
        fileName: pData.fileName,
        currentPage: pData.currentPage,
        totalPages: pData.totalPages,
        pageImages: pData.pageImages,
        backgroundColor: pData.backgroundColor,
      } as PdfElement;
    }
    case 'file': {
      const fData = data as FileData;
      return {
        ...base,
        type: 'file',
        fileName: fData.fileName,
        fileSize: fData.fileSize,
        fileType: fData.fileType,
      } as FileElement;
    }
    default:
      return base as WorkspaceElement;
  }
}

function elementToInsert(element: WorkspaceElement, userId: string): ElementInsert {
  let data: ElementData = {};

  switch (element.type) {
    case 'systems-table': {
      const st = element as SystemsTableElement;
      data = {
        initialRows: st.initialRows,
        gridlines: st.gridlines,
        levelWidths: st.levelWidths,
        meaningWidth: st.meaningWidth,
        showName: st.showName,
        nameHtmlContent: st.nameHtmlContent,
      };
      break;
    }
    case 'text': {
      const t = element as TextElement;
      data = {
        content: t.content,
        htmlContent: t.htmlContent,
      };
      break;
    }
    case 'image': {
      const i = element as ImageElement;
      data = {
        src: i.src,
        alt: i.alt,
      };
      break;
    }
    case 'pdf': {
      const p = element as PdfElement;
      data = {
        fileName: p.fileName,
        currentPage: p.currentPage,
        totalPages: p.totalPages,
        pageImages: p.pageImages,
        backgroundColor: p.backgroundColor,
      };
      break;
    }
    case 'file': {
      const f = element as FileElement;
      data = {
        fileName: f.fileName,
        fileSize: f.fileSize,
        fileType: f.fileType,
      };
      break;
    }
  }

  return {
    id: element.id,
    workspace_id: element.workspaceId,
    type: element.type as any,
    position: element.position,
    size: element.size,
    z_index: element.zIndex,
    border_color: element.borderColor,
    border_width: element.borderWidth,
    fill_color: element.fillColor,
    is_manually_positioned: element.isManuallyPositioned,
    name: element.name,
    data,
  };
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
// WORKSPACE OPERATIONS
// =====================

export const workspaceOperations = {
  /**
   * Create a new workspace.
   * @param title - The title of the workspace
   * @param isSystem - true for top-level systems (created via button), false for linked workspaces (created via hyperlink)
   */
  async create(title: string, isSystem: boolean = true): Promise<Workspace> {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        user_id: userId,
        title,
        border_color: '#000000',
        border_width: 1,
        background_color: 'white',
        canvas_width: 794,
        canvas_height: 1123,
        is_system: isSystem,
      })
      .select()
      .single();

    if (error) throw error;
    return workspaceFromRow(data);
  },

  async getAll(): Promise<Workspace[]> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(workspaceFromRow);
  },

  /**
   * Get only top-level systems (created via "Create New System" button).
   * Used by OpenSystemDialog to show only systems, not linked workspaces.
   */
  async getSystems(): Promise<Workspace[]> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('is_system', true)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(workspaceFromRow);
  },

  /**
   * Get recently deleted systems (last 3).
   * Used by ManageElements page to show retrievable systems.
   */
  async getDeletedSystems(): Promise<Workspace[]> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('is_system', true)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(3);

    if (error) throw error;
    return (data || []).map(workspaceFromRow);
  },

  async getById(id: string): Promise<Workspace | undefined> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    return data ? workspaceFromRow(data) : undefined;
  },

  /**
   * Get a workspace by its title. Returns the most recently updated workspace with this title.
   * Used by hyperlink navigation to find existing workspaces before creating new ones.
   */
  async getByTitle(title: string): Promise<Workspace | undefined> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('title', title)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    return data ? workspaceFromRow(data) : undefined;
  },

  async update(id: string, updates: Partial<Workspace>): Promise<void> {
    const dbUpdates: WorkspaceUpdate = {};

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.titleHtmlContent !== undefined) dbUpdates.title_html_content = updates.titleHtmlContent;
    if (updates.titleTextAlign !== undefined) dbUpdates.title_text_align = updates.titleTextAlign;
    if (updates.borderColor !== undefined) dbUpdates.border_color = updates.borderColor;
    if (updates.borderWidth !== undefined) dbUpdates.border_width = updates.borderWidth;
    if (updates.backgroundColor !== undefined) dbUpdates.background_color = updates.backgroundColor;
    if (updates.canvasWidth !== undefined) dbUpdates.canvas_width = updates.canvasWidth;
    if (updates.canvasHeight !== undefined) dbUpdates.canvas_height = updates.canvasHeight;
    if (updates.leftMargin !== undefined) dbUpdates.left_margin = updates.leftMargin;
    if (updates.topMargin !== undefined) dbUpdates.top_margin = updates.topMargin;
    if (updates.partners !== undefined) dbUpdates.partners = updates.partners;

    const { error } = await supabase
      .from('workspaces')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    // Elements are deleted automatically via CASCADE
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Soft delete a system (mark as deleted but keep in database).
   * Only keeps the last 3 deleted systems - permanently deletes older ones.
   */
  async softDelete(id: string): Promise<void> {
    // First, soft delete the system
    const { error } = await supabase
      .from('workspaces')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    // Now clean up old deleted systems - keep only the last 3
    const userId = await getCurrentUserId();

    // Get all deleted systems ordered by deleted_at desc
    const { data: deletedSystems, error: fetchError } = await supabase
      .from('workspaces')
      .select('id, deleted_at')
      .eq('user_id', userId)
      .eq('is_system', true)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (fetchError) throw fetchError;

    // If more than 3 deleted systems, permanently delete the older ones
    if (deletedSystems && deletedSystems.length > 3) {
      const idsToDelete = deletedSystems.slice(3).map(s => s.id);

      for (const deleteId of idsToDelete) {
        // Permanently delete (elements are deleted via CASCADE)
        const { error: deleteError } = await supabase
          .from('workspaces')
          .delete()
          .eq('id', deleteId);

        if (deleteError) {
          console.error('Failed to permanently delete old system:', deleteId, deleteError);
        }
      }
    }
  },

  /**
   * Restore a soft-deleted system.
   */
  async restore(id: string): Promise<void> {
    const { error } = await supabase
      .from('workspaces')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) throw error;
  },
};

// =====================
// ELEMENT OPERATIONS
// =====================

export const elementOperations = {
  async create(element: WorkspaceElement): Promise<void> {
    const userId = await getCurrentUserId();
    const insert = elementToInsert(element, userId);

    const { error } = await supabase
      .from('elements')
      .insert(insert);

    if (error) throw error;
  },

  async getAll(): Promise<WorkspaceElement[]> {
    const { data, error } = await supabase
      .from('elements')
      .select('*');

    if (error) throw error;
    return (data || []).map(elementFromRow);
  },

  async getByWorkspaceId(workspaceId: string): Promise<WorkspaceElement[]> {
    const { data, error } = await supabase
      .from('elements')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('z_index', { ascending: true });

    if (error) throw error;
    return (data || []).map(elementFromRow);
  },

  async update(id: string, updates: Partial<WorkspaceElement>): Promise<void> {
    const dbUpdates: ElementUpdate = {};

    if (updates.position !== undefined) dbUpdates.position = updates.position;
    if (updates.size !== undefined) dbUpdates.size = updates.size;
    if (updates.zIndex !== undefined) dbUpdates.z_index = updates.zIndex;
    if (updates.borderColor !== undefined) dbUpdates.border_color = updates.borderColor;
    if (updates.borderWidth !== undefined) dbUpdates.border_width = updates.borderWidth;
    if (updates.fillColor !== undefined) dbUpdates.fill_color = updates.fillColor;
    if (updates.isManuallyPositioned !== undefined) dbUpdates.is_manually_positioned = updates.isManuallyPositioned;
    if (updates.name !== undefined) dbUpdates.name = updates.name;

    // Handle type-specific data updates
    const dataUpdates: Record<string, any> = {};

    // SystemsTable fields
    if ('initialRows' in updates) dataUpdates.initialRows = updates.initialRows;
    if ('gridlines' in updates) dataUpdates.gridlines = updates.gridlines;
    if ('levelWidths' in updates) dataUpdates.levelWidths = updates.levelWidths;
    if ('meaningWidth' in updates) dataUpdates.meaningWidth = updates.meaningWidth;
    if ('showName' in updates) dataUpdates.showName = updates.showName;
    if ('nameHtmlContent' in updates) dataUpdates.nameHtmlContent = updates.nameHtmlContent;

    // Text fields
    if ('content' in updates) dataUpdates.content = updates.content;
    if ('htmlContent' in updates) dataUpdates.htmlContent = updates.htmlContent;

    // Image fields
    if ('src' in updates) dataUpdates.src = updates.src;
    if ('alt' in updates) dataUpdates.alt = updates.alt;

    // PDF fields
    if ('fileName' in updates) dataUpdates.fileName = updates.fileName;
    if ('currentPage' in updates) dataUpdates.currentPage = updates.currentPage;
    if ('totalPages' in updates) dataUpdates.totalPages = updates.totalPages;
    if ('pageImages' in updates) dataUpdates.pageImages = updates.pageImages;
    if ('backgroundColor' in updates) dataUpdates.backgroundColor = updates.backgroundColor;

    // File fields
    if ('fileSize' in updates) dataUpdates.fileSize = updates.fileSize;
    if ('fileType' in updates) dataUpdates.fileType = updates.fileType;

    // If there are data updates, we need to merge with existing data
    if (Object.keys(dataUpdates).length > 0) {
      // Get current element to merge data
      const { data: current } = await supabase
        .from('elements')
        .select('data')
        .eq('id', id)
        .single();

      if (current) {
        dbUpdates.data = { ...(current.data as object || {}), ...dataUpdates };
      } else {
        dbUpdates.data = dataUpdates;
      }
    }

    const { error } = await supabase
      .from('elements')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('elements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async bulkUpdate(elements: WorkspaceElement[]): Promise<void> {
    // Supabase doesn't have native bulk upsert, so we use Promise.all
    await Promise.all(
      elements.map(async (element) => {
        const userId = await getCurrentUserId();
        const insert = elementToInsert(element, userId);

        const { error } = await supabase
          .from('elements')
          .upsert(insert);

        if (error) throw error;
      })
    );
  },

  async deleteByWorkspaceId(workspaceId: string): Promise<void> {
    const { error } = await supabase
      .from('elements')
      .delete()
      .eq('workspace_id', workspaceId);

    if (error) throw error;
  },
};

// =====================
// IMAGE OPERATIONS (using Supabase Storage)
// =====================

// Legacy interface for component compatibility
export interface ImageBlob {
  id: string;
  workspaceId: string;
  elementId: string;
  blob: Blob;  // The actual blob data
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: number;
}

export const imageOperations = {
  /**
   * Upload an image to Supabase Storage.
   * Returns the public URL that can be used directly as img src.
   * The image is stored at: userId/workspaceId/elementId/imageId
   */
  async create(image: ImageBlob): Promise<string> {
    const userId = await getCurrentUserId();
    // Use image.id (not fileName) to ensure uniqueness
    const path = `${userId}/${image.workspaceId}/${image.elementId}/${image.id}`;

    const { error } = await supabase.storage
      .from('workspace-files')
      .upload(path, image.blob, {
        contentType: image.mimeType,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('workspace-files')
      .getPublicUrl(path);

    return urlData.publicUrl;
  },

  /**
   * Delete an image from Storage.
   * Called when user deletes an image from a text element.
   */
  async delete(workspaceId: string, elementId: string, imageId: string): Promise<void> {
    const userId = await getCurrentUserId();
    const path = `${userId}/${workspaceId}/${elementId}/${imageId}`;

    const { error } = await supabase.storage
      .from('workspace-files')
      .remove([path]);

    if (error) throw error;
  },

  /**
   * Delete all images for a workspace.
   * Called when deleting a workspace to clean up Storage.
   */
  async deleteByWorkspaceId(workspaceId: string): Promise<void> {
    const userId = await getCurrentUserId();
    const basePath = `${userId}/${workspaceId}`;

    // List all element folders under this workspace
    const { data: elementFolders } = await supabase.storage
      .from('workspace-files')
      .list(basePath);

    if (!elementFolders || elementFolders.length === 0) return;

    // For each element folder, list and delete all files
    const allFilePaths: string[] = [];

    for (const folder of elementFolders) {
      if (folder.id === null) {
        // This is a folder, list its contents
        const folderPath = `${basePath}/${folder.name}`;
        const { data: files } = await supabase.storage
          .from('workspace-files')
          .list(folderPath);

        if (files && files.length > 0) {
          files.forEach(f => {
            if (f.id !== null) {  // Only include actual files
              allFilePaths.push(`${folderPath}/${f.name}`);
            }
          });
        }
      } else {
        // This is a file directly in the workspace folder
        allFilePaths.push(`${basePath}/${folder.name}`);
      }
    }

    if (allFilePaths.length > 0) {
      await supabase.storage
        .from('workspace-files')
        .remove(allFilePaths);
    }
  },

  /**
   * Delete all images for an element.
   * Called when deleting an element to clean up Storage.
   */
  async deleteByElementId(workspaceId: string, elementId: string): Promise<void> {
    const userId = await getCurrentUserId();
    const path = `${userId}/${workspaceId}/${elementId}`;

    // List all files in element folder
    const { data: files } = await supabase.storage
      .from('workspace-files')
      .list(path);

    if (files && files.length > 0) {
      const paths = files
        .filter(f => f.id !== null)  // Only actual files
        .map(f => `${path}/${f.name}`);

      if (paths.length > 0) {
        await supabase.storage
          .from('workspace-files')
          .remove(paths);
      }
    }
  },

  // Legacy method - no longer needed since images load directly from URLs
  // Kept for compatibility but always returns empty array
  async getByElementId(_elementId: string): Promise<ImageBlob[]> {
    return [];
  },
};
