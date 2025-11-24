/**
 * Selection Bookmark System
 *
 * Preserves selection across DOM mutations by inserting temporary marker elements.
 * Markers survive normalization because they have special data attributes.
 */

export interface SelectionBookmarks {
  startId: string;
  endId: string;
  isCollapsed: boolean;
}

/**
 * Generate a unique bookmark ID
 */
function generateBookmarkId(): string {
  return `rte-bookmark-${crypto.randomUUID()}`;
}

/**
 * Create a bookmark marker element
 */
function createBookmark(id: string, type: 'start' | 'end'): HTMLSpanElement {
  const marker = document.createElement('span');
  marker.id = id;
  marker.setAttribute('data-rte-bookmark', type);
  marker.style.display = 'none';
  // Add zero-width non-joiner to ensure the marker takes up a position
  marker.textContent = '\u200C';
  return marker;
}

/**
 * Check if we can insert a bookmark at a given node
 * Don't insert inside IMG or self-closing elements
 */
function canInsertInside(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) return true;
  if (node.nodeType !== Node.ELEMENT_NODE) return false;

  const elem = node as HTMLElement;
  const tagName = elem.tagName.toUpperCase();

  // Don't insert inside these elements
  const noInsertTags = new Set(['IMG', 'BR', 'INPUT', 'HR']);
  return !noInsertTags.has(tagName);
}

/**
 * Insert a bookmark marker at a specific position in the DOM
 */
function insertBookmarkAtPosition(
  container: Node,
  offset: number,
  marker: HTMLSpanElement
): void {
  if (container.nodeType === Node.TEXT_NODE) {
    const textNode = container as Text;

    // Split the text node at the offset
    if (offset === 0) {
      // Insert before the text node
      textNode.parentNode?.insertBefore(marker, textNode);
    } else if (offset >= textNode.length) {
      // Insert after the text node
      if (textNode.nextSibling) {
        textNode.parentNode?.insertBefore(marker, textNode.nextSibling);
      } else {
        textNode.parentNode?.appendChild(marker);
      }
    } else {
      // Split the text node
      const secondHalf = textNode.splitText(offset);
      textNode.parentNode?.insertBefore(marker, secondHalf);
    }
  } else if (container.nodeType === Node.ELEMENT_NODE) {
    const elem = container as HTMLElement;

    if (offset === 0) {
      elem.insertBefore(marker, elem.firstChild);
    } else if (offset >= elem.childNodes.length) {
      elem.appendChild(marker);
    } else {
      elem.insertBefore(marker, elem.childNodes[offset]);
    }
  }
}

/**
 * Remove all existing bookmark markers from the DOM
 */
function cleanupExistingBookmarks(root: HTMLElement): void {
  const existingMarkers = root.querySelectorAll('[data-rte-bookmark]');
  existingMarkers.forEach(marker => marker.remove());
}

/**
 * Check if selection is within the root element
 */
function isSelectionInRoot(selection: Selection, root: HTMLElement): boolean {
  if (selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  return root.contains(range.commonAncestorContainer);
}

/**
 * Save the current selection as bookmark markers
 * Returns null if no selection or selection is outside root
 */
export function saveSelectionAsBookmarks(root: HTMLElement): SelectionBookmarks | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);

  // Check if selection is within our root
  if (!isSelectionInRoot(selection, root)) return null;

  // Cleanup any existing bookmarks first
  cleanupExistingBookmarks(root);

  const startId = generateBookmarkId();
  const endId = generateBookmarkId();
  const isCollapsed = range.collapsed;

  try {
    // Create markers
    const startMarker = createBookmark(startId, 'start');
    const endMarker = createBookmark(endId, 'end');

    if (isCollapsed) {
      // For collapsed selection, insert only one marker
      insertBookmarkAtPosition(range.startContainer, range.startOffset, startMarker);
    } else {
      // For non-collapsed selection, insert end marker first (to preserve offsets)
      insertBookmarkAtPosition(range.endContainer, range.endOffset, endMarker);
      insertBookmarkAtPosition(range.startContainer, range.startOffset, startMarker);
    }

    return {
      startId,
      endId,
      isCollapsed,
    };
  } catch (error) {
    console.warn('Failed to save selection bookmarks:', error);
    cleanupExistingBookmarks(root);
    return null;
  }
}

/**
 * Restore selection from bookmark markers
 * Returns true if successful, false otherwise
 */
export function restoreSelectionFromBookmarks(
  root: HTMLElement,
  bookmarks: SelectionBookmarks
): boolean {
  try {
    const startMarker = root.querySelector(`#${bookmarks.startId}`);
    if (!startMarker) {
      console.warn('Start bookmark marker not found');
      cleanupExistingBookmarks(root);
      return false;
    }

    let endMarker: Element | null = null;
    if (!bookmarks.isCollapsed) {
      endMarker = root.querySelector(`#${bookmarks.endId}`);
      if (!endMarker) {
        console.warn('End bookmark marker not found');
        cleanupExistingBookmarks(root);
        return false;
      }
    }

    // Create a new range
    const range = document.createRange();
    const selection = window.getSelection();
    if (!selection) {
      cleanupExistingBookmarks(root);
      return false;
    }

    if (bookmarks.isCollapsed) {
      // Collapsed selection - place cursor before the start marker
      const parent = startMarker.parentNode;
      if (!parent) {
        cleanupExistingBookmarks(root);
        return false;
      }

      const startIndex = Array.from(parent.childNodes).indexOf(startMarker as ChildNode);
      range.setStart(parent, startIndex);
      range.setEnd(parent, startIndex);
    } else {
      // Non-collapsed selection
      const startParent = startMarker.parentNode;
      const endParent = endMarker!.parentNode;

      if (!startParent || !endParent) {
        cleanupExistingBookmarks(root);
        return false;
      }

      const startIndex = Array.from(startParent.childNodes).indexOf(startMarker as ChildNode);
      const endIndex = Array.from(endParent.childNodes).indexOf(endMarker as ChildNode);

      range.setStart(startParent, startIndex);
      range.setEnd(endParent, endIndex);
    }

    // Apply the range
    selection.removeAllRanges();
    selection.addRange(range);

    // Remove the bookmark markers
    startMarker.remove();
    if (endMarker) {
      endMarker.remove();
    }

    return true;
  } catch (error) {
    console.warn('Failed to restore selection from bookmarks:', error);
    cleanupExistingBookmarks(root);
    return false;
  }
}

/**
 * Clear all bookmarks from the root element
 * Use this for cleanup if bookmark restoration fails
 */
export function clearBookmarks(root: HTMLElement): void {
  cleanupExistingBookmarks(root);
}
