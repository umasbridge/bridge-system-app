/**
 * Undo/Redo History Controller
 *
 * Manages history stack for rich text editing with selection preservation.
 * Uses innerHTML snapshots for simplicity and reliability.
 */

import { SelectionBookmarks } from './selectionBookmarks';

export interface HistoryEntry {
  html: string;
  selection: SelectionBookmarks | null;
  timestamp: number;
}

export interface HistoryController {
  push(html: string, selection: SelectionBookmarks | null): void;
  undo(
    root: HTMLElement,
    restoreSelectionFn: (root: HTMLElement, marks: SelectionBookmarks) => boolean
  ): void;
  redo(
    root: HTMLElement,
    restoreSelectionFn: (root: HTMLElement, marks: SelectionBookmarks) => boolean
  ): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

const MAX_HISTORY_SIZE = 50;

/**
 * Create a new history controller instance
 */
export function createHistoryController(): HistoryController {
  let undoStack: HistoryEntry[] = [];
  let redoStack: HistoryEntry[] = [];

  /**
   * Check if an entry is identical to the last entry in the undo stack
   */
  function isDuplicate(html: string): boolean {
    if (undoStack.length === 0) return false;
    const lastEntry = undoStack[undoStack.length - 1];
    return lastEntry.html === html;
  }

  /**
   * Push a new state to the history
   */
  function push(html: string, selection: SelectionBookmarks | null): void {
    // Don't push if identical to last entry
    if (isDuplicate(html)) {
      return;
    }

    const entry: HistoryEntry = {
      html,
      selection,
      timestamp: Date.now(),
    };

    // Add to undo stack
    undoStack.push(entry);

    // Limit stack size (FIFO)
    if (undoStack.length > MAX_HISTORY_SIZE) {
      undoStack.shift();
    }

    // Clear redo stack on new push
    redoStack = [];
  }

  /**
   * Undo the last operation
   */
  function undo(
    root: HTMLElement,
    restoreSelectionFn: (root: HTMLElement, marks: SelectionBookmarks) => boolean
  ): void {
    if (undoStack.length === 0) return;

    // Save current state to redo stack before undoing
    const currentHtml = root.innerHTML;
    const currentEntry: HistoryEntry = {
      html: currentHtml,
      selection: null, // Don't save selection for redo
      timestamp: Date.now(),
    };
    redoStack.push(currentEntry);

    // Pop from undo stack
    const entry = undoStack.pop()!;

    // Restore the HTML
    root.innerHTML = entry.html;

    // Restore selection if available
    if (entry.selection) {
      restoreSelectionFn(root, entry.selection);
    }
  }

  /**
   * Redo the last undone operation
   */
  function redo(
    root: HTMLElement,
    restoreSelectionFn: (root: HTMLElement, marks: SelectionBookmarks) => boolean
  ): void {
    if (redoStack.length === 0) return;

    // Save current state to undo stack before redoing
    const currentHtml = root.innerHTML;
    const currentEntry: HistoryEntry = {
      html: currentHtml,
      selection: null, // Don't save selection for undo
      timestamp: Date.now(),
    };
    undoStack.push(currentEntry);

    // Pop from redo stack
    const entry = redoStack.pop()!;

    // Restore the HTML
    root.innerHTML = entry.html;

    // Restore selection if available
    if (entry.selection) {
      restoreSelectionFn(root, entry.selection);
    }
  }

  /**
   * Check if undo is available
   */
  function canUndo(): boolean {
    return undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  function canRedo(): boolean {
    return redoStack.length > 0;
  }

  /**
   * Clear all history
   */
  function clear(): void {
    undoStack = [];
    redoStack = [];
  }

  return {
    push,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
  };
}
