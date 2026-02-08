import { TextFormat, HyperlinkTarget, TextElMode } from '@/types';

/**
 * Element-level styling (border, fill, etc.)
 */
export interface ElementStyle {
  borderColor?: string;
  borderWidth?: number;
  fillColor?: string;
}

/**
 * Props for the TextEl component
 */
export interface TextElProps {
  /** The mode determines which features are enabled */
  mode: TextElMode;

  /** Plain text content */
  value: string;

  /** Rich HTML content */
  htmlValue?: string;

  /** Called when content changes */
  onChange: (text: string, html: string) => void;

  /** Whether the element is read-only */
  readOnly?: boolean;

  /** Placeholder text when empty */
  placeholder?: string;

  /** Minimum height in pixels (default: 34 for default mode, 20 for cell mode) */
  minHeight?: number;

  /** Called when element receives focus */
  onFocus?: () => void;

  /** Called when element loses focus */
  onBlur?: () => void;

  /** Available pages for hyperlink creation (only used if mode allows hyperlinks) */
  availablePages?: Array<{ id: string; name: string }>;

  /** Called when a hyperlink is clicked */
  onHyperlinkClick?: (target: HyperlinkTarget) => void;

  /** Additional CSS class names */
  className?: string;

  // Element-level styling (only for mode='default')
  /** Element border color */
  borderColor?: string;

  /** Element border width in pixels */
  borderWidth?: number;

  /** Element fill/background color */
  fillColor?: string;

  /** Called when element styling changes */
  onStyleChange?: (style: ElementStyle) => void;

  /** Whether the element is selected (shows resize handles) */
  isSelected?: boolean;

  /** Called when the element is selected */
  onSelect?: () => void;

  /** Current width of the element in pixels */
  width?: number;

  /** Maximum allowed width in pixels */
  maxWidth?: number;

  /** Called when element width changes via resize */
  onWidthChange?: (width: number) => void;
}

/**
 * Selection state for formatting
 */
export interface SelectionState {
  hasSelection: boolean;
  selectedText: string;
  position: { x: number; y: number };
  isHyperlinkSelected: boolean;
  currentHyperlinkHref?: string;
}

/**
 * Return type for useRichText hook
 */
export interface UseRichTextReturn {
  /** Ref to attach to the contenteditable element */
  contentEditableRef: React.RefObject<HTMLDivElement>;

  /** Current selection state */
  selection: SelectionState;

  /** Whether format panel should be shown */
  showFormatPanel: boolean;

  /** Whether hyperlink menu should be shown */
  showHyperlinkMenu: boolean;

  /** Whether the content area is focused */
  isFocused: boolean;

  /** Open the format panel */
  openFormatPanel: () => void;

  /** Open the hyperlink menu */
  openHyperlinkMenu: () => void;

  /** Close all panels */
  closePanels: () => void;

  /** Apply text formatting */
  applyFormat: (format: TextFormat) => void;

  /** Apply a hyperlink to selected text */
  applyHyperlink: (target: HyperlinkTarget) => void;

  /** Remove hyperlink from selection */
  removeHyperlink: () => void;

  /** Event handlers to attach to contenteditable */
  handlers: {
    onInput: (e: React.FormEvent<HTMLDivElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onMouseUp: () => void;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onPaste: (e: React.ClipboardEvent<HTMLDivElement>) => void;
    onFocus: (e: React.FocusEvent<HTMLDivElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLDivElement>) => void;
  };
}

/**
 * Options for useRichText hook
 */
export interface UseRichTextOptions {
  mode: TextElMode;
  initialHtml?: string;
  onChange: (text: string, html: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onHyperlinkClick?: (target: HyperlinkTarget) => void;
  readOnly?: boolean;
}
