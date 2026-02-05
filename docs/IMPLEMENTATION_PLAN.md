# Bridge System App - Implementation Plan

## Overview

This document defines the architecture for building, storing, and managing bridge bidding systems. The core design separates **libraries** (read-only templates) from **user systems** (editable copies), with a **Priority-Indexed Database (PID)** as the single source of truth.

---

## 1. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LIBRARY (Read-Only)                            │
├─────────────────────────────────┬───────────────────────────────────────────┤
│       System Library            │           Convention Library              │
│  ┌───────────────────────┐      │      ┌───────────────────────┐            │
│  │ 2_1_game_force.md     │      │      │ stayman_1nt.md        │            │
│  │ sayc.md               │      │      │ jacoby_transfers.md   │            │
│  │ precision.md          │      │      │ jacoby_2nt.md         │            │
│  └───────────────────────┘      │      │ lebensohl.md          │            │
│                                 │      │ cappelletti.md        │            │
│  Contains:                      │      │ ...                   │            │
│  - Opening bids                 │      └───────────────────────┘            │
│  - Basic responses              │                                           │
│  - Rebids                       │      Contains:                            │
│  - Competitive basics           │      - Trigger sequence                   │
│  - NO conventions               │      - All follow-up sequences            │
│                                 │      - Tree structure                     │
└─────────────────────────────────┴───────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER SYSTEM CREATION                              │
│                                                                             │
│   User selects:                                                             │
│   ┌─────────────────┐     ┌─────────────────────────────────────┐          │
│   │ Base: 2/1 GF    │  +  │ Conventions: [stayman_1nt,          │          │
│   └─────────────────┘     │              jacoby_transfers,      │          │
│                           │              jacoby_2nt,            │          │
│                           │              cappelletti]           │          │
│                           └─────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PARSER ENGINE                                  │
│                                                                             │
│   1. Load base system sequences                                             │
│   2. For each convention in list:                                           │
│      - Load convention module from library                                  │
│      - Copy all sequences with module_id tag                                │
│   3. Write all rules to PID with proper priority                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRIORITY-INDEXED DATABASE (PID)                          │
│                         [Supabase - PostgreSQL]                             │
│                                                                             │
│                      *** SINGLE SOURCE OF TRUTH ***                         │
│                                                                             │
│   See Section 3 for detailed schema                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│      VISUAL EDITOR (App)      │   │      EXPORT (Normalized)      │
│                               │   │                               │
│   - User views system         │   │   - Generate .md file         │
│   - User edits sequences      │   │   - Generate .pdf             │
│   - Changes write to PID      │   │   - Share with partner        │
│   - Real-time updates         │   │                               │
└───────────────────────────────┘   └───────────────────────────────┘
```

---

## 2. Data Flow

### 2.1 System Creation Flow

```
User Action                    System Response
───────────────────────────────────────────────────────────────────────
1. "Create new system"    →    Show base system picker
2. Select "2/1 GF"        →    Show convention checklist
3. Check conventions      →    Store selections
4. "Create"               →    Parser executes:
                               a. Load 2_1_game_force.md
                               b. Load each checked convention .md
                               c. Parse all sequences
                               d. Write to PID with module_id tags
                               e. Redirect to visual editor
```

### 2.2 Edit Flow

```
User Action                    System Response
───────────────────────────────────────────────────────────────────────
1. Edit sequence meaning  →    UPDATE bidding_rules SET meaning = ?
                               WHERE system_id = ? AND sequence = ?

2. Add new sequence       →    INSERT INTO bidding_rules (...)
                               module_id = 'user_custom'

3. Delete sequence        →    DELETE FROM bidding_rules
                               WHERE system_id = ? AND sequence = ?
```

### 2.3 Convention Swap Flow

```
User Action                    System Response
───────────────────────────────────────────────────────────────────────
1. "Replace Stayman       →    Transaction:
    with Puppet Stayman"       a. DELETE FROM bidding_rules
                                  WHERE system_id = ?
                                  AND module_id = 'stayman_1nt'
                               b. Load puppet_stayman_1nt.md
                               c. INSERT all sequences with
                                  module_id = 'puppet_stayman_1nt'
                               d. UPDATE systems SET conventions = ...
```

### 2.4 Export Flow

```
User Action                    System Response
───────────────────────────────────────────────────────────────────────
1. "Export as PDF"        →    a. Query all rules for system_id
                               b. Group by module_id
                               c. Generate normalized .md format
                               d. Convert .md → .pdf
                               e. Download
