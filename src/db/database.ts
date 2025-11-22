import Dexie, { Table } from 'dexie';

// Workspace interface
export interface Workspace {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
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
}

export interface SystemsTableElement extends BaseElement {
  type: 'systems-table';
  initialRows?: RowData[];
  gridlines?: {
    enabled: boolean;
    color: string;
    width: number;
  };
  levelWidths?: { [level: number]: number };
  meaningWidth?: number;
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

// Dexie database class
export class BridgeSystemDB extends Dexie {
  workspaces!: Table<Workspace>;
  elements!: Table<WorkspaceElement>;

  constructor() {
    super('BridgeSystemDB');

    // Define schema
    this.version(1).stores({
      workspaces: 'id, title, createdAt, updatedAt',
      elements: 'id, workspaceId, type, zIndex'
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
      updatedAt: now
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
    await db.transaction('rw', db.workspaces, db.elements, async () => {
      await db.workspaces.delete(id);
      await db.elements.where('workspaceId').equals(id).delete();
    });
  }
};

// CRUD operations for Elements
export const elementOperations = {
  // Create new element
  async create(element: WorkspaceElement): Promise<void> {
    await db.elements.add(element);
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
