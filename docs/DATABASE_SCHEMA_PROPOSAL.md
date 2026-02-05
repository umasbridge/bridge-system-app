# Database Schema Proposal

This document proposes schema changes to support the frontend design with user editing capabilities.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM PAGE (TOC)                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Heading (clickable)          │  Meaning                            │    │
│  ├───────────────────────────────┼─────────────────────────────────────┤    │
│  │  1m Opening                   │  Minor suit openings                │    │
│  │  1M Opening                   │  Major suit openings                │    │
│  │  1NT Opening                  │  15-17 balanced                     │    │
│  │  Slam Bidding                 │  Blackwood, Gerber, cue bids        │    │
│  │  [+ Add Heading]              │                                     │    │
│  └───────────────────────────────┴─────────────────────────────────────┘    │
│                                                                             │
│  User can: Add headings, reorder, edit, delete                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Click heading
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SPLIT VIEW (Section Content)                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Bid        │  Meaning                                              │    │
│  ├─────────────┼───────────────────────────────────────────────────────┤    │
│  │  1c         │  3+ clubs, 11-21 HCP                                  │    │
│  │    1d       │  4+ diamonds, forcing                                 │    │
│  │    1h       │  4+ hearts, forcing                                   │    │
│  │    1n       │  6-10 HCP, see [Stayman]← hyperlink                   │    │
│  │  1d         │  3+ diamonds, 11-21 HCP                               │    │
│  │    ...      │                                                       │    │
│  └─────────────┴───────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  TEXT BOX: Additional notes about minor openings...                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  User can: Add rows, nest rows, add text boxes, create hyperlinks           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Click hyperlink [Stayman]
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMMENT VIEW (Convention)                          │
│                                                                             │
│  Convention content appears as overlay/modal                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Proposed Schema

### 1. `sections` Table (NEW)

TOC entries for a system. Each section is a heading that appears in the system page.

```sql
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Display
  title TEXT NOT NULL,                    -- "1m Opening"
  meaning TEXT,                           -- "Minor suit openings" (shown in TOC)
  title_html TEXT,                        -- Rich text formatting for title
  meaning_html TEXT,                      -- Rich text formatting for meaning

  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Source tracking
  source_convention_id UUID REFERENCES workspaces(id), -- If generated from convention
  is_user_added BOOLEAN DEFAULT false,                 -- User created this heading

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sections_system_id ON sections(system_id);
CREATE INDEX idx_sections_sort_order ON sections(system_id, sort_order);
```

### 2. `bid_rules` Table (MODIFY)

Add section linkage and content type.

```sql
-- Add new columns to existing bid_rules table
ALTER TABLE bid_rules ADD COLUMN section_id UUID REFERENCES sections(id) ON DELETE CASCADE;
ALTER TABLE bid_rules ADD COLUMN content_type TEXT DEFAULT 'bid'
  CHECK (content_type IN ('bid', 'text', 'note'));
ALTER TABLE bid_rules ADD COLUMN is_user_added BOOLEAN DEFAULT false;
ALTER TABLE bid_rules ADD COLUMN source_convention_id UUID REFERENCES workspaces(id);

CREATE INDEX idx_bid_rules_section_id ON bid_rules(section_id);
```

**Updated `bid_rules` structure:**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `section_id` | UUID | **NEW** - Links to TOC section |
| `parent_id` | UUID | Tree structure (existing) |
| `bid` | TEXT | The bid (existing) |
| `meaning` | TEXT | Meaning (existing) |
| `auction_path` | TEXT | Materialized path (existing) |
| `depth` | INTEGER | Nesting level (existing) |
| `search_vector` | TSVECTOR | Full-text search (existing) |
| `content_type` | TEXT | **NEW** - 'bid', 'text', 'note' |
| `is_user_added` | BOOLEAN | **NEW** - User created this |
| `source_convention_id` | UUID | **NEW** - If from convention template |
| `workspace_id` | UUID | Links to system (existing) |

### 3. `hyperlinks` Table (NEW)

Tracks all hyperlinks within a system. Supports user-created links.

```sql
CREATE TABLE hyperlinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Source: Where the hyperlink appears
  source_type TEXT NOT NULL CHECK (source_type IN ('bid_rule', 'section', 'text_element')),
  source_id UUID NOT NULL,               -- ID of bid_rule, section, or element
  source_text TEXT,                      -- The clickable text (e.g., "Stayman")
  source_start_offset INTEGER,           -- Position in meaning text (for inline links)
  source_end_offset INTEGER,

  -- Target: What the hyperlink points to
  target_type TEXT NOT NULL CHECK (target_type IN ('convention', 'section', 'bid_rule', 'external')),
  target_id UUID,                        -- ID of convention/section/rule (NULL for external)
  target_url TEXT,                       -- For external links

  -- Link behavior
  link_mode TEXT DEFAULT 'comment' CHECK (link_mode IN ('comment', 'split', 'newpage')),

  -- Source tracking
  is_user_added BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hyperlinks_system_id ON hyperlinks(system_id);
CREATE INDEX idx_hyperlinks_source ON hyperlinks(source_type, source_id);
CREATE INDEX idx_hyperlinks_target ON hyperlinks(target_type, target_id);
```

