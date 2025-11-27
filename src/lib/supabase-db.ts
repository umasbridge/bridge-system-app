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
  createdAt: number;
  updatedAt: number;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  partners?: Partner[];
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
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    borderColor: row.border_color || undefined,
    borderWidth: row.border_width || undefined,
    backgroundColor: row.background_color || undefined,
    canvasWidth: row.canvas_width || undefined,
    canvasHeight: row.canvas_height || undefined,
    partners: row.partners || undefined,
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
  async create(title: string): Promise<Workspace> {
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
      .order('updated_at', { ascending: false });

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

  async update(id: string, updates: Partial<Workspace>): Promise<void> {
    const dbUpdates: WorkspaceUpdate = {};

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.borderColor !== undefined) dbUpdates.border_color = updates.borderColor;
    if (updates.borderWidth !== undefined) dbUpdates.border_width = updates.borderWidth;
    if (updates.backgroundColor !== undefined) dbUpdates.background_color = updates.backgroundColor;
    if (updates.canvasWidth !== undefined) dbUpdates.canvas_width = updates.canvasWidth;
    if (updates.canvasHeight !== undefined) dbUpdates.canvas_height = updates.canvasHeight;
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

export interface ImageBlob {
  id: string;
  workspaceId: string;
  elementId: string;
  url: string;  // Changed from blob to URL
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: number;
}

export const imageOperations = {
  async create(image: Omit<ImageBlob, 'url'> & { blob: Blob }): Promise<string> {
    const userId = await getCurrentUserId();
    const path = `${userId}/${image.workspaceId}/${image.elementId}/${image.fileName}`;

    const { data, error } = await supabase.storage
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

  async getUrl(workspaceId: string, elementId: string, fileName: string): Promise<string | null> {
    const userId = await getCurrentUserId();
    const path = `${userId}/${workspaceId}/${elementId}/${fileName}`;

    const { data } = supabase.storage
      .from('workspace-files')
      .getPublicUrl(path);

    return data.publicUrl;
  },

  async delete(workspaceId: string, elementId: string, fileName: string): Promise<void> {
    const userId = await getCurrentUserId();
    const path = `${userId}/${workspaceId}/${elementId}/${fileName}`;

    const { error } = await supabase.storage
      .from('workspace-files')
      .remove([path]);

    if (error) throw error;
  },

  async deleteByWorkspaceId(workspaceId: string): Promise<void> {
    const userId = await getCurrentUserId();
    const path = `${userId}/${workspaceId}`;

    // List all files in workspace folder
    const { data: files } = await supabase.storage
      .from('workspace-files')
      .list(path);

    if (files && files.length > 0) {
      const paths = files.map(f => `${path}/${f.name}`);
      await supabase.storage
        .from('workspace-files')
        .remove(paths);
    }
  },
};
