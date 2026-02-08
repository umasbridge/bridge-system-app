# BidTable — Hierarchical Bidding Table Module

Self-contained hierarchical 2-column table (Bid | Meaning) with unlimited nesting, column resize, row operations, color fills, hyperlinks, and undo/redo. Handles its own selection ring.

**Depends on:** [TextEl](../TextEl/) module (used for all editable cells).

## Files

| File | Purpose |
|------|---------|
| `BidTable.tsx` | Main component — row state management, undo/redo stack, copy/paste, column width tracking, selection ring |
| `BidTableRow.tsx` | Row renderer (recursive) — bid/meaning cells via TextEl, re-resizable columns, keyboard shortcuts, hover actions, color picker, merge toggle |
| `BidTableNameHeader.tsx` | Optional name header row — TextEl for editable title, delete button |
| `ColorPicker.tsx` | Predefined color palette (8 colors) for bid cell background fill |
| `index.ts` | Barrel exports |

## Architecture

```
BidTable
├── BidTableNameHeader (optional, uses TextEl mode="cell")
└── BidTableRow (recursive for nested children)
    ├── Resizable (bid column, via re-resizable)
    │   └── TextEl mode="cell" (bid content)
    ├── Resizable (meaning column, via re-resizable)
    │   └── TextEl mode="cell" (meaning content)
    ├── ColorPicker (portal, for bid cell fill)
    └── BidTableRow[] (children, indented)
```

## Props (BidTableProps)

```typescript
interface BidTableProps {
  // Data
  initialRows?: RowData[];
  initialLevelWidths?: Record<number, number>;  // Bid column width per nesting level
  initialMeaningWidth?: number;                  // Default 680
  initialName?: string;
  initialNameHtml?: string;
  initialShowName?: boolean;

  // Change callbacks
  onRowsChange?: (rows: RowData[]) => void;
  onLevelWidthsChange?: (levelWidths: Record<number, number>) => void;
  onMeaningWidthChange?: (meaningWidth: number) => void;
  onNameChange?: (name: string) => void;
  onNameHtmlChange?: (htmlContent: string) => void;
  onShowNameChange?: (showName: boolean) => void;

  // Display
  isViewMode?: boolean;                         // Read-only mode
  isActive?: boolean;                           // Enable/disable interactions
  gridlines?: GridlineOptions;                  // Custom grid styling
  maxWidth?: number;                            // Max meaning column width
  defaultRowHeight?: number;                    // Min row height in px (default 29)
  onDefaultRowHeightChange?: (height: number) => void;

  // Selection (self-contained — handles own ring + border-click detection)
  isSelected?: boolean;
  onSelect?: () => void;

  // Hyperlinks
  availablePages?: Array<{ id: string; name: string }>;
  onHyperlinkClick?: (target: HyperlinkTarget) => void;
}
```

## Data Structure (RowData)

```typescript
interface RowData {
  id: string;
  bid: string;                  // Plain text bid ("1NT", "2C")
  bidHtml?: string;             // Rich HTML bid
  bidFillColor?: string;        // Hex color for bid cell background
  meaning: string;              // Plain text meaning
  meaningHtml?: string;         // Rich HTML meaning
  children: RowData[];          // Nested child rows (unlimited depth)
  collapsed?: boolean;          // Children hidden
  isMerged?: boolean;           // Bid + meaning merged into single cell
}
```

## Self-Contained Features

- **Resize** — element-level width resize via drag handle on right edge. Uses `re-resizable`. Dragging adjusts `meaningWidth` which controls total table width. Only active when `isSelected=true` and `isViewMode=false`. Internal column resize handles also available for bid/meaning column proportion.
- **Selection** — blue ring (boxShadow) when `isSelected=true`. Border-click detection (6px edge zone) triggers `onSelect()`.
- **Row operations** — add/delete/copy/paste rows with undo. Keyboard shortcuts + hover menu.
- **Column resize** — bid column width per nesting level (`levelWidths`), meaning column width (`meaningWidth`). Both via internal re-resizable handles.
- **Color fills** — per-cell background color via ColorPicker popup.
- **Hyperlinks** — click-through navigation in bid/meaning cells (delegated to TextEl).

