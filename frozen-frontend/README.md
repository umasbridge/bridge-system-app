# Frozen Frontend — V2 Module Architecture

Snapshot of the frontend implementation as of 2026-02-07.
Three self-contained modules that compose the page editing experience.

## Module Overview

```
frozen-frontend/
├── page-v2/              # Module 1: Page container
│   ├── Page.tsx           # Main page component (layout, element rendering, format panel, dynamic width)
│   ├── TitleBar.tsx       # Editable page title (uses TextEl mode="default")
│   ├── DescBar.tsx        # Editable description (uses TextEl mode="default")
│   ├── PageFormatPanel.tsx# Page-level formatting (margins, border, background, spacing)
│   ├── TableOfContents.tsx# Navigation sidebar (hyperlinks to other pages)
│   └── index.ts
│
├── elements/
│   ├── BidTable/          # Module 2: Hierarchical bidding table
│   │   ├── BidTable.tsx    # Main table (row state, undo/redo, element resize, selection ring)
│   │   ├── BidTableRow.tsx # Recursive row renderer (cells, column resize, hover actions)
│   │   ├── BidTableNameHeader.tsx # Optional editable table name
│   │   ├── ColorPicker.tsx # Bid cell background color picker
│   │   ├── index.ts
│   │   └── README.md
│   │
│   └── TextEl/            # Module 3: Rich text editor
│       ├── TextEl.tsx      # Main component (3 modes: default/title/cell, resize, selection)
│       ├── useRichText.ts  # Core hook (selection, formatting, undo/redo, paste, hyperlinks)
│       ├── TextFormatPanel.tsx # Inline formatting toolbar
│       ├── BlockFormatBar.tsx  # Block-level toolbar (alignment, lists)
│       ├── HyperlinkMenu.tsx   # Hyperlink creation popup
│       ├── types.ts        # TypeScript interfaces
│       ├── index.ts
│       └── README.md
│
├── types/                 # Shared type definitions
│   ├── v2-types.ts        # Page, Element, RowData, TextFormat, HyperlinkTarget, LAYOUT
│   └── index.ts
│
├── utils/rte/             # Rich text editor stability layer
│   ├── canonicalizeStyle.ts   # Style normalization (hex colors, font weights)
│   ├── history.ts             # Undo/redo controller (50 entries, selection preservation)
│   ├── normalizeNodeTree.ts   # DOM normalization (merge spans, remove empties)
│   ├── pasteSanitizer.ts      # Paste cleanup (Google Docs, Word)
│   ├── selectionBookmarks.ts  # Selection preservation across DOM mutations
│   └── index.ts
│
└── v2-adapter.ts          # V1 (Supabase DB) <-> V2 (frontend) data conversion

```

---

## Module 1: Page (`page-v2/`)

The page container that renders a vertical stack of elements with configurable margins, borders, and spacing.

**Key behaviors:**
- Dynamic page width calculated from widest element + margins
- Left margin and right margin independently configurable (stored as `leftMargin` / `topMargin` in DB)
- Elements rendered in order with configurable gap (`elementSpacing`)
- Page format panel triggered by clicking the page border (6px edge detection)
- Title bar and description bar above the content area
- Bottom button bar with insert/paste/share controls

**Props pattern:** Page receives data as a `Page` object + callbacks for changes. It orchestrates element rendering but delegates all element-level behavior to the element modules.

**Element rendering:** Each element is wrapped in a simple `<div>` with controls overlay. The element component (BidTable or TextEl) handles its own selection ring, resize, and interactions.

```tsx
// Uniform element rendering pattern
<div key={element.id} className="relative">
  {renderControls()}  // move/delete/copy toolbar (shown when selected)
  <BidTable ... isSelected={isSelected} onSelect={...} />
  // or
  <TextEl ... isSelected={isSelected} onSelect={...} />
</div>
```

---

## Module 2: BidTable (`elements/BidTable/`)

Self-contained hierarchical 2-column table (Bid | Meaning) with unlimited nesting.

**Key behaviors:**
- Container uses `display: inline-block` (sizes to content, not parent)
- Meaning column uses hard `width` (not flex) for reliable resize
- Element-level resize via drag handle on right edge (adjusts `width` prop)
- Internal column resize: bid column per nesting level, meaning column globally
- Row operations via hover menu: add above/below, add child, merge, copy/paste, delete
- Selection ring (boxShadow) when `isSelected=true`, border-click detection (6px edge)
- Undo/redo for row deletions (Ctrl+Z within 60s)