### 4. `system_conventions` Table (NEW)

Links a system to its conventions with user customization.

```sql
CREATE TABLE system_conventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  convention_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Convention configuration (user's answers to convention questions)
  config JSONB DEFAULT '{}',             -- e.g., {"super_accept_2n_newsuit": true}

  -- User customization
  is_enabled BOOLEAN DEFAULT true,       -- User can disable a convention
  is_modified BOOLEAN DEFAULT false,     -- User has modified the convention content
  custom_content JSONB,                  -- User's modifications to convention

  -- Ordering (for display in convention list)
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(system_id, convention_id)
);

CREATE INDEX idx_system_conventions_system ON system_conventions(system_id);
CREATE INDEX idx_system_conventions_convention ON system_conventions(convention_id);
```

### 5. `workspaces` Table (MODIFY)

Already has `type` column. Ensure it supports:

```sql
-- Existing check constraint, may need update
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_type_check;
ALTER TABLE workspaces ADD CONSTRAINT workspaces_type_check
  CHECK (type IN ('bidding_system', 'bidding_convention', 'user_convention', 'user_defined'));
```

| Type | Purpose |
|------|---------|
| `bidding_system` | Main system (has TOC, sections) |
| `bidding_convention` | Library convention (Stayman, Transfers) |
| `user_convention` | User-created convention |
| `user_defined` | Legacy/other |

---

## Data Flow

### 1. Create System from Template

```
User clicks "Build from Base System"
         │
         ▼
┌─────────────────────────────────────┐
│  Select: 2/1 Base System            │
│  Answer: Forcing 1NT? [Yes]         │
│  Select: ☑ Stayman ☑ Transfers      │
│  Answer: Super-accept? [No]         │
│  Name: "My System"                  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Generate .md file                  │
│  (or directly to database)          │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Create records:                    │
│                                     │
│  workspaces: {                      │
│    id: 'sys-123',                   │
│    title: 'My System',              │
│    type: 'bidding_system'           │
│  }                                  │
│                                     │
│  sections: [                        │
│    {title: '1m Opening', ...},      │
│    {title: '1M Opening', ...},      │
│    {title: '1NT Opening',           │
│     source_convention_id: null},    │
│  ]                                  │
│                                     │
│  bid_rules: [                       │
│    {bid: '1c', section_id: ...},    │
│    {bid: '1d', parent_id: ...},     │
│    ...                              │
│  ]                                  │
│                                     │
│  system_conventions: [              │
│    {convention_id: 'stayman',       │
│     config: {}},                    │
│    {convention_id: 'transfers',     │
│     config: {super_accept: false}}, │
│  ]                                  │
│                                     │
│  hyperlinks: [                      │
│    {source: rule-456,               │
│     target: 'stayman',              │
│     link_mode: 'comment'},          │
│  ]                                  │
└─────────────────────────────────────┘
```

### 2. User Edits System

```
┌─────────────────────────────────────┐
│  ADD HEADING                        │
│                                     │
│  User clicks [+ Add Heading]        │
│         │                           │
│         ▼                           │
│  INSERT INTO sections (             │
│    system_id, title, meaning,       │
│    is_user_added, sort_order        │
│  ) VALUES (                         │
│    'sys-123', 'Competition',        │
│    'Competitive bidding', true, 5   │
│  );                                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ADD BID ROW                        │
│                                     │
│  User adds row in section           │
│         │                           │
│         ▼                           │
│  INSERT INTO bid_rules (            │
│    section_id, parent_id, bid,      │
│    meaning, is_user_added,          │
│    content_type                     │
│  ) VALUES (                         │
│    'sec-123', 'rule-456', '2n',     │
│    'Unusual 2NT', true, 'bid'       │
│  );                                 │
│  -- Recalculate auction_path        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  CREATE HYPERLINK                   │
│                                     │
│  User selects text, creates link    │
│         │                           │
│         ▼                           │
│  INSERT INTO hyperlinks (           │
│    system_id, source_type,          │
│    source_id, source_text,          │
│    target_type, target_id,          │
│    link_mode, is_user_added         │
│  ) VALUES (                         │
│    'sys-123', 'bid_rule',           │
│    'rule-789', 'Michaels',          │
│    'convention', 'conv-456',        │
│    'comment', true                  │
│  );                                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  MODIFY CONVENTION                  │
│                                     │
│  User edits convention content      │
│         │                           │
│         ▼                           │
│  UPDATE system_conventions SET      │
│    is_modified = true,              │
│    custom_content = '{...}'         │
│  WHERE system_id = 'sys-123'        │
│    AND convention_id = 'stayman';   │
└─────────────────────────────────────┘
```

### 3. Query Examples