```

---

## 3. Priority-Indexed Database (PID) Schema

### 3.1 Core Tables

```sql
-- Systems table (user's system metadata)
CREATE TABLE systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    base_system TEXT NOT NULL,           -- '2_1_game_force' | 'sayc' | 'precision'
    conventions TEXT[] NOT NULL,          -- ['stayman_1nt', 'jacoby_transfers', ...]
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(user_id, name)
);

-- Bidding rules table (the PID)
CREATE TABLE bidding_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id UUID REFERENCES systems(id) ON DELETE CASCADE,

    -- Sequence identification
    sequence TEXT NOT NULL,               -- '1n-(p)-2c-(p)-2d'

    -- Meaning and description
    meaning TEXT NOT NULL,                -- 'No 4-card major'

    -- Modularity tracking
    module_type TEXT NOT NULL,            -- 'base' | 'convention' | 'user_custom'
    module_id TEXT,                       -- 'stayman_1nt' | null for base

    -- Priority for conflict resolution
    priority INTEGER DEFAULT 0,           -- Higher = more specific

    -- Optional structured data (for advanced queries)
    hcp_min INTEGER,
    hcp_max INTEGER,
    total_points_min INTEGER,
    total_points_max INTEGER,
    suit_length JSONB,                    -- {"hearts": "5+", "spades": "4+"}
    shape_constraints JSONB,              -- {"balanced": true}
    forcing TEXT,                         -- 'forcing' | 'game_forcing' | 'invitational' | 'signoff'

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(system_id, sequence)
);

-- Definitions table (non-sequence rules)
CREATE TABLE definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id UUID REFERENCES systems(id) ON DELETE CASCADE,

    term TEXT NOT NULL,                   -- 'limit_raise'
    definition TEXT NOT NULL,             -- '10-12 support points, 3+ card support'
    module_id TEXT,                       -- null for base, or convention name

    UNIQUE(system_id, term)
);

-- Indexes for performance
CREATE INDEX idx_rules_system ON bidding_rules(system_id);
CREATE INDEX idx_rules_sequence ON bidding_rules(sequence);
CREATE INDEX idx_rules_module ON bidding_rules(module_id);
CREATE INDEX idx_rules_priority ON bidding_rules(system_id, priority DESC);
```

### 3.2 Priority Resolution

When multiple rules could match a sequence, priority determines which applies:

```
Priority Levels:
───────────────────────────────────────────────────────────────────────
1000+    User custom overrides (user edited a convention sequence)
500-999  Convention-specific sequences (deeper in tree = higher)
100-499  Base system sequences
0-99     Fallback/general rules
```

**Priority Calculation:**
```
priority = base_priority + (sequence_depth * 10)

Where:
- base_priority: 100 (base), 500 (convention), 1000 (user_custom)
- sequence_depth: number of bids in sequence (1n-2c-2d = 3)
```

**Example:**
```
sequence                    module_id        priority
─────────────────────────────────────────────────────
1n                          base             100 + 10 = 110
1n-(p)-2c                   stayman_1nt      500 + 20 = 520
1n-(p)-2c-(p)-2d            stayman_1nt      500 + 30 = 530
1n-(p)-2c-(p)-2d-(p)-2h     stayman_1nt      500 + 40 = 540
1n-(p)-2c-(p)-2d-(p)-2h     user_custom      1000 + 40 = 1040  ← user edited
```

### 3.3 Query Examples

**Get meaning for a sequence:**
```sql
SELECT meaning, module_id
FROM bidding_rules
WHERE system_id = $1 AND sequence = $2
ORDER BY priority DESC
LIMIT 1;
```

**Get all sequences for a convention:**
```sql
SELECT sequence, meaning, priority
FROM bidding_rules
WHERE system_id = $1 AND module_id = $2
ORDER BY sequence;
```

**Get full system export:**
```sql
SELECT
    COALESCE(module_id, 'base') as section,
    sequence,
    meaning
FROM bidding_rules
WHERE system_id = $1
ORDER BY
    CASE module_type
        WHEN 'base' THEN 1
        WHEN 'convention' THEN 2
        WHEN 'user_custom' THEN 3
    END,
    module_id,
    sequence;
