# Bridge System App - Data Structure Design

## Overview

This document describes the data architecture for the Bridge System App, covering:
1. Conceptual structure (workspaces, elements, hierarchy)
2. Database schema (tables, fields, relationships)
3. Data flow (input, editing, output)
4. Retrieval capabilities (queries, search)
5. Future extensibility (AI enrichment)

---

## 1. Conceptual Structure

### 1.1 Workspace Types

The top-level construct is a **workspace**. There are three types:

| Type | Description | Created By | Example |
|------|-------------|------------|---------|
| `bidding_system` | A complete bidding system | User from dashboard | "2/1 Game Force", "Precision" |
| `bidding_convention` | A reusable convention module | Admin (library) | "Stayman", "Jacoby Transfers" |
| `user_defined` | A linked workspace within a system | User via hyperlink | "1M Openings", "Slam Bidding" |

### 1.2 Hierarchy

```
Workspace (bidding_system)
├── Element (systems-table): "Table of Contents"
├── Element (text): "General Agreements"
│
└── [Hyperlinks to user_defined workspaces]
        │
        ▼
    Workspace (user_defined): "1NT Opening"
    ├── Element (systems-table): "Responses to 1NT"
    │   └── bid_rules (tree of bids/meanings)
    ├── Element (text): "Notes on Stayman"
    └── Element (pdf): "Reference Card"
```

### 1.3 Elements

A workspace contains **elements** of various types:

| Element Type | Description | Data Storage |
|--------------|-------------|--------------|
| `systems-table` | Bidding table with nested rows | `bid_rules` table |
| `text` | Rich text content | `elements.data.htmlContent` |
| `pdf` | PDF document viewer | `elements.data` (page images) |
| `image` | Image element | `elements.data.src` |
| `file` | Generic file attachment | `elements.data` |

### 1.4 Links Between Workspaces

Hyperlinks connect workspaces together:
- Stored in `meaning_html_content` of bid_rules
- Or in `htmlContent` of text elements
- Format: `<a data-workspace="WorkspaceName" data-link-type="split-view">...</a>`

Link types:
- `split-view`: Opens target in side-by-side view
- `new-page`: Navigates to target workspace
- `comment`: Opens as popup overlay

---

## 2. Database Schema

### 2.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        workspaces                           │
│─────────────────────────────────────────────────────────────│
│  id (PK)                                                    │
│  user_id (FK → auth.users)                                  │
│  type: 'bidding_system'|'bidding_convention'|'user_defined' │
│  title                                                      │
│  title_html_content                                         │
│  parent_workspace_id (FK → workspaces, nullable)            │
│  description_html                                           │
│  canvas_width, canvas_height, left_margin, top_margin       │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:many
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         elements                            │
│─────────────────────────────────────────────────────────────│
│  id (PK)                                                    │
│  workspace_id (FK → workspaces)                             │
│  type: 'systems-table'|'text'|'pdf'|'image'|'file'          │
│  name                                                       │
│  position: {x, y}                                           │
│  size: {width, height}                                      │
│  z_index                                                    │
│  data (JSONB) - element-specific data                       │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:many (for systems-table only)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        bid_rules                            │
│─────────────────────────────────────────────────────────────│
│  id (PK)                                                    │
│  element_id (FK → elements)                                 │
│  parent_id (FK → bid_rules, self-ref for tree)              │
│                                                             │
│  -- Display fields --                                       │
│  bid                                                        │
│  bid_html_content                                           │
│  bid_fill_color                                             │
│  meaning                                                    │
│  meaning_html_content                                       │
│  sort_order                                                 │
│  collapsed                                                  │
│  is_merged                                                  │
│                                                             │
│  -- Retrieval fields --                                     │
│  auction_path (computed: "1n-(p)-2c-(p)-2d")                │
│  depth (tree level: 0, 1, 2, ...)                           │
│  search_vector (tsvector for full-text search)              │
│                                                             │
│  -- Extensible attributes --                                │
│  attributes (JSONB for future AI enrichment)                │
│                                                             │
│  created_at, updated_at                                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 bid_rules Table (Detailed)

This is the core table for bidding system content:

```sql
CREATE TABLE bid_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    element_id UUID REFERENCES elements(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES bid_rules(id) ON DELETE CASCADE,

    -- DISPLAY FIELDS (for frontend rendering)
    bid TEXT NOT NULL,                    -- "2c", "pass", "dbl"
    bid_html_content TEXT,                -- rich formatted bid
    bid_fill_color TEXT,                  -- cell background color
    meaning TEXT,                         -- plain text meaning
    meaning_html_content TEXT,            -- rich text with hyperlinks
    sort_order INTEGER DEFAULT 0,         -- ordering among siblings
    collapsed BOOLEAN DEFAULT false,      -- UI collapse state
    is_merged BOOLEAN DEFAULT false,      -- merged bid+meaning cell

    -- RETRIEVAL FIELDS (computed on save)
    auction_path TEXT,                    -- "1n-(p)-2c-(p)-2d"
    depth INTEGER DEFAULT 0,              -- tree level

    -- FULL-TEXT SEARCH
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(bid, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(meaning, '')), 'B')
    ) STORED,

    -- EXTENSIBLE (for future AI)
    attributes JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bid_rules_element ON bid_rules(element_id);
CREATE INDEX idx_bid_rules_parent ON bid_rules(parent_id);
CREATE INDEX idx_bid_rules_auction_path ON bid_rules(auction_path);
CREATE INDEX idx_bid_rules_search ON bid_rules USING GIN(search_vector);
CREATE INDEX idx_bid_rules_meaning_trgm ON bid_rules USING GIN(meaning gin_trgm_ops);
```

### 2.3 Data Structure Pattern

The `bid_rules` table uses **Adjacency List with Materialized Path**:

| Pattern | Field | Purpose |
|---------|-------|---------|
| **Adjacency List** | `parent_id` | Tree structure for hierarchy |
| **Materialized Path** | `auction_path` | Flat path for O(1) retrieval |

This hybrid approach gives us:
- Tree structure that matches UI (nested rows)
- Fast retrieval without recursive queries

---

## 3. Data Flow

### 3.1 Single Source of Truth

```
┌─────────────────────────────────────────────────────────────┐
│                    bid_rules table                          │
│                  (SINGLE SOURCE OF TRUTH)                   │
└─────────────────────────────────────────────────────────────┘
                    ▲                     │
                    │                     │
              WRITE │                     │ READ
                    │                     │
          ┌─────────┴─────────┐   ┌───────┴────────┐
          │   User Edits      │   │  Frontend      │
          │   - Add row       │   │  Display       │
          │   - Edit meaning  │   │                │
          │   - Delete row    │   │  Retrieval     │
          │   - Reorder       │   │  Queries       │
          └───────────────────┘   └────────────────┘
```

**No duplication**: Table content lives ONLY in `bid_rules`, not in `elements.data.initialRows`.

### 3.2 Load Flow (Database → Frontend)

```typescript
// Step 1: Query flat rows from database
const { data: rows } = await supabase
  .from('bid_rules')
  .select('*')
  .eq('element_id', elementId)
  .order('depth')
  .order('sort_order');

// Step 2: Build nested RowData tree
function buildTree(rows: BidRule[], parentId: string | null = null): RowData[] {
  return rows
    .filter(r => r.parent_id === parentId)
    .map(r => ({
      id: r.id,
      bid: r.bid,
      bidHtmlContent: r.bid_html_content,
      bidFillColor: r.bid_fill_color,
      meaning: r.meaning,
      meaningHtmlContent: r.meaning_html_content,
      collapsed: r.collapsed,
      isMerged: r.is_merged,
      children: buildTree(rows, r.id)  // Recursively build children
    }));
}

const nestedRows: RowData[] = buildTree(rows);
// → Ready to render in SystemsTable component
```

### 3.3 Save Flow (Frontend → Database)

```typescript
// Step 1: Flatten nested RowData to flat rows
function flattenTree(
  rows: RowData[],
  elementId: string,
  parentId: string | null = null,
  parentPath: string = '',
  depth: number = 0
): BidRuleInsert[] {
  const result: BidRuleInsert[] = [];

  rows.forEach((row, index) => {
    // Compute auction_path by appending to parent's path
    const auctionPath = parentPath
      ? `${parentPath}-(p)-${row.bid.toLowerCase()}`
      : row.bid.toLowerCase();

    result.push({
      id: row.id,
      element_id: elementId,
      parent_id: parentId,
      bid: row.bid,
      bid_html_content: row.bidHtmlContent,
      bid_fill_color: row.bidFillColor,
      meaning: row.meaning,
      meaning_html_content: row.meaningHtmlContent,
      sort_order: index,
      collapsed: row.collapsed,
      is_merged: row.isMerged,
      auction_path: auctionPath,  // Computed path
      depth: depth
    });

    // Recursively flatten children
    if (row.children?.length) {
      result.push(...flattenTree(
        row.children,
        elementId,
        row.id,        // This row becomes parent
        auctionPath,   // Pass path for children to extend
        depth + 1
      ));
    }
  });

  return result;
}

// Step 2: Upsert to database
const flatRows = flattenTree(nestedRows, elementId);
await supabase.from('bid_rules').upsert(flatRows);
```