**Depends on:** TextEl (mode="cell" for all editable cells)

**Data flow:**
```
Page → BidTable (rows, width, levelWidths, isSelected, onSelect)
BidTable → BidTableRow (recursive, per-row data + column widths)
BidTableRow → TextEl mode="cell" (bid content, meaning content)
```

See `elements/BidTable/README.md` for full props and data structure.

---

## Module 3: TextEl (`elements/TextEl/`)

Self-contained rich text editor with 3 operating modes.

| Feature | `default` | `title` | `cell` |
|---------|-----------|---------|--------|
| Rich text formatting | Yes | Yes | Yes |
| Hyperlinks | Yes | No | Yes |
| Bullet/number lists | Yes | No | No |
| Resize (width) | Yes | No | No |
| Border/fill styling | Yes | No | No |
| Selection ring | Yes | No | No |
| Single line | No | Yes | No |

**Key behaviors:**
- contenteditable-based editing with custom formatting engine
- Selection-aware formatting toolbar appears on text selection
- Hyperlink creation with page search and mode selection (popup/split/newpage)
- Undo/redo with HTML snapshots and selection restoration
- Paste sanitization cleans HTML from Google Docs/Word
- DOM normalization ensures consistent structure after mutations

**Data flow:**
```
Parent → TextEl (value, htmlValue, onChange, mode, isSelected)
TextEl → useRichText hook (manages contenteditable state)
useRichText → utils/rte/* (history, bookmarks, normalization, sanitization)
```

See `elements/TextEl/README.md` for full props and types.

---

## Module Interactions

```
┌─────────────────────────────────────────────┐
│ Page                                         │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │ TitleBar     │  │ PageFormatPanel      │ │
│  │ (TextEl)     │  │ (margins/border/bg)  │ │
│  └──────────────┘  └──────────────────────┘ │
│  ┌──────────────┐                            │
│  │ DescBar      │                            │
│  │ (TextEl)     │                            │
│  └──────────────┘                            │
│  ┌──────────────────────────────────────────┐│
│  │ Content Area (vertical stack)            ││
│  │  ┌──────────────────────────────────┐    ││
│  │  │ BidTable                          │   ││
│  │  │  ├─ BidTableNameHeader (TextEl)   │   ││
│  │  │  └─ BidTableRow (recursive)       │   ││
│  │  │      ├─ TextEl cell (bid)         │   ││
│  │  │      └─ TextEl cell (meaning)     │   ││
│  │  └──────────────────────────────────┘    ││
│  │  ┌──────────────────────────────────┐    ││
│  │  │ TextEl (default mode, standalone) │   ││
│  │  └──────────────────────────────────┘    ││
│  └──────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

## Shared Dependencies

### NPM packages
- `react` (^18.3.1), `react-dom`
- `re-resizable` — element and column resize handles
- `lucide-react` — toolbar icons
- shadcn/ui: `Button`, `Input`, `Label`, `cn()` utility

### V2 Adapter (`v2-adapter.ts`)
Converts between V1 Supabase DB format and V2 frontend format:
- `workspaceToPage()` — V1 Workspace → V2 Page
- `v2ElementToV1Update()` — V2 element changes → V1 DB updates
- `convertHyperlinksToV2()` / `convertHyperlinksToV1()` — hyperlink format conversion
- `convertRowsV1toV2()` / `convertRowsV2toV1()` — row data field name mapping

### Key Field Mappings (V1 DB → V2 Frontend)
| V1 (Supabase) | V2 (Frontend) |
|---|---|
| `meaningWidth` | `width` |
| `bidHtmlContent` | `bidHtml` |
| `meaningHtmlContent` | `meaningHtml` |
| `nameHtmlContent` | `nameHtml` |
| `data-workspace-link` | `data-page-id` + `data-link-mode` |
| `leftMargin` | `leftMargin` (left padding) |
| `topMargin` | `topMargin` (right padding — repurposed) |

---

## To Use in Another Project

1. Copy `elements/TextEl/`, `elements/BidTable/`, `page-v2/`
2. Copy `types/` and `utils/rte/`
3. Install: `re-resizable`, `lucide-react`
4. Provide: shadcn/ui primitives (Button, Input, Label, cn)
5. Wire up data layer via adapter or direct V2 types
