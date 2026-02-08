# TextEl — Rich Text Element Module

Self-contained rich text editor component with 3 operating modes. Handles its own selection ring, resize, border/fill styling, and text formatting toolbar.

## Files

| File | Purpose |
|------|---------|
| `TextEl.tsx` | Main component — contenteditable editor with mode-based rendering, resize via re-resizable, selection ring |
| `useRichText.ts` | Core hook — selection tracking, formatting operations, undo/redo, paste sanitization, hyperlink handling |
| `types.ts` | TypeScript interfaces — TextElProps, TextElMode, ElementStyle, SelectionState |
| `TextFormatPanel.tsx` | Inline formatting toolbar — bold, italic, underline, strikethrough, font size, text color, highlight, hyperlink |
| `BlockFormatBar.tsx` | Block-level toolbar — text alignment (left/center/right), bullet/numbered lists |
| `HyperlinkMenu.tsx` | Hyperlink creation popup — page search, mode selection (popup/split/newpage) |
| `index.ts` | Barrel exports |

## Modes

| Feature | `default` | `title` | `cell` |
|---------|-----------|---------|--------|
| Rich text formatting | Yes | Yes | Yes |
| Hyperlinks | Yes | No | Yes |
| Bullet/number lists | Yes | No | No |
| Resize (width) | Yes | No | No |
| Border/fill styling | Yes | No | No |
| Selection ring | Yes | No | No |
| Single line | No | Yes | No |

## Props (TextElProps)

```typescript
interface TextElProps {
  // Required
  mode: 'default' | 'title' | 'cell';
  value: string;                          // Plain text content
  onChange: (text: string, html: string) => void;

  // Content
  htmlValue?: string;                     // Rich HTML (overrides value for display)
  placeholder?: string;
  minHeight?: number;                     // px, default 34 (default mode) / 20 (cell)
  readOnly?: boolean;

  // Hyperlinks
  availablePages?: Array<{ id: string; name: string }>;
  onHyperlinkClick?: (target: HyperlinkTarget) => void;

  // Selection & resize (default mode only)
  isSelected?: boolean;                   // Blue selection ring
  onSelect?: () => void;
  width?: number;                         // Element width in px
  maxWidth?: number;
  onWidthChange?: (width: number) => void;

  // Element styling (default mode only)
  borderColor?: string;                   // Default '#d1d5db'
  borderWidth?: number;                   // Default 2
  fillColor?: string;                     // Default 'transparent'

  // Events
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}
```

## External Dependencies

### NPM packages
- `react` (^18.3.1) — hooks, JSX
- `re-resizable` — width drag handle (default mode only)
- `lucide-react` — toolbar icons

### App dependencies (must be provided or replaced)
- `@/components/ui/button` — shadcn/ui Button component
- `@/components/ui/input` — shadcn/ui Input component
- `@/components/ui/label` — shadcn/ui Label component
- `@/components/ui/utils` — `cn()` classname merge utility (clsx + tailwind-merge)
- `@/utils/rte` — Rich text editor utilities (see below)
- `@/types` — Shared type definitions (see below)

### Shared types required (from `@/types` / `v2-types.ts`)

```typescript
type TextElMode = 'default' | 'title' | 'cell';
type HyperlinkMode = 'popup' | 'split' | 'newpage';
interface HyperlinkTarget { pageId: string; pageName: string; mode: HyperlinkMode; position?: { x: number; y: number } }
interface TextFormat { bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean; fontFamily?: string; fontSize?: string; color?: string; backgroundColor?: string; textAlign?: 'left' | 'center' | 'right' | 'justify'; listType?: 'bullet' | 'number' | null }
const LAYOUT = { MIN_ELEMENT_HEIGHT: 34, /* ... */ }
```

### RTE utilities required (from `@/utils/rte/`)

| File | Exports |
|------|---------|
| `history.ts` | `createHistoryController()`, `HistoryController`, `HistoryEntry` |
| `selectionBookmarks.ts` | `saveSelectionAsBookmarks()`, `restoreSelectionFromBookmarks()`, `clearBookmarks()` |
| `normalizeNodeTree.ts` | `normalizeNodeTree()` |
| `pasteSanitizer.ts` | `sanitizePastedHTML()`, `getClipboardContent()` |
| `canonicalizeStyle.ts` | `canonicalizeInlineStyle()`, `styleRecordToString()`, `areStylesEqual()` |

## Usage

```tsx
import { TextEl } from '@/components/elements/TextEl';

// Standalone text element with full features
<TextEl
  mode="default"
  value={text}
  htmlValue={html}
  onChange={(text, html) => save(text, html)}
  isSelected={selected}
  onSelect={() => setSelected(true)}
  width={400}
  onWidthChange={(w) => setWidth(w)}
  borderColor="#d1d5db"
  borderWidth={2}
  availablePages={pages}
  onHyperlinkClick={(target) => navigate(target)}
/>

// Inside a table cell (no resize, no border/fill)
<TextEl
  mode="cell"
  value={cellText}
  htmlValue={cellHtml}
  onChange={(text, html) => updateCell(text, html)}
  minHeight={29}
  readOnly={false}
  availablePages={pages}
  onHyperlinkClick={(target) => navigate(target)}
/>
```

## To use standalone in another project

1. Copy `src/components/elements/TextEl/` directory
2. Copy `src/utils/rte/` directory
3. Copy required types from `src/types/v2-types.ts` (TextElMode, TextFormat, HyperlinkTarget, HyperlinkMode, LAYOUT)
4. Provide or replace UI primitives: Button, Input, Label, cn utility
5. Install npm deps: `re-resizable`, `lucide-react`
