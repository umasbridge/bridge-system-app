// ============================================
// PAGE TYPES
// ============================================

export type PageType = 'comment' | 'system';

export interface Page {
  id: string;
  type: PageType;
  isMain?: boolean;              // Only for system pages (MainSystemPage)
  title: string;
  titleHtml?: string;            // Rich text formatted title
  titleWidth?: number;           // Title element width in pixels (resizable)
  description?: string;          // Only for main system pages
  descriptionHtml?: string;      // Rich text formatted description
  elements: Element[];
  createdAt: string;
  updatedAt: string;
  // Page styling
  backgroundColor?: string;
  pageBorderColor?: string;
  pageBorderWidth?: number;
  canvasWidth?: number;          // 400-1200px
  leftMargin?: number;           // 0-200px
  topMargin?: number;            // 0-200px
  elementSpacing?: number;       // Gap between elements (default 43px)
}

// ============================================
// ELEMENT TYPES
// ============================================

export type ElementType = 'text' | 'bidtable';

export interface BaseElement {
  id: string;
  type: ElementType;
  order: number;                 // Vertical stack position (determines layout)
}

// Text element with mode support
export type TextElMode = 'default' | 'title' | 'cell';

export interface TextElement extends BaseElement {
  type: 'text';
  mode: TextElMode;
  content: string;               // Plain text content
  htmlContent?: string;          // Rich text HTML content
  // Styling (only for mode='default')
  borderColor?: string;
  borderWidth?: number;
  fillColor?: string;
  width?: number;                // Element width in pixels (resizable)
}

// BidTable element
export interface BidTableElement extends BaseElement {
  type: 'bidtable';
  name?: string;                 // Table name (plain text)
  nameHtml?: string;             // Table name (rich text)
  showName: boolean;             // Whether to display name header
  rows: RowData[];               // Nested row structure
  levelWidths: Record<number, number>;  // Column width per nesting level
  width: number;                  // Total element width (bid columns + meaning column)
  gridlines?: GridlineOptions;
  defaultRowHeight?: number;     // Min row height in px (default 29)
}

export type Element = TextElement | BidTableElement;

// ============================================
// BIDTABLE ROW STRUCTURE
// ============================================

export interface RowData {
  id: string;
  bid: string;                   // Plain text bid (e.g., "1NT", "2♣")
  bidHtml?: string;              // Rich text formatted bid
  bidFillColor?: string;         // Background color for bid cell
  meaning: string;               // Plain text meaning
  meaningHtml?: string;          // Rich text formatted meaning
  children: RowData[];           // Nested child rows
  collapsed?: boolean;           // Whether children are collapsed
  isMerged?: boolean;            // Whether bid and meaning cells are merged
}

export interface GridlineOptions {
  enabled: boolean;
  color: string;
  width: number;
  style?: 'solid' | 'dashed' | 'dotted';
}

// ============================================
// HYPERLINK & NAVIGATION
// ============================================

export type HyperlinkMode = 'popup' | 'split' | 'newpage';

export interface HyperlinkTarget {
  pageId: string;
  pageName: string;
  mode: HyperlinkMode;
  position?: { x: number; y: number };
}

// ============================================
// TEXT FORMATTING
// ============================================

export interface TextFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontFamily?: string;
  fontSize?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  listType?: 'bullet' | 'number' | null;
}

// ============================================
// LAYOUT CONSTANTS
// ============================================

export const LAYOUT = {
  MYSPACE: 43,                   // Spacing between elements (px)
  A4_WIDTH: 595,                 // A4 page width at 72 DPI (px)
  A4_HEIGHT: 842,                // A4 page height at 72 DPI (px)
  DEFAULT_MARGIN: 20,            // Default page margin (px)
  MIN_ELEMENT_HEIGHT: 34,        // Minimum element height (px)
} as const;