```

---

## 4. PID Retrieval Tasks

The PID supports two primary retrieval modes:

### 4.1 Sequence → Meaning Lookup

**Use case:** User clicks on a bid in the auction, wants to see what it means.

```
Input:  system_id, sequence (e.g., "1n-(p)-2c-(p)-2d")
Output: meaning, module_id, and optionally all possible continuations
```

**Query: Get meaning of specific sequence**
```sql
SELECT meaning, module_id, forcing
FROM bidding_rules
WHERE system_id = $1 AND sequence = $2
ORDER BY priority DESC
LIMIT 1;
```

**Query: Get all continuations from a position**
```sql
-- Find all bids that can follow "1n-(p)-2c-(p)-2d"
SELECT
    sequence,
    meaning,
    -- Extract just the next bid from the sequence
    SUBSTRING(sequence FROM LENGTH($2) + 2) as next_bid
FROM bidding_rules
WHERE system_id = $1
  AND sequence LIKE $2 || '-(%)-%'  -- Matches 1n-(p)-2c-(p)-2d-(p)-X
  AND LENGTH(sequence) - LENGTH($2) BETWEEN 5 AND 8  -- Just one more bid
ORDER BY sequence;
```

**Query: Get full convention tree**
```sql
-- Get all sequences for Stayman convention
SELECT sequence, meaning, priority
FROM bidding_rules
WHERE system_id = $1 AND module_id = 'stayman_1nt'
ORDER BY LENGTH(sequence), sequence;
```

---

### 4.2 Hand + Auction → Bid Recommendation

**Use case:** Bidding practice. Given a hand and the auction so far, what should I bid?

```
Input:
  - system_id
  - hand_data: {hcp, total_points, spades, hearts, diamonds, clubs, is_balanced, controls, ...}
    (Assume hand analysis is done externally and all attributes are available)
  - auction_so_far: "1n-(p)"
  - seat: "responder"
  - vulnerability: "none"

Output:
  - recommended_bid: "2h"
  - meaning: "Transfer to spades"
  - alternatives: [{bid: "3n", meaning: "Signoff, 10-15 HCP balanced"}]
```

#### 4.2.1 Candidate Bid Query

Find all possible bids from current position that match the hand:

```sql
-- Get all possible next bids from current auction position
-- that match the hand constraints
SELECT
    sequence,
    meaning,
    priority,
    forcing,
    -- Extract the bid being made (last element of sequence)
    SPLIT_PART(sequence, '-', -1) as bid
