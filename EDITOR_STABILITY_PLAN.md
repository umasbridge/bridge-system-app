# Editor Stability Layer - Full Implementation Plan

## Overview

Comprehensive stability infrastructure for RichTextCell and TextElement components to ensure:
- Consistent DOM structure (normalized, canonical)
- Reliable selection restoration across mutations
- Full undo/redo with selection preservation
- Clean paste from external sources
- No nested span accumulation
- Predictable formatting behavior

## Architecture Principles

1. **Normalization-First**: Every mutation goes through normalization
2. **Bookmark-Based Selection**: UUID markers survive DOM mutations
3. **Transaction Pipeline**: Commit → Normalize → Restore Selection → Snapshot
4. **Canonical Styles**: All inline styles normalized to standard format
5. **HTML Snapshots**: Simple, reliable undo/redo via innerHTML capture

## Phase 0: Context Analysis ✅

**Status**: Complete (files read and analyzed)

**Findings**:
- RichTextCell: 1029 lines, applyFormat at 481-743
- TextElement: 1125 lines, applyFormat at 611-911
- Both use Range-based selection (fragile)
- No normalization after mutations
- Span accumulation on repeated formatting
- Paste strips all HTML (too aggressive)

## Phase 1: DOM Normalization Engine

**File**: `src/utils/rte/normalizeNodeTree.ts`

**Function**: `normalizeNodeTree(root: HTMLElement): void`

**Operations**:
1. Flatten nested `<span>` with identical styles
2. Merge adjacent `<span>` siblings with identical styles
3. Unwrap legacy tags (`<b>`, `<i>`, `<u>`, `<font>`) into canonical `<span>`
4. Remove empty spans and empty text nodes
5. Collapse multiple consecutive `<br>` into single `<br>`
6. Ensure inline nodes don't contain block nodes
7. Canonicalize style property ordering
8. Normalize style values:
   - `font-weight: bold` → `font-weight: 700`
   - `font-weight: normal` → `font-weight: 400`
   - Colors to lowercase hex (`#ff0000`)
   - Remove vendor prefixes (`-webkit-`, `-moz-`)

