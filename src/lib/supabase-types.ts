// Supabase Database Types
// Auto-generated from schema, manually maintained

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          title_html_content: string | null;
          title_text_align: string | null;
          created_at: string;
          updated_at: string;
          border_color: string | null;
          border_width: number | null;
          background_color: string | null;
          canvas_width: number | null;
          canvas_height: number | null;
          left_margin: number | null;
          top_margin: number | null;
          partners: Partner[] | null;
          is_system: boolean;
          deleted_at: string | null;
          backup_group_id: string | null;
          backup_of: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          title_html_content?: string | null;
          title_text_align?: string | null;
          created_at?: string;
          updated_at?: string;
          border_color?: string | null;
          border_width?: number | null;
          background_color?: string | null;
          canvas_width?: number | null;
          canvas_height?: number | null;
          left_margin?: number | null;
          top_margin?: number | null;
          partners?: Partner[] | null;
          is_system?: boolean;
          deleted_at?: string | null;
          backup_group_id?: string | null;
          backup_of?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          title_html_content?: string | null;
          title_text_align?: string | null;
          created_at?: string;
          updated_at?: string;
          border_color?: string | null;
          border_width?: number | null;
          background_color?: string | null;
          canvas_width?: number | null;
          canvas_height?: number | null;
          left_margin?: number | null;
          top_margin?: number | null;
          partners?: Partner[] | null;
          is_system?: boolean;
          deleted_at?: string | null;
          backup_group_id?: string | null;
          backup_of?: string | null;
        };
      };
      elements: {
        Row: {
          id: string;
          workspace_id: string;
          type: ElementType;
          position: Position;
          size: Size;
          z_index: number;
          border_color: string | null;
          border_width: number | null;
          fill_color: string | null;
          is_manually_positioned: boolean | null;
          name: string | null;
          data: ElementData;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          type: ElementType;
          position?: Position;
          size?: Size;
          z_index?: number;
          border_color?: string | null;
          border_width?: number | null;
          fill_color?: string | null;
          is_manually_positioned?: boolean | null;
          name?: string | null;
          data?: ElementData;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          type?: ElementType;
          position?: Position;
          size?: Size;
          z_index?: number;
          border_color?: string | null;
          border_width?: number | null;
          fill_color?: string | null;
          is_manually_positioned?: boolean | null;
          name?: string | null;
          data?: ElementData;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Helper types
export interface Partner {
  id: string;
  name: string;
  mode: 'viewer' | 'editor';
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type ElementType = 'systems-table' | 'text' | 'image' | 'pdf' | 'file';

// Element-specific data stored in the `data` JSONB column
export interface SystemsTableData {
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
  nameHtmlContent?: string;
}

export interface TextData {
  content?: string;
  htmlContent?: string;
}

export interface ImageData {
  src: string;
  alt?: string;
}

export interface PdfData {
  fileName: string;
  currentPage: number;
  totalPages: number;
  pageImages: string[];
  backgroundColor?: string;
}

export interface FileData {
  fileName: string;
  fileSize?: number;
  fileType?: string;
}

export type ElementData = SystemsTableData | TextData | ImageData | PdfData | FileData | Record<string, unknown>;

// RowData for SystemsTable (nested structure)
export interface RowData {
  id: string;
  bid: string;
  bidHtmlContent?: string;
  bidFillColor?: string;
  meaning: string;
  meaningHtmlContent?: string;
  children: RowData[];
  collapsed?: boolean;
  isMerged?: boolean; // When true, bid and meaning cells are merged into a single full-width meaning cell
}

// Convenience types for working with Supabase responses
export type WorkspaceRow = Database['public']['Tables']['workspaces']['Row'];
export type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert'];
export type WorkspaceUpdate = Database['public']['Tables']['workspaces']['Update'];

export type ElementRow = Database['public']['Tables']['elements']['Row'];
export type ElementInsert = Database['public']['Tables']['elements']['Insert'];
export type ElementUpdate = Database['public']['Tables']['elements']['Update'];