FROM bidding_rules
WHERE system_id = $1
  -- Match the auction prefix (what's happened so far)
  AND sequence LIKE $2 || '-%'
  -- One bid beyond current position (responder's turn)
  AND (LENGTH(sequence) - LENGTH(REPLACE(sequence, '-', ''))) = $3
  -- HCP constraints
  AND (hcp_min IS NULL OR hcp_min <= $4)
  AND (hcp_max IS NULL OR hcp_max >= $4)
  -- Total points constraints
  AND (total_points_min IS NULL OR total_points_min <= $5)
  AND (total_points_max IS NULL OR total_points_max >= $5)
ORDER BY priority DESC;
```

#### 4.2.2 Constraint Matching Logic

For each candidate bid, check constraints against hand_data:

| Rule Constraint | Check Against hand_data |
|-----------------|-------------------------|
| hcp_min / hcp_max | hand_data.hcp |
| total_points_min / total_points_max | hand_data.total_points |
| suit_length (e.g., `{"spades": "5+"}`) | hand_data.spades >= 5 |
| shape_constraints.balanced | hand_data.is_balanced |
| controls_min | hand_data.controls |

**Scoring:**
```
score = rule.priority
      + bonus for extra suit length beyond minimum
      + bonus for forcing bids when hand is strong
```

#### 4.2.3 Bid Selection Algorithm

```
1. Query all candidate bids from current auction position
2. For each candidate:
   - Check all constraints against hand_data
   - Calculate score (priority + bonuses)
   - Discard if any constraint fails
3. Sort by score descending
4. Return highest-scoring bid as recommendation
5. Return next 2-3 as alternatives
```

#### 4.2.4 Example Walkthrough

```
hand_data: {hcp: 13, total_points: 14, spades: 5, hearts: 2,
            diamonds: 3, clubs: 3, is_balanced: false}
Auction: 1n-(p)-?
System: 2/1 with Jacoby Transfers

Step 1: Query candidates for "1n-(p)-"
─────────────────────────────────────
  Found rules:
  - 1n-(p)-2c: Stayman (requires 4-card major)
  - 1n-(p)-2d: Transfer to hearts (requires 5+ hearts)
  - 1n-(p)-2h: Transfer to spades (requires 5+ spades)
  - 1n-(p)-2n: Invitational (requires balanced, 8-9 HCP)
  - 1n-(p)-3n: Signoff (requires balanced, 10-15 HCP)

Step 2: Match constraints against hand_data
─────────────────────────────────────
  1n-(p)-2h: spades=5 >= 5 ✓ → score = 520
  1n-(p)-3n: is_balanced=false ✗ → rejected
  1n-(p)-2c: no 4-card major ✗ → rejected
  1n-(p)-2d: hearts=2 < 5 ✗ → rejected

Step 3: Result
─────────────────────────────────────
  recommended_bid: "2h"
  meaning: "Transfer to spades, 5+ spades"
  alternatives: []
```

---

### 4.3 Structured Data Requirements

For bid recommendation to work, rules need structured data. The `meaning` text is for humans; the structured fields are for the engine:

```sql
-- Example: Well-structured rule for Jacoby Transfer
INSERT INTO bidding_rules (
    system_id,
    sequence,
    meaning,
    module_type,
    module_id,
    priority,
    -- Structured data for retrieval
    hcp_min,
    hcp_max,
    total_points_min,
    total_points_max,
    suit_length,
    shape_constraints,
    forcing
) VALUES (
    $system_id,
    '1n-(p)-2h',
    'Transfer to spades, 5+ spades',
    'convention',
    'jacoby_transfers_1nt',
    520,
    -- Structured data
    0,          -- hcp_min (can be 0 for weak hands)
    NULL,       -- hcp_max (no upper limit)
    0,          -- total_points_min
    NULL,       -- total_points_max
    '{"spades": "5+"}',  -- suit_length
    NULL,       -- shape_constraints (no shape requirement)
    'forcing'   -- forcing status
);
```

### 4.4 Enrichment Strategy

Convention files contain human-readable meanings. During parsing, we extract structured data:

| Meaning Text Pattern | Extracted Structured Data |
|---------------------|---------------------------|
| "13-15 HCP" | hcp_min: 13, hcp_max: 15 |
| "5+ spades" | suit_length: {"spades": "5+"} |
| "balanced" | shape_constraints: {"balanced": true} |
| "game forcing" | forcing: "game_forcing" |
| "invitational" | forcing: "invitational" |
| "to play" / "signoff" | forcing: "signoff" |

---

## 5. File Formats

### 5.1 Base System File Format

```markdown
# 2/1 Game Force

## Info
type: base_system
version: 1.0

---

## Definitions

limit_raise = 10-12 support points, 3+ card support
game_force = 13+ points, forcing to game
invitational = 10-12 points, partner may pass

---

## Opening Bids

1c = 3+ clubs, 11-21 HCP, may be short
1d = 3+ diamonds, 11-21 HCP
1h = 5+ hearts, 11-21 HCP
1s = 5+ spades, 11-21 HCP
1n = 15-17 HCP, balanced
2c = 22+ HCP, artificial, game forcing
2d = Weak, 6+ diamonds, 5-10 HCP
2h = Weak, 6+ hearts, 5-10 HCP
2s = Weak, 6+ spades, 5-10 HCP
2n = 20-21 HCP, balanced

---

## Responses to 1m

1c-(p)-1d = 4+ diamonds, 6+ HCP, forcing
1c-(p)-1h = 4+ hearts, 6+ HCP, forcing
...

---

## Responses to 1M

1h-(p)-1s = 4+ spades, 6+ HCP, forcing
1h-(p)-1n = Forcing 1NT, 6-12 HCP
1h-(p)-2c = 2/1 Game Force, 5+ clubs, 13+ HCP
1h-(p)-2h = Simple raise, 3+ hearts, 7-10 points
1h-(p)-3h = Limit raise, 3+ hearts, 10-12 points
...

---
```

### 5.2 Convention File Format

```markdown
# Stayman (over 1NT)

## Info
type: convention
id: stayman_1nt
applies_to: [2_1_game_force, sayc, precision]
version: 1.0
variants: [garbage_stayman, puppet_stayman]

---

## Tree

```
1n-(p)-2c = Stayman, asks for 4-card major
│
├─(p)-2d = No 4-card major
│   ├─(p)-p = To play
│   ├─(p)-2h = Pass or correct, weak with both majors
│   │   ├─(p)-p = 3 hearts, to play
│   │   └─(p)-2s = 2 hearts, 3 spades, to play
│   ├─(p)-2n = Invitational
│   ...
├─(p)-2h = 4+ hearts, may have 4 spades
│   ...
└─(p)-2s = 4+ spades, denies 4 hearts
    ...
```

---

## Sequences

1n-(p)-2c = Stayman, asks for 4-card major
1n-(p)-2c-(p)-2d = No 4-card major
1n-(p)-2c-(p)-2h = 4+ hearts, may have 4 spades
1n-(p)-2c-(p)-2s = 4+ spades, denies 4 hearts
1n-(p)-2c-(p)-2d-(p)-p = To play
1n-(p)-2c-(p)-2d-(p)-2h = Pass or correct, weak with both majors
...

---
```

### 5.3 User System Export Format

```markdown
# Uma + PS 2/1

## Info
base: 2_1_game_force
created: 2026-01-23
conventions:
  - stayman_1nt
  - jacoby_transfers_1nt
  - jacoby_2nt
  - cappelletti

---

## Definitions

limit_raise = 10-12 support points, 3+ card support
game_force = 13+ points, forcing to game

---

## Opening Bids

1c = 3+ clubs, 11-21 HCP
1d = 3+ diamonds, 11-21 HCP
...

---

## [stayman_1nt]

1n-(p)-2c = Stayman, asks for 4-card major
1n-(p)-2c-(p)-2d = No 4-card major
...

---

## [jacoby_transfers_1nt]

1n-(p)-2d = Transfer to hearts
1n-(p)-2d-(p)-2h = Completes transfer
...

---

## [user_custom]

1n-(p)-2c-(p)-2d-(p)-2h = MODIFIED: Weak with 5-4 majors
...

---
```

---

## 5. Implementation Phases

### Phase 1: Library Foundation
- [ ] Create base system files (2/1, SAYC)
- [ ] Create convention files (start with Stayman, Jacoby Transfers)
- [ ] Define file format specifications
- [ ] Build parser for .md → JSON

### Phase 2: Database Setup
- [ ] Create Supabase tables (systems, bidding_rules, definitions)
- [ ] Implement RLS policies
- [ ] Build API functions for CRUD operations
- [ ] Test priority resolution queries

### Phase 3: System Creation Flow
- [ ] UI for base system selection
- [ ] UI for convention checklist
- [ ] Parser integration (files → PID)
- [ ] System creation API

### Phase 4: Visual Editor Integration
- [ ] Connect existing workspace editor to PID
- [ ] Real-time updates on edit
- [ ] Convention swap UI
- [ ] User custom sequence handling

### Phase 5: Export
- [ ] PID → normalized .md generator
- [ ] .md → PDF converter
- [ ] Share/download functionality

---

## 6. Open Questions

1. **Versioning**: Should we track convention versions? (e.g., stayman_1nt_v2)
2. **Conflicts**: How to handle when user edits conflict with base system?
3. **Partnerships**: How to handle shared systems between partners?
4. **Undo**: Transaction-level undo for convention swaps?

---

## Appendix: Convention Library Checklist

### Over 1NT/2NT
- [ ] stayman_1nt
- [ ] puppet_stayman_1nt
- [ ] jacoby_transfers_1nt
- [ ] texas_transfers_1nt
- [ ] minor_transfers_1nt
- [ ] smolen
- [ ] gerber

### Major Suit Raises
- [ ] jacoby_2nt
- [ ] splinters
- [ ] bergen_raises
- [ ] reverse_drury

### Slam Bidding
- [ ] rkcb_0314
- [ ] rkcb_1430
- [ ] gerber
- [ ] exclusion_rkcb

### Competitive
- [ ] negative_doubles
- [ ] responsive_doubles
- [ ] support_doubles
- [ ] cappelletti
- [ ] dont
- [ ] lebensohl
- [ ] michaels
- [ ] unusual_nt

### Checkback
- [ ] new_minor_forcing
- [ ] xyz
- [ ] fourth_suit_forcing

### Other
- [ ] two_way_game_tries
- [ ] soloway_jump_shifts
- [ ] inverted_minors
