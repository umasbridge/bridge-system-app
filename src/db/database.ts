import Dexie, { Table } from 'dexie';

// Workspace interface
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
}

// Element interfaces matching WorkspaceEditor types
export interface BaseElement {
  id: string;
  workspaceId: string; // Foreign key to workspace
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
  initialRows?: RowData[];
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
}

export interface FileElement extends BaseElement {
  type: 'file';
  fileName: string;
  fileSize?: number;
  fileType?: string;
}

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

export type WorkspaceElement = SystemsTableElement | TextElement | ImageElement | PdfElement | FileElement;

// Image Blob storage interface
export interface ImageBlob {
  id: string;
  workspaceId: string;
  elementId: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: number;
}

// Dexie database class
export class BridgeSystemDB extends Dexie {
  workspaces!: Table<Workspace>;
  elements!: Table<WorkspaceElement>;
  images!: Table<ImageBlob>;

  constructor() {
    super('BridgeSystemDB');

    // Define schema
    this.version(1).stores({
      workspaces: 'id, title, createdAt, updatedAt',
      elements: 'id, workspaceId, type, zIndex',
      images: 'id, workspaceId, elementId, createdAt'
    });
  }
}

// Create and export database instance
export const db = new BridgeSystemDB();

// CRUD operations for Workspaces
export const workspaceOperations = {
  // Create new workspace
  async create(title: string): Promise<Workspace> {
    const now = Date.now();
    const workspace: Workspace = {
      id: Math.random().toString(36).substring(7),
      title,
      createdAt: now,
      updatedAt: now,
      borderColor: '#000000',
      borderWidth: 1,
      backgroundColor: 'white',
      canvasWidth: 794,
      canvasHeight: 1123
    };
    await db.workspaces.add(workspace);
    return workspace;
  },

  // Get all workspaces
  async getAll(): Promise<Workspace[]> {
    return await db.workspaces.orderBy('updatedAt').reverse().toArray();
  },

  // Get workspace by id
  async getById(id: string): Promise<Workspace | undefined> {
    return await db.workspaces.get(id);
  },

  // Update workspace
  async update(id: string, updates: Partial<Workspace>): Promise<void> {
    await db.workspaces.update(id, {
      ...updates,
      updatedAt: Date.now()
    });
  },

  // Delete workspace and its elements
  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.workspaces, db.elements, db.images, async () => {
      await db.workspaces.delete(id);
      await db.elements.where('workspaceId').equals(id).delete();
      await db.images.where('workspaceId').equals(id).delete();
    });
  }
};

// CRUD operations for Elements
export const elementOperations = {
  // Create new element
  async create(element: WorkspaceElement): Promise<void> {
    await db.elements.add(element);
  },

  // Get all elements across all workspaces
  async getAll(): Promise<WorkspaceElement[]> {
    return await db.elements.toArray();
  },

  // Get all elements for a workspace
  async getByWorkspaceId(workspaceId: string): Promise<WorkspaceElement[]> {
    return await db.elements
      .where('workspaceId')
      .equals(workspaceId)
      .sortBy('zIndex');
  },

  // Update element
  async update(id: string, updates: Partial<WorkspaceElement>): Promise<void> {
    await db.elements.update(id, updates);
  },

  // Delete element
  async delete(id: string): Promise<void> {
    await db.elements.delete(id);
  },

  // Bulk update elements (for repositioning, etc)
  async bulkUpdate(elements: WorkspaceElement[]): Promise<void> {
    await db.elements.bulkPut(elements);
  },

  // Delete all elements for a workspace
  async deleteByWorkspaceId(workspaceId: string): Promise<void> {
    await db.elements.where('workspaceId').equals(workspaceId).delete();
  }
};

// CRUD operations for Images
export const imageOperations = {
  // Store image blob
  async create(image: ImageBlob): Promise<void> {
    await db.images.add(image);
  },

  // Get image by ID
  async getById(id: string): Promise<ImageBlob | undefined> {
    return await db.images.get(id);
  },

  // Get all images for an element
  async getByElementId(elementId: string): Promise<ImageBlob[]> {
    return await db.images.where('elementId').equals(elementId).toArray();
  },

  // Get all images for a workspace
  async getByWorkspaceId(workspaceId: string): Promise<ImageBlob[]> {
    return await db.images.where('workspaceId').equals(workspaceId).toArray();
  },

  // Delete image
  async delete(id: string): Promise<void> {
    await db.images.delete(id);
  },

  // Delete all images for an element
  async deleteByElementId(elementId: string): Promise<void> {
    await db.images.where('elementId').equals(elementId).delete();
  },

  // Delete all images for a workspace
  async deleteByWorkspaceId(workspaceId: string): Promise<void> {
    await db.images.where('workspaceId').equals(workspaceId).delete();
  }
};