## Features

### Row operations (hover menu on meaning cell bottom border)
- **+up** — Add row above
- **+down** — Add row below
- **++** — Add child row (creates nesting)
- **-** — Add parent sibling (when nested)
- **Merge toggle** — Combine bid + meaning into one cell
- **Copy/Paste** — Row-level clipboard (sessionStorage)
- **Delete** — Remove row with undo (Ctrl+Z within 60s)

### Keyboard shortcuts
| Key | Action |
|-----|--------|
| `Ctrl/Cmd + Z` | Undo last row deletion |
| `Ctrl/Cmd + Shift + C` | Copy focused row |
| `Ctrl/Cmd + Shift + V` | Paste row below focused |

### Column resize
- Bid column and meaning column independently resizable via drag handle
- Bid column width stored per nesting level (`levelWidths`)
- Meaning column width stored globally (`meaningWidth`)
- Container uses `display: inline-block` (sizes to content, not parent)

### Selection
- Blue ring (`boxShadow`) when `isSelected=true`
- Border-click detection (6px edge zone) triggers `onSelect()`
- Mirrors TextEl's selection pattern

## External Dependencies

### NPM packages
- `react` (^18.3.1) — hooks, JSX
- `react-dom` — `createPortal` for color picker popup
- `re-resizable` — element-level width resize (BidTable.tsx) + column resize (BidTableRow.tsx)
- `lucide-react` — icons (Undo, X)

### Internal module dependencies
- **TextEl** (`@/components/elements/TextEl`) — renders all editable cells (mode="cell")
- `@/components/ui/button` — shadcn/ui Button (in ColorPicker)

### Shared types required (from `@/types` / `v2-types.ts`)

```typescript
interface RowData { id: string; bid: string; bidHtml?: string; bidFillColor?: string; meaning: string; meaningHtml?: string; children: RowData[]; collapsed?: boolean; isMerged?: boolean }
interface GridlineOptions { enabled: boolean; color: string; width: number; style?: 'solid' | 'dashed' | 'dotted' }
type HyperlinkMode = 'popup' | 'split' | 'newpage';
interface HyperlinkTarget { pageId: string; pageName: string; mode: HyperlinkMode; position?: { x: number; y: number } }
```

## Usage

```tsx
import { BidTable } from '@/components/elements/BidTable';

<BidTable
  initialRows={rows}
  initialMeaningWidth={680}
  initialLevelWidths={{ 0: 80 }}
  onRowsChange={(rows) => save({ rows })}
  onMeaningWidthChange={(w) => save({ meaningWidth: w })}
  onLevelWidthsChange={(lw) => save({ levelWidths: lw })}
  isViewMode={false}
  isSelected={selected}
  onSelect={() => setSelected(true)}
  gridlines={{ enabled: true, color: '#D1D5DB', width: 1, style: 'solid' }}
  availablePages={pages}
  onHyperlinkClick={(target) => navigate(target)}
  maxWidth={754}
/>
```

## To use standalone in another project

1. Copy `src/components/elements/BidTable/` directory
2. Copy `src/components/elements/TextEl/` directory (required dependency)
3. Copy `src/utils/rte/` directory (required by TextEl)
4. Copy required types from `src/types/v2-types.ts`
5. Provide or replace: shadcn/ui Button, cn utility
6. Install npm deps: `re-resizable`, `lucide-react`

## Module boundary

BidTable + TextEl together form a complete element editing system:
- **TextEl** = atomic rich text unit (formatting, hyperlinks, resize)
- **BidTable** = composite table built from TextEl cells (nesting, row ops, column resize)
- Both handle their own selection ring via `isSelected`/`onSelect`
- Both are callback-driven (no internal persistence)