### 3.4 Edit Operations

| Operation | How It Works |
|-----------|--------------|
| **Add row** | Insert new `bid_rules` row with `parent_id` set to parent row |
| **Edit cell** | Update `bid`, `meaning`, or `*_html_content` fields |
| **Delete row** | Delete row (CASCADE deletes children via FK) |
| **Reorder** | Update `sort_order` for affected siblings |
| **Collapse/Expand** | Update `collapsed` boolean |
| **Move row** | Update `parent_id` to new parent |

On every save, `auction_path` is recomputed for all affected rows.

---

## 4. Retrieval Capabilities

### 4.1 Query Type 1: Bid → Meaning

Given an auction sequence, retrieve the meaning.

```sql
-- "What does 1N-2C-2D mean?"
SELECT bid, meaning, meaning_html_content, auction_path
FROM bid_rules br
JOIN elements e ON br.element_id = e.id
WHERE e.workspace_id = $system_id
  AND br.auction_path = '1n-(p)-2c-(p)-2d';
```

**Performance**: O(1) via `auction_path` index.

### 4.2 Query Type 2: Meaning → Bid

Given a meaning description, find the corresponding bid.

```sql
-- "Which bid shows 4+ hearts, game forcing?"
SELECT bid, meaning, auction_path
FROM bid_rules br
JOIN elements e ON br.element_id = e.id
WHERE e.workspace_id = $system_id
  AND br.meaning ILIKE '%4+ hearts%'
  AND br.meaning ILIKE '%game forcing%';
```

**Performance**: Uses trigram index for pattern matching.

### 4.3 Query Type 3: Keyword Search

Full-text search across bids and meanings.

```sql
-- Search for "stayman" anywhere
SELECT bid, meaning, auction_path,
       ts_rank(search_vector, query) AS rank
FROM bid_rules br
JOIN elements e ON br.element_id = e.id,
     plainto_tsquery('english', 'stayman') query
WHERE e.workspace_id = $system_id
  AND br.search_vector @@ query
ORDER BY rank DESC;
```

**Performance**: Uses GIN index on `search_vector`.

### 4.4 Query Type 4: Get Continuations

Given a position in the auction, get all possible next bids.

```sql
-- "What can I bid after 1N-2C?"
SELECT bid, meaning, auction_path
FROM bid_rules br
JOIN elements e ON br.element_id = e.id
WHERE e.workspace_id = $system_id
  AND br.auction_path LIKE '1n-(p)-2c-(p)-%'
  AND br.depth = 2  -- Direct children only
ORDER BY br.sort_order;
```

---

## 5. Auction Path Format

### 5.1 Notation

| Symbol | Meaning |
|--------|---------|
| `1n`, `2c`, `3h`, etc. | Bids (lowercase) |
| `(p)` | Pass (opponent or partner) |
| `(x)` | Opponent's double |
| `(2h)` | Opponent's bid |
| `-` | Separator between calls |

### 5.2 Examples

| Auction | auction_path |
|---------|--------------|
| 1NT opening | `1n` |
| 1NT - Pass - 2C | `1n-(p)-2c` |
| 1NT - Pass - 2C - Pass - 2D | `1n-(p)-2c-(p)-2d` |
| 1NT - (2H overcall) - Double | `1n-(2h)-x` |
| Pass - Pass - 1S | `(p)-(p)-1s` |

### 5.3 Computing auction_path

The path is computed on save by walking up the tree:

```typescript
function computeAuctionPath(row: RowData, parentPath: string): string {
  const bidNormalized = row.bid.toLowerCase()
    .replace('♠', 's').replace('♥', 'h')
    .replace('♦', 'd').replace('♣', 'c')
    .replace('nt', 'n').replace('pass', 'p')
    .replace('dbl', 'x').replace('rdbl', 'xx');

  if (!parentPath) {
    return bidNormalized;
  }
  return `${parentPath}-(p)-${bidNormalized}`;
}
```

