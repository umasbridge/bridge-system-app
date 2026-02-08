import { useRef, useState, useCallback, useEffect } from 'react';
import { TextFormat, HyperlinkTarget, TextElMode } from '@/types';
import {
  createHistoryController,
  HistoryController,
  saveSelectionAsBookmarks,
  restoreSelectionFromBookmarks,
  normalizeNodeTree,
  sanitizePastedHTML,
  getClipboardContent,
} from '@/utils/rte';
import { UseRichTextOptions, UseRichTextReturn, SelectionState } from './types';

/**
 * Mode-specific feature flags
 */
const MODE_FEATURES: Record<TextElMode, {
  allowImages: boolean;
  allowHyperlinks: boolean;
  allowBullets: boolean;
  allowResize: boolean;
}> = {
  default: { allowImages: true, allowHyperlinks: true, allowBullets: true, allowResize: true },
  title: { allowImages: false, allowHyperlinks: false, allowBullets: false, allowResize: false },
  cell: { allowImages: true, allowHyperlinks: true, allowBullets: true, allowResize: false },
};

/**
 * Custom hook for rich text editing functionality
 * Extracts shared logic from TextElement and RichTextCell
 */
export function useRichText(options: UseRichTextOptions): UseRichTextReturn {
  const { mode, initialHtml, onChange, onFocus, onBlur, onHyperlinkClick, readOnly } = options;
  const features = MODE_FEATURES[mode];

  // Refs
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const historyController = useRef<HistoryController | null>(null);
  const isInternalUpdate = useRef(false);
  const commitTimerRef = useRef<number | null>(null);
  const panelInteractionRef = useRef(false); // Track if user is interacting with panel
  const savedSelectionRef = useRef<Range | null>(null); // Save selection before blur
  const hyperlinkRangeRef = useRef<Range | null>(null); // Save selection for hyperlink apply

  // State
  const [selection, setSelection] = useState<SelectionState>({
    hasSelection: false,
    selectedText: '',
    position: { x: 0, y: 0 },
    isHyperlinkSelected: false,
    currentHyperlinkHref: undefined,
  });
  const [showFormatPanel, setShowFormatPanel] = useState(false);
  const [showHyperlinkMenu, setShowHyperlinkMenu] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize history controller
  useEffect(() => {
    historyController.current = createHistoryController();
    return () => {
      historyController.current?.clear();
    };
  }, []);

  // Initialize content - only on mount, not when initialHtml prop changes
  // (the TextEl component handles prop changes with its own useEffect that respects isFocused)
  const initialHtmlRef = useRef(initialHtml);
  useEffect(() => {
    if (contentEditableRef.current && initialHtmlRef.current) {
      contentEditableRef.current.innerHTML = initialHtmlRef.current;
    }
  }, []); // Empty deps = only run on mount

  // Global click handler to close text format panels when clicking outside content area
  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is inside format panel, hyperlink menu, or block format bar - allow interaction
      if (
        target.closest('[data-format-panel]') ||
        target.closest('[data-hyperlink-menu]') ||
        target.closest('[data-block-format-bar]')
      ) {
        panelInteractionRef.current = true;
        return;
      }

      // Check if click is inside the contenteditable (not the wrapper/border)
      if (contentEditableRef.current?.contains(target)) {
        // Inside content - don't close panels yet (user might be making a new selection)
        return;
      }

      // Click outside content area (including border, or anywhere else) - close text format panels
      setShowFormatPanel(false);
      setShowHyperlinkMenu(false);
    };

    document.addEventListener('mousedown', handleGlobalMouseDown);
    return () => document.removeEventListener('mousedown', handleGlobalMouseDown);
  }, []);

  /**
   * Save current selection for later restoration
   */
  const saveSelection = useCallback((): Range | null => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      return sel.getRangeAt(0).cloneRange();
    }
    return null;
  }, []);

  /**
   * Restore a previously saved selection
   */
  const restoreSelection = useCallback((range: Range | null) => {
    if (range) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, []);

  /**
   * Commit current state to history and notify parent
   * @param normalize - if true, normalize the DOM tree (only for formatting operations)
   */
  const commitMutation = useCallback((normalize: boolean = false) => {
    const root = contentEditableRef.current;
    if (!root) return;

    let bookmarks = null;

    // Only normalize and preserve cursor for explicit formatting operations
    if (normalize) {
      bookmarks = saveSelectionAsBookmarks(root);
      normalizeNodeTree(root);
      if (bookmarks) {
        restoreSelectionFromBookmarks(root, bookmarks);
      }
    }

    // Push to history
    const html = root.innerHTML;
    historyController.current?.push(html, bookmarks);

    // Notify parent
    isInternalUpdate.current = true;
    onChange(root.textContent || '', html);
    isInternalUpdate.current = false;
  }, [onChange]);

  /**
   * Schedule a commit (debounced) - for regular input, don't preserve cursor
   */
  const scheduleCommit = useCallback(() => {
    if (commitTimerRef.current) {
      window.clearTimeout(commitTimerRef.current);
    }
    commitTimerRef.current = window.setTimeout(() => {
      commitMutation(false); // Don't preserve cursor for regular typing
      commitTimerRef.current = null;
    }, 300);
  }, [commitMutation]);

  /**
   * Check if cursor is inside a hyperlink
   */
  const checkHyperlinkAtCursor = useCallback((): { isLink: boolean; href?: string; element?: HTMLAnchorElement } => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return { isLink: false };

    let node: Node | null = sel.anchorNode;
    while (node && node !== contentEditableRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'A') {
        const anchor = node as HTMLAnchorElement;
        return { isLink: true, href: anchor.href, element: anchor };
      }
      node = node.parentNode;
    }
    return { isLink: false };
  }, []);

  /**
   * Update selection state
   */
  const updateSelectionState = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !contentEditableRef.current) {
      setSelection(prev => ({ ...prev, hasSelection: false, selectedText: '' }));
      return;
    }

    const range = sel.getRangeAt(0);
    if (!contentEditableRef.current.contains(range.commonAncestorContainer)) {
      setSelection(prev => ({ ...prev, hasSelection: false, selectedText: '' }));
      return;
    }

    const selectedText = sel.toString();
    const hasSelection = selectedText.length > 0;

    // Get position for panels
    const rect = range.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    };

    // Check if inside hyperlink
    const linkInfo = checkHyperlinkAtCursor();

    setSelection({
      hasSelection,
      selectedText,
      position,
      isHyperlinkSelected: linkInfo.isLink,
      currentHyperlinkHref: linkInfo.href,
    });

    // Show format panel if text is selected (but not while hyperlink menu is open)
    if (hasSelection && !showHyperlinkMenu) {
      setShowFormatPanel(true);
    }
  }, [checkHyperlinkAtCursor, showHyperlinkMenu]);

  /**
   * Handle input events
   */
  const handleInput = useCallback(() => {
    if (readOnly) return;
    scheduleCommit();
  }, [readOnly, scheduleCommit]);

  /**
   * Handle keydown events
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;

    const root = contentEditableRef.current;
    if (!root) return;

    // Undo: Cmd/Ctrl + Z
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      historyController.current?.undo(root, restoreSelectionFromBookmarks);
      isInternalUpdate.current = true;
      onChange(root.textContent || '', root.innerHTML);
      isInternalUpdate.current = false;
      return;
    }

    // Redo: Cmd/Ctrl + Shift + Z
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      historyController.current?.redo(root, restoreSelectionFromBookmarks);
      isInternalUpdate.current = true;
      onChange(root.textContent || '', root.innerHTML);
      isInternalUpdate.current = false;
      return;
    }

    // Bold: Cmd/Ctrl + B
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      applyFormat({ bold: true });
      return;
    }

    // Italic: Cmd/Ctrl + I
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      applyFormat({ italic: true });
      return;
    }

    // Underline: Cmd/Ctrl + U
    if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
      e.preventDefault();
      applyFormat({ underline: true });
      return;
    }

    // For title mode, prevent Enter (single line only)
    if (mode === 'title' && e.key === 'Enter') {
      e.preventDefault();
      return;
    }

    // Check for selection changes on key up (for Shift+Arrow selections)
    if (e.shiftKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      // Use setTimeout to check selection after key action completes
      setTimeout(() => {
        updateSelectionState();
      }, 0);
    }
  }, [readOnly, mode, onChange, updateSelectionState]);

  /**
   * Handle paste events
   */
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    if (readOnly) return;

    e.preventDefault();

    const root = contentEditableRef.current;
    if (!root) return;

    // Get and sanitize pasted content
    const rawHtml = getClipboardContent(e.nativeEvent as ClipboardEvent);
    const cleanFragment = sanitizePastedHTML(rawHtml);

    // Insert at cursor
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(cleanFragment);

      // Move cursor to end of inserted content
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // Commit the change
    commitMutation();
  }, [readOnly, commitMutation]);

  /**
   * Handle mouse up (for selection detection)
   */
  const handleMouseUp = useCallback(() => {
    // Small delay to let selection settle, then update
    requestAnimationFrame(() => {
      updateSelectionState();
    });
  }, [updateSelectionState]);

  /**
   * Handle mouse down
   */
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Check if clicking on a hyperlink (use closest to handle clicks on child elements inside <a>)
    if (features.allowHyperlinks && onHyperlinkClick) {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor) {
        e.preventDefault();
        // Prefer data-page-id attribute (works with both V1-converted and V2-native links)
        const pageId = anchor.getAttribute('data-page-id');
        if (pageId) {
          const linkMode = (anchor.getAttribute('data-link-mode') || 'popup') as 'popup' | 'split' | 'newpage';
          onHyperlinkClick({ pageId, pageName: anchor.textContent || '', mode: linkMode, position: { x: e.clientX, y: e.clientY } });
        } else {
          // Fallback: parse href (format: "bridge://pageId/mode")
          const href = anchor.getAttribute('href') || '';
          if (href.startsWith('bridge://')) {
            const parts = href.replace('bridge://', '').split('/');
            onHyperlinkClick({ pageId: parts[0], pageName: anchor.textContent || '', mode: (parts[1] || 'popup') as 'popup' | 'split' | 'newpage', position: { x: e.clientX, y: e.clientY } });
          }
        }
      }
    }
  }, [features.allowHyperlinks, onHyperlinkClick]);

  /**
   * Prevent default navigation for bridge:// links on click
   */
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href') || '';
      if (href.startsWith('bridge://') || anchor.getAttribute('data-page-id')) {
        e.preventDefault();
      }
    }
  }, []);

  /**
   * Handle focus
   */
  const handleFocus = useCallback((_e: React.FocusEvent<HTMLDivElement>) => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  /**
   * Handle blur
   */
  const handleBlur = useCallback((_e: React.FocusEvent<HTMLDivElement>) => {
    // Save current selection before blur (in case we need to restore it)
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && contentEditableRef.current?.contains(sel.anchorNode)) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }

    // Use timeout to check if we're clicking on a panel or block format bar
    setTimeout(() => {
      if (panelInteractionRef.current) {
        panelInteractionRef.current = false;
        // Re-focus the contenteditable and restore selection
        contentEditableRef.current?.focus();
        // Restore the saved selection
        if (savedSelectionRef.current) {
          const sel2 = window.getSelection();
          if (sel2) {
            sel2.removeAllRanges();
            sel2.addRange(savedSelectionRef.current);
          }
          savedSelectionRef.current = null;
        }
        return;
      }
      // Don't unfocus if the hyperlink menu is open (it's positioned outside the component)
      if (document.querySelector('[data-hyperlink-menu]')) {
        return;
      }
      // Only set unfocused if we're not interacting with panels
      setIsFocused(false);
      savedSelectionRef.current = null;
    }, 150);

    onBlur?.();
  }, [onBlur]);

  /**
   * Apply text formatting
   */
  const applyFormat = useCallback((format: TextFormat) => {
    if (readOnly) return;

    const root = contentEditableRef.current;
    if (!root) return;

    // Only focus if not already focused (to preserve cursor position)
    if (document.activeElement !== root) {
      root.focus();
    }

    // Run synchronously to preserve cursor position
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;

    // Save selection
    const savedRange = saveSelection();

    // Handle text alignment (applies to block)
    if (format.textAlign) {
      root.style.textAlign = format.textAlign;
      restoreSelection(savedRange);
      commitMutation(true);
      return;
    }

    // Handle list types (only if allowed) - use execCommand for native cursor handling
    if (format.listType !== undefined && features.allowBullets) {
      if (format.listType === 'bullet') {
        document.execCommand('insertUnorderedList', false);
      } else if (format.listType === 'number') {
        document.execCommand('insertOrderedList', false);
      } else if (format.listType === null) {
        // Try to remove list
        document.execCommand('insertUnorderedList', false);
      }
      commitMutation(false);
      return;
    }

    // Handle inline formatting
    if (range.collapsed && !format.textAlign) {
      // No selection - nothing to format for inline styles
      return;
    }

    // Restore selection before applying inline formats
    restoreSelection(savedRange);

    // Apply formatting using execCommand
    if (format.bold !== undefined) {
      document.execCommand('bold', false);
    }
    if (format.italic !== undefined) {
      document.execCommand('italic', false);
    }
    if (format.underline !== undefined) {
      document.execCommand('underline', false);
    }
    if (format.strikethrough !== undefined) {
      document.execCommand('strikeThrough', false);
    }
    if (format.color) {
      document.execCommand('foreColor', false, format.color);
    }
    if (format.backgroundColor) {
      document.execCommand('hiliteColor', false, format.backgroundColor);
    }
    if (format.fontSize) {
      // execCommand doesn't work well for fontSize, use span wrapping
      const sel2 = window.getSelection();
      if (sel2 && sel2.rangeCount > 0) {
        const range2 = sel2.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontSize = format.fontSize;
        try {
          range2.surroundContents(span);
        } catch {
          // If selection spans multiple elements, extract and wrap
          const contents = range2.extractContents();
          span.appendChild(contents);
          range2.insertNode(span);
        }
      }
    }
    if (format.fontFamily) {
      document.execCommand('fontName', false, format.fontFamily);
    }

    commitMutation(true);
  }, [readOnly, features.allowBullets, saveSelection, restoreSelection, commitMutation]);

  /**
   * Apply hyperlink to selected text
   */
  const applyHyperlink = useCallback((target: HyperlinkTarget) => {
    if (readOnly || !features.allowHyperlinks) return;

    const root = contentEditableRef.current;
    if (!root) return;

    root.focus();

    // Restore the selection saved when the hyperlink menu was opened
    if (hyperlinkRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(hyperlinkRangeRef.current);
      }
      hyperlinkRangeRef.current = null;
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    // Create the link
    const href = `bridge://${target.pageId}/${target.mode}`;
    const link = document.createElement('a');
    link.href = href;
    link.setAttribute('data-page-id', target.pageId);
    link.setAttribute('data-link-mode', target.mode);
    link.style.color = '#2563eb';
    link.style.textDecoration = 'underline';
    link.style.cursor = 'pointer';

    try {
      range.surroundContents(link);
    } catch {
      // If selection spans multiple elements
      const contents = range.extractContents();
      link.appendChild(contents);
      range.insertNode(link);
    }

    setShowHyperlinkMenu(false);
    commitMutation(true);
  }, [readOnly, features.allowHyperlinks, commitMutation]);

  /**
   * Remove hyperlink from current selection
   */
  const removeHyperlink = useCallback(() => {
    if (readOnly || !features.allowHyperlinks) return;

    const linkInfo = checkHyperlinkAtCursor();
    if (!linkInfo.isLink || !linkInfo.element) return;

    const link = linkInfo.element;
    const parent = link.parentNode;
    if (!parent) return;

    // Move link contents before the link, then remove the link
    while (link.firstChild) {
      parent.insertBefore(link.firstChild, link);
    }
    parent.removeChild(link);

    commitMutation(true);
  }, [readOnly, features.allowHyperlinks, checkHyperlinkAtCursor, commitMutation]);

  /**
   * Panel controls
   */
  const openFormatPanel = useCallback(() => setShowFormatPanel(true), []);
  const openHyperlinkMenu = useCallback(() => {
    // Save the current selection before the menu steals focus
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && contentEditableRef.current?.contains(sel.anchorNode)) {
      hyperlinkRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
    setShowFormatPanel(false);
    setShowHyperlinkMenu(true);
  }, []);
  const closePanels = useCallback(() => {
    setShowFormatPanel(false);
    setShowHyperlinkMenu(false);
  }, []);

  return {
    contentEditableRef,
    selection,
    showFormatPanel,
    showHyperlinkMenu,
    isFocused,
    openFormatPanel,
    openHyperlinkMenu,
    closePanels,
    applyFormat,
    applyHyperlink,
    removeHyperlink,
    handlers: {
      onInput: handleInput,
      onKeyDown: handleKeyDown,
      onMouseUp: handleMouseUp,
      onMouseDown: handleMouseDown,
      onClick: handleClick,
      onPaste: handlePaste,
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
  };
}