```sql
-- Get TOC for a system
SELECT id, title, meaning, sort_order
FROM sections
WHERE system_id = ?
ORDER BY sort_order;

-- Get content for a section (split view)
SELECT id, bid, meaning, parent_id, depth, content_type
FROM bid_rules
WHERE section_id = ?
ORDER BY sort_order, auction_path;

-- Get hyperlinks for a section
SELECT h.*,
       CASE
         WHEN h.target_type = 'convention' THEN w.title
         WHEN h.target_type = 'section' THEN s.title
       END as target_title
FROM hyperlinks h
LEFT JOIN workspaces w ON h.target_id = w.id AND h.target_type = 'convention'
LEFT JOIN sections s ON h.target_id = s.id AND h.target_type = 'section'
WHERE h.source_id IN (SELECT id FROM bid_rules WHERE section_id = ?);

-- Search across system (existing search_vector works)
SELECT br.*, s.title as section_title
FROM bid_rules br
JOIN sections s ON br.section_id = s.id
WHERE br.workspace_id = ?
  AND br.search_vector @@ plainto_tsquery(?);

-- Get conventions used by system
SELECT w.id, w.title, sc.config, sc.is_modified
FROM system_conventions sc
JOIN workspaces w ON sc.convention_id = w.id
WHERE sc.system_id = ?
  AND sc.is_enabled = true
ORDER BY sc.sort_order;
```

---

## Migration Strategy

### Phase 1: Create New Tables

```sql
-- 1. Create sections table
CREATE TABLE sections (...);

-- 2. Create hyperlinks table
CREATE TABLE hyperlinks (...);

-- 3. Create system_conventions table
CREATE TABLE system_conventions (...);

-- 4. Add columns to bid_rules
ALTER TABLE bid_rules ADD COLUMN section_id UUID REFERENCES sections(id);
ALTER TABLE bid_rules ADD COLUMN content_type TEXT DEFAULT 'bid';
ALTER TABLE bid_rules ADD COLUMN is_user_added BOOLEAN DEFAULT false;
ALTER TABLE bid_rules ADD COLUMN source_convention_id UUID;
```

### Phase 2: Migrate Existing Data

```sql
-- For existing systems, create default section
INSERT INTO sections (system_id, title, meaning, sort_order)
SELECT DISTINCT workspace_id, 'Main', 'Main content', 0
FROM bid_rules
WHERE workspace_id IS NOT NULL;

-- Link existing bid_rules to their section
UPDATE bid_rules br
SET section_id = (
  SELECT id FROM sections s
  WHERE s.system_id = br.workspace_id
  LIMIT 1
)
WHERE br.workspace_id IS NOT NULL;
```

### Phase 3: Update Application Code

1. Modify CreateSystemDialog to insert into new tables
2. Update System Page to read from sections
3. Update Split View to read bid_rules by section
4. Add hyperlink creation/display UI
5. Add convention management UI

---

## PDF Export Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MY PARTNERSHIP SYSTEM                                                       │
│                                                                             │
│  Table of Contents                                                          │
│  ─────────────────                                                          │
│  1. 1m Opening .......................... 2                                 │
│  2. 1M Opening .......................... 4                                 │
│  3. 1NT Opening ......................... 6                                 │
│  4. Competition ......................... 8                                 │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  1. 1M OPENING                                                              │
│                                                                             │
│  ┌─────────┬────────────────────────────────────────────────────────────┐   │
│  │ Bid     │ Meaning                                                    │   │
│  ├─────────┼────────────────────────────────────────────────────────────┤   │
│  │ 1h      │ 5+ hearts, 11-21 HCP                                       │   │
│  │   1s    │ 4+ spades, forcing                                         │   │
│  │   1n    │ Forcing 1NT, see Stayman [1]                               │   │
│  │   2c    │ 2/1 GF, 5+ clubs                                           │   │
│  └─────────┴────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [1] Stayman: Responder bids 2C to ask for 4-card major                     │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  COMMON CONVENTIONS                                                         │
│                                                                             │
│  A. Stayman (over 1NT)                                                      │
│     [Full convention tree here]                                             │
│                                                                             │
│  B. Major Transfers (over 1NT)                                              │
│     [Full convention tree here]                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Table | Purpose | User Editable |
|-------|---------|---------------|
| `workspaces` | System/convention container | Name, settings |
| `sections` | TOC headings | Add, edit, delete, reorder |
| `bid_rules` | Bid tree content | Add, edit, delete, nest |
| `hyperlinks` | Links to conventions/sections | Create, edit, delete |
| `system_conventions` | Convention config per system | Enable/disable, modify config |

**Key Features Preserved:**
- ✅ Full-text search via `search_vector`
- ✅ Tree structure via `parent_id` and `auction_path`
- ✅ O(1) path lookup via `auction_path`

**New Capabilities:**
- ✅ TOC with clickable headings
- ✅ User can add/edit headings
- ✅ User can create hyperlinks
- ✅ User can modify conventions
- ✅ Track user changes vs template content
- ✅ PDF export with ref numbers