**Edge Cases**:
- Preserve `<a>` hyperlink elements (don't merge)
- Preserve `<img>` with `data-image-id` attributes
- Preserve list structure (`<ul>`, `<ol>`, `<li>`)
- Handle text nodes with only whitespace

**Implementation Strategy**:
- Recursive tree walker (DFS)
- Use DOM API only (no innerHTML string manipulation)
- In-place mutations (modify tree directly)

## Phase 2: Bookmark-Based Selection

**File**: `src/utils/rte/selectionBookmarks.ts`

**Functions**:
```typescript
saveSelectionAsBookmarks(root: HTMLElement): { startId: string; endId: string } | null
restoreSelectionFromBookmarks(root: HTMLElement, marks: { startId: string; endId: string }): boolean
```

**Implementation**:
1. On save:
   - Get current selection Range
   - Insert `<span data-rte-bookmark="start" id="uuid_start"></span>` at range.startOffset
   - Insert `<span data-rte-bookmark="end" id="uuid_end"></span>` at range.endOffset
   - Return bookmark IDs
   - Don't insert inside `<a>` or `<img>` - place adjacent instead

2. On restore:
   - Find elements by bookmark IDs
   - Create new Range from marker positions
   - Remove bookmark markers from DOM
   - Apply range to window.getSelection()
   - Return success/failure

**Edge Cases**:
- Collapsed selection (start === end)
- Selection outside root element
- Bookmarks lost during normalization (graceful degradation)
- Multiple contentEditables on page (scope to root)

**Robustness**:
- UUID collision prevention (crypto.randomUUID())
- Cleanup stale bookmarks (remove any existing before save)
- Handle missing markers (return false, don't crash)

## Phase 3: Undo/Redo Stack

**File**: `src/utils/rte/history.ts`

**Interface**:
```typescript
interface HistoryEntry {
  html: string;
  selection: { startId: string; endId: string } | null;
  timestamp: number;
}

interface HistoryController {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  push(html: string, selection: SelectionBookmarks | null): void;
  undo(root: HTMLElement, restoreSelectionFn: (marks: SelectionBookmarks) => void): void;
  redo(root: HTMLElement, restoreSelectionFn: (marks: SelectionBookmarks) => void): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}
```

**Push Strategy**:
- Capture full innerHTML
- Capture current bookmarks
- Don't push if identical to last entry (deduplicate)
- Limit stack to 50 entries (FIFO when exceeded)
- Clear redo stack on new push

**Undo/Redo**:
- Save current state to opposite stack before applying
- Restore innerHTML directly
- Restore selection via bookmarks
- Handle image object URLs (may need re-creation)

**Integration Points**:
- Push after: format apply, paste, list toggle, indent, hyperlink, image insert
- Push on: blur (capture typing changes)
- Push on: Enter key (new paragraph)
- Push on: Delete/Backspace (significant deletions)

**Keyboard Shortcuts**:
- `⌘/Ctrl + Z` → undo
- `⌘/Ctrl + Shift + Z` → redo
- Prevent default browser undo (contentEditable has native undo)

## Phase 4: Paste Sanitization

**File**: `src/utils/rte/pasteSanitizer.ts`

**Function**: `sanitizePastedHTML(html: string): DocumentFragment`

**Allowed Elements**:
- Text formatting: `<span>`, `<br>`
- Lists: `<ul>`, `<ol>`, `<li>`
- Block: `<div>`, `<p>` (converted to spans + br)
- All others: stripped, content preserved

**Allowed Styles**:
- `color`
- `background-color`
- `font-family`
- `font-size`
- `font-weight`
- `font-style`
- `text-decoration`

**Stripping Rules**:
1. Remove all `class` attributes
2. Remove all `id` attributes (except bookmark markers)
3. Remove `style` properties not in allowed list
4. Remove `<meta>`, `<style>`, `<script>` tags
5. Remove Office XML artifacts (`<o:p>`, `<w:sdt>`)
6. Remove Google Docs metadata (`<span class="kix-">`)
7. Convert `<strong>` → `<span style="font-weight: 700">`
8. Convert `<em>` → `<span style="font-style: italic">`

**Special Handling**:
- Preserve newlines as `<br>`
- Collapse multiple spaces to single space
- Trim leading/trailing whitespace
- Handle nested lists (flatten to single level)

**Integration**:
- Override `onPaste` in RichTextCell and TextElement
- Prevent default paste
- Parse `clipboardData` as HTML
- Sanitize → Normalize → Insert at cursor
- Push to history

## Phase 5: Inline Style Canonicalization

**File**: `src/utils/rte/canonicalizeStyle.ts`

**Function**: `canonicalizeInlineStyle(style: CSSStyleDeclaration): Record<string, string>`

**Normalizations**:
1. **Font Weight**:
   - `bold` → `700`
   - `bolder` → `900`
   - `lighter` → `300`
   - `normal` → `400`

2. **Colors**:
   - `rgb(255, 0, 0)` → `#ff0000`
   - `rgba(255, 0, 0, 1)` → `#ff0000`
   - `rgba(255, 0, 0, 0.5)` → `rgba(255, 0, 0, 0.5)` (preserve alpha)
   - Lowercase hex
   - Shorthand hex when possible (`#ffffff` → `#fff`)

3. **Font Size**:
   - Convert all to `px` (no `pt`, `em`, `rem`)
   - Round to integers

4. **Font Family**:
   - Preserve exactly as is (don't normalize names)
   - Remove extra quotes

5. **Property Ordering**:
   - Alphabetical order
   - `background-color`, `color`, `font-family`, `font-size`, `font-style`, `font-weight`, `text-decoration`

**Usage**:
- Called during normalization on every `<span>`
- Called when applying formats (before insertion)
- Ensures style matching works (for merging adjacent spans)

## Phase 6: Commit Mutation Pipeline

**Implementation**: Inside RichTextCell and TextElement components

**Function**: `commitMutation()`

**Pipeline Steps**:
```typescript
function commitMutation() {
  if (!contentEditableRef.current) return;

  const root = contentEditableRef.current;

  // 1. Save selection as bookmarks
  const marks = saveSelectionAsBookmarks(root);

  // 2. Normalize DOM tree
  normalizeNodeTree(root);

  // 3. Restore selection from bookmarks
  if (marks) {
    restoreSelectionFromBookmarks(root, marks);
  }

  // 4. Push to history
  historyController.push(root.innerHTML, marks);

  // 5. Notify parent (trigger onChange)
  const htmlContent = root.innerHTML;
  const textContent = root.textContent || '';
  onChange(textContent, htmlContent);
}
```

**Call Sites** (after every mutation):
- After `applyFormat`
- After `applyHyperlink`
- After paste
- After list toggle
- After indent/unindent
- After image insert
- On blur (typing changes)
- On Enter key
- On Delete/Backspace (content removal)

## Phase 7: Integration into Components

### RichTextCell Changes

**File**: `src/components/systems-table/RichTextCell.tsx`

**New Imports**:
```typescript
import { createHistoryController, HistoryController } from '../../utils/rte/history';
import { saveSelectionAsBookmarks, restoreSelectionFromBookmarks } from '../../utils/rte/selectionBookmarks';
import { normalizeNodeTree } from '../../utils/rte/normalizeNodeTree';
import { sanitizePastedHTML } from '../../utils/rte/pasteSanitizer';
```

**New State**:
```typescript
const historyController = useRef<HistoryController>(createHistoryController());
```

**Modified Functions**:
- `applyFormat`: Add `commitMutation()` at end
- `applyHyperlink`: Add `commitMutation()` at end
- `handlePaste`: Use `sanitizePastedHTML()` before insertion
- `handleInput`: Add `commitMutation()` on blur
- Replace `saveSelection`/`restoreSelection` with bookmark functions

**New Keyboard Handler**:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        historyController.current.redo(contentEditableRef.current!, restoreSelectionFromBookmarks);
      } else {
        historyController.current.undo(contentEditableRef.current!, restoreSelectionFromBookmarks);
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### TextElement Changes

**File**: `src/components/workspace-system/TextElement.tsx`

Same changes as RichTextCell (nearly identical implementation).

## Phase 8: Acceptance Testing

### Normalization Tests

**Test**: Adjacent identical spans merge
```html
Before: <span style="color: #ff0000">Hello</span><span style="color: #ff0000"> World</span>
After:  <span style="color: #ff0000">Hello World</span>
```

**Test**: Nested spans collapse
```html
Before: <span style="color: #ff0000"><span style="font-weight: 700">Bold Red</span></span>
After:  <span style="color: #ff0000; font-weight: 700">Bold Red</span>
```

**Test**: Legacy tags converted
```html
Before: <b>Bold</b> <i>Italic</i> <font color="red">Red</font>
After:  <span style="font-weight: 700">Bold</span> <span style="font-style: italic">Italic</span> <span style="color: #ff0000">Red</span>
```

**Test**: Empty spans removed
```html
Before: <span></span>Text<span> </span>
After:  Text
```

### Selection Tests

**Test**: Selection restored after normalization
1. Select "Hello World"
2. Apply bold (triggers normalization)
3. Selection should still highlight "Hello World"

**Test**: Cursor position preserved at start/end
1. Place cursor at start of text
2. Apply formatting
3. Cursor should remain at start

**Test**: Selection across multiple spans
1. Select text spanning 3 different formatted sections
2. Apply color
3. Selection should remain across all 3 sections

### Paste Tests

**Test**: Google Docs paste
1. Copy formatted text from Google Docs (bold, colors, lists)
2. Paste into editor
3. Should preserve bold, colors, lists
4. Should strip Google Docs metadata classes

**Test**: Microsoft Word paste
1. Copy from Word (headings, colors, fonts)
2. Paste into editor
3. Should preserve basic formatting
4. Should strip Office XML artifacts

**Test**: Plain text paste
1. Copy plain text
2. Paste into editor
3. Should insert without formatting

### Undo/Redo Tests

**Test**: Undo single formatting
1. Type "Hello"
2. Select and make bold
3. Undo → should revert to unformatted

**Test**: Undo chain
1. Type "Hello"
2. Make bold
3. Change color to red
4. Add background yellow
5. Undo 3x → should revert to plain "Hello"

**Test**: Redo after undo
1. Type "Hello", make bold
2. Undo
3. Redo → should restore bold

**Test**: Undo clears redo stack
1. Type "Hello", make bold
2. Undo
3. Type "World"
4. Redo → should do nothing (new action cleared redo)

### Formatting Stability Tests

**Test**: 10 consecutive formatting operations
1. Type "Hello World"
2. Apply: bold, italic, color red, font size 20, underline, background yellow, font Arial, align center, strikethrough, color blue
3. Inspect DOM: Should have 1-2 spans, not 10 nested spans

**Test**: Format then unformat
1. Type "Hello", make bold
2. Select again, toggle bold off
3. Should return to plain text (no empty spans)

**Test**: Mixed formatting
1. Type "Hello World"
2. Make "Hello" bold and red
3. Make "World" italic and blue
4. Select all, make font size 20
5. Both should be 20px, preserve individual colors/styles

### Image Tests

**Test**: Undo image insertion
1. Paste image
2. Undo → image should disappear

**Test**: Image survives normalization
1. Insert image
2. Apply formatting before/after image
3. Image should remain with `data-image-id` intact

### List Tests

**Test**: Undo list creation
1. Type "Item 1"
2. Create bullet list
3. Undo → should revert to plain text

**Test**: List survives normalization
1. Create numbered list with 3 items
2. Apply formatting to item 2
3. List structure should remain intact

## Progress Tracking

**Last Updated:** 2025-11-24

**Current Status:** Phases 1-7 Complete ✅
- ✅ Phase 1: Implemented `normalizeNodeTree.ts` (DOM normalization engine)
- ✅ Phase 2: Implemented `selectionBookmarks.ts` (selection preservation)
- ✅ Phase 3: Implemented `history.ts` (undo/redo controller)
- ✅ Phase 4: Implemented `pasteSanitizer.ts` (paste handling)
- ✅ Phase 5: Implemented `canonicalizeStyle.ts` (style canonicalization)
- ✅ Phase 6: Commit mutation pipeline (commitMutation function)
- ✅ Phase 7: Integrated into RichTextCell and TextElement components
- 🔄 Phase 8: Manual browser testing required

**Implementation Summary:**
- All 5 utility files created in `src/utils/rte/`
- Both RichTextCell and TextElement fully integrated
- Undo/redo keyboard shortcuts (Cmd/Ctrl+Z) implemented
- Paste sanitization active (handles Google Docs/Word HTML)
- Dev server compiles successfully without errors

**Next Session:** Phase 8 - Manual browser testing and acceptance tests

## Implementation Order

1. ✅ Create project plan (this document) - 2025-11-24
2. ✅ `normalizeNodeTree.ts` - Core normalization engine - 2025-11-24
3. ✅ `canonicalizeStyle.ts` - Style normalization helper - 2025-11-24
4. ✅ `selectionBookmarks.ts` - Selection preservation - 2025-11-24
5. ✅ `history.ts` - Undo/redo controller - 2025-11-24
6. ✅ `pasteSanitizer.ts` - Paste handling - 2025-11-24
7. ✅ Integrate into RichTextCell - commitMutation pipeline - 2025-11-24
8. ✅ Integrate into TextElement - commitMutation pipeline - 2025-11-24
9. ⏳ Manual browser testing - all acceptance tests
10. ⏳ Visual verification with Chrome DevTools MCP

## Success Criteria

- All 20+ acceptance tests pass
- No regressions in existing functionality
- Undo/redo works for all operations
- Paste from Google Docs/Word is clean
- DOM never accumulates nested spans
- Selection never "jumps" unexpectedly
- Performance acceptable (< 100ms per mutation)

## Risk Mitigation

**Risk**: Breaking existing functionality
**Mitigation**: Implement behind feature flag, toggle in dev mode

**Risk**: Selection loss during normalization
**Mitigation**: Bookmark system designed specifically to survive mutations

**Risk**: Image object URLs invalidated
**Mitigation**: Re-fetch from IndexedDB after undo/redo if needed

**Risk**: Performance degradation
**Mitigation**: Profile with Chrome DevTools, optimize normalization algorithm

## Post-Implementation

1. Update CLAUDE.md with editor stability completion
2. Update HANDOVER.md with implementation notes
3. Document any edge cases discovered
4. Create GitHub issue for any deferred optimizations
5. Add editor stability to feature documentation