---

## 6. Future Extensibility (AI)

### 6.1 The attributes JSONB Column

The `attributes` column allows AI to enrich rules with structured data:

```json
{
  "hcp_min": 10,
  "hcp_max": 12,
  "total_points_min": 10,
  "suit_length": {
    "spades": {"min": 5},
    "hearts": {"max": 3}
  },
  "shape": "unbalanced",
  "forcing": "invitational",
  "alertable": true,
  "explanation": "Transfer to spades, invitational values"
}
```

### 6.2 AI Enrichment Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  bid_rules row  │ ──► │  AI Analysis    │ ──► │  Updated row    │
│  meaning: "5+   │     │  - Parse HCP    │     │  attributes: {  │
│  spades, inv"   │     │  - Parse shape  │     │    hcp_min: 10  │
│  attributes: {} │     │  - Parse suits  │     │    suit_length: │
└─────────────────┘     └─────────────────┘     │    {spades: 5+} │
                                                │  }              │
                                                └─────────────────┘
```

### 6.3 Querying AI-Enriched Data

```sql
-- "Find bids requiring 5+ spades and 10-12 HCP"
SELECT bid, meaning, auction_path
FROM bid_rules br
JOIN elements e ON br.element_id = e.id
WHERE e.workspace_id = $system_id
  AND (br.attributes->>'hcp_min')::int <= 12
  AND (br.attributes->>'hcp_max')::int >= 10
  AND (br.attributes->'suit_length'->'spades'->>'min')::int >= 5;
```

### 6.4 Bid Recommendation (Future)

Given a hand with pre-computed features:

```sql
-- Hand: 13 HCP, 5 spades, 3 hearts, 3 diamonds, 2 clubs
-- Auction so far: 1n-(p)-?

SELECT bid, meaning, auction_path
FROM bid_rules br
JOIN elements e ON br.element_id = e.id
WHERE e.workspace_id = $system_id
  AND br.auction_path LIKE '1n-(p)-%'
  AND br.depth = 1
  AND (br.attributes->>'hcp_min' IS NULL
       OR (br.attributes->>'hcp_min')::int <= 13)
  AND (br.attributes->>'hcp_max' IS NULL
       OR (br.attributes->>'hcp_max')::int >= 13)
  -- Additional suit/shape constraints...
ORDER BY
  -- Prioritize more specific matches
  (CASE WHEN br.attributes->>'hcp_min' IS NOT NULL THEN 1 ELSE 0 END) DESC;
```

---

## 7. Summary

### 7.1 Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Single source of truth** | All table data in `bid_rules`, not duplicated |
| **UI-friendly structure** | Tree via `parent_id` matches nested RowData |
| **Fast retrieval** | Materialized `auction_path` enables O(1) lookup |
| **Flexible search** | Full-text search + trigram indexes |
| **Extensible** | JSONB `attributes` for future AI enrichment |

### 7.2 Table Responsibilities

| Table | Responsibility |
|-------|----------------|
| `workspaces` | System/convention containers, metadata, layout |
| `elements` | Visual elements (tables, text, pdfs), position, size |
| `bid_rules` | Bidding content: display, hierarchy, retrieval, search |

### 7.3 Key Fields in bid_rules

| Category | Fields |
|----------|--------|
| **Display** | `bid`, `meaning`, `*_html_content`, `sort_order`, `collapsed` |
| **Hierarchy** | `parent_id`, `depth` |
| **Retrieval** | `auction_path`, `search_vector` |
| **Future** | `attributes` (JSONB) |

---

## 8. Migration Path

To implement this design, the following changes are needed:

1. **Add retrieval fields to bid_rules**:
   - `auction_path TEXT`
   - `depth INTEGER`
   - `search_vector tsvector`
   - `attributes JSONB`

2. **Add indexes**:
   - Index on `auction_path`
   - GIN index on `search_vector`
   - Trigram index on `meaning`

3. **Update frontend**:
   - Load: Query `bid_rules` → build nested RowData
   - Save: Flatten RowData → compute `auction_path` → upsert

4. **Remove elements.data.initialRows**:
   - Table content now lives only in `bid_rules`
