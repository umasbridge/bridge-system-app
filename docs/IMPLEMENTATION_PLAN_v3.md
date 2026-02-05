# Implementation Plan v3 - Bridge System App

## Overview

This document describes the architecture for creating, storing, and querying bridge bidding systems.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TYPESCRIPT LIBRARIES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────┐         ┌─────────────────────────────────┐   │
│  │    SYSTEMS LIBRARY      │         │     CONVENTIONS LIBRARY         │   │
│  │                         │         │                                 │   │
│  │  • 2/1 Base System      │────────▶│  • Stayman (over 1NT)           │   │
│  │  • SAYC (future)        │ refs    │  • Major Transfers (over 1NT)   │   │
│  │  • Precision (future)   │         │  • Jacoby 2NT (future)          │   │
│  │                         │         │  • ...more conventions          │   │
│  └─────────────────────────┘         └─────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CREATE SYSTEM FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User enters system name                                                 │
│  2. User selects base system (radio buttons)                                │
│  3. User answers system-level questions (Yes/No)                            │
│  4. User selects conventions (checkboxes)                                   │
│  5. User answers convention-specific questions (inline, Yes/No)             │
│  6. User clicks Save                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GENERATED .MD FILE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  # My Partnership System                                                    │
│                                                                             │
│  ## 1n = 15-17 HCP, balanced                                                │
│                                                                             │
│  ### 1n-(p)-2c = Stayman, asking for 4-card major                           │
│  - **2d** = No 4-card major                                                 │
│    - **2h** = To play, 5 hearts                                             │
│    - **2s** = To play, 5 spades                                             │
│  - **2h** = 4 hearts (may have 4 spades)                                    │
│  - **2s** = 4 spades, denies 4 hearts                                       │
│                                                                             │
│  ### 1n-(p)-2d = Transfer to hearts                                         │
│  - **2h** = Completes transfer                                              │
│  ...                                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE (PLANNED)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Parse .md into tree structure with PID for O(1) search/retrieve            │
│                                                                             │
│  bid_rules table:                                                           │
│  ┌────────┬──────────────────────┬─────────────┬──────────────────────────┐ │
│  │ id     │ path                 │ bid         │ meaning                  │ │
│  ├────────┼──────────────────────┼─────────────┼──────────────────────────┤ │
│  │ 1      │ 1n                   │ 1n          │ 15-17 HCP, balanced      │ │
│  │ 2      │ 1n/2c                │ 2c          │ Stayman                  │ │
│  │ 3      │ 1n/2c/2d             │ 2d          │ No 4-card major          │ │
│  │ 4      │ 1n/2c/2d/2h          │ 2h          │ To play, 5 hearts        │ │
│  └────────┴──────────────────────┴─────────────┴──────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FRONTEND PRESENTATION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  To be detailed later                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Systems Library

### Location
`src/conventions/`

### Structure

Each base system is a TypeScript file that exports a `SystemTemplate`:

```typescript
interface SystemTemplate {
  id: string;                      // e.g., 'two_over_one_base'
  name: string;                    // e.g., '2/1 Base System'
  description: string;             // Brief description
  systemOptions: ConventionOption[];   // System-level questions
  availableConventions: string[];      // IDs of compatible conventions
  generate: (
    systemAnswers: Record<string, boolean>,
    selectedConventions: string[],
    conventionAnswers: Record<string, boolean>
  ) => string;  // Returns markdown
}
```

### Current Systems

| ID | Name | Description | System Options |
|----|------|-------------|----------------|
| `two_over_one_base` | 2/1 Base System | 2/1 Game Force system | Forcing 1NT over 1M? |

### File: `src/conventions/two_over_one_base.ts`

```typescript
export const twoOverOneBase: SystemTemplate = {
  id: 'two_over_one_base',
  name: '2/1 Base System',
  description: '2/1 Game Force system',

  systemOptions: [
    {
      id: 'forcing_1nt_unpassed',
      question: 'Is 1NT over 1M forcing by an Unpassed Hand?',
      default: true
    }
  ],

  availableConventions: ['stayman_1nt', 'major_transfers_1nt'],

  generate: (systemAnswers, selectedConventions, conventionAnswers) => {
    // Returns markdown string with:
    // - Partnership Rules
    // - 1m Opening
    // - 1M Opening (conditional on forcing 1NT answer)
    // - 1n Opening (includes selected conventions)
    // - 2n Opening
    // - 2c Opening
    // - Preemptive Openings
    // - Competition
  }
};
```

---

## 2. Conventions Library

### Structure

Each convention is a TypeScript file that exports a `ConventionTemplate`:

```typescript
interface ConventionTemplate {
  id: string;                    // e.g., 'stayman_1nt'
  name: string;                  // e.g., 'Stayman (over 1NT)'
  description: string;           // Brief description
  options: ConventionOption[];   // Convention-specific questions
  generate: (answers: Record<string, boolean>) => string;  // Returns markdown
}

interface ConventionOption {
  id: string;        // Unique identifier
  question: string;  // Question text shown to user
  default: boolean;  // Default value
}
```

### Current Conventions

| ID | Name | Description | Options |
|----|------|-------------|---------|
| `stayman_1nt` | Stayman (over 1NT) | Responder bids 2C to ask for 4-card major | None |
| `major_transfers_1nt` | Major Transfers over 1NT | Transfer to Major, 3M is superacceptance with max | Super-accept with 2NT/new suit? |

### File: `src/conventions/stayman_1nt.ts`

```typescript
export const stayman1NT: ConventionTemplate = {
  id: 'stayman_1nt',
  name: 'Stayman (over 1NT)',
  description: 'Responder bids 2C over 1NT to ask for 4-card major',
  options: [],  // No user questions

  generate: (answers) => {
    // Returns markdown with full Stayman tree:
    // ### 1n-(p)-2c = Stayman
    // - **2d** = No 4-card major
    //   - **2h** = To play, 5 hearts
    //   - ...
    // - **2h** = 4 hearts
    // - **2s** = 4 spades
  }
};
```

### File: `src/conventions/major_transfers_1nt.ts`

```typescript
export const majorTransfers1NT: ConventionTemplate = {
  id: 'major_transfers_1nt',
  name: 'Major Transfers over 1NT',
  description: 'Transfer to Major, 3M is superacceptance with max',

  options: [
    {
      id: 'super_accept_2n_newsuit',
      question: 'Play 2NT and new suit bid by opener as super-accept?',
      default: false
    }
  ],

  generate: (answers) => {
    const superAccept = answers['super_accept_2n_newsuit'] || false;
    // Returns markdown with transfer structure
    // Conditionally includes super-accept bids if answer is true
  }
};
```

---

## 3. Create System Flow

### Location
`src/components/workspace-system/CreateSystemDialog.tsx`

### UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Create New System                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  System Name                                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ My Partnership System                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Base System                                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ● 2/1 Base System                                         │  │
│  │   2/1 Game Force system                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  System Options                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Is 1NT over 1M forcing by an Unpassed Hand?  [Yes] [No]   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Conventions to Include                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ☑ Stayman (over 1NT)                                      │  │
│  │   Responder bids 2C over 1NT to ask for 4-card major      │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ☑ Major Transfers over 1NT                                │  │
│  │   Transfer to Major, 3M is superacceptance with max       │  │
│  │   ┌───────────────────────────────────────────────────┐   │  │
│  │   │ Play 2NT and new suit as super-accept? [Yes] [No] │   │  │
│  │   └───────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Back] [Cancel] [Save]             │
└─────────────────────────────────────────────────────────────────┘
```

### State Variables

```typescript
// Selected base system ID
const [selectedSystemId, setSelectedSystemId] = useState<string>('');

// Answers to system-level questions
const [systemAnswers, setSystemAnswers] = useState<Record<string, boolean>>({});

// Selected convention IDs
const [selectedConventions, setSelectedConventions] = useState<string[]>([]);

// Answers to convention-specific questions
const [conventionAnswers, setConventionAnswers] = useState<Record<string, boolean>>({});

// User's system name
const [systemName, setSystemName] = useState('');
```

### Generation Flow

When user clicks **Save**:

1. Get the selected `SystemTemplate` by ID
2. Call `system.generate(systemAnswers, selectedConventions, conventionAnswers)`
3. Wrap with header: `# ${systemName}` + description
4. Download as `<systemName>.md`

```typescript
const generateMdContent = (): string => {
  const system = getSystemById(selectedSystemId);
  if (!system) return '';

  const lines: string[] = [];
  lines.push(`# ${systemName.trim()}`);
  lines.push('');
  lines.push('## Description');
  lines.push('');
  lines.push(system.description);
  lines.push('');
  lines.push('---');
  lines.push('');

  const content = system.generate(
    systemAnswers,
    selectedConventions,
    conventionAnswers
  );
  lines.push(content);

  return lines.join('\n');
};
```

---

## 4. Generated Markdown Format

### Tree Structure

The generated markdown uses a consistent tree format:

- `##` for major sections (headings)
- `###` for auction sequences
- `-` bullets for responses
- Indentation (2 spaces) for nested responses
- `**bid**` bold for the bid itself
- `=` separator between bid and meaning

### Example Output

```markdown
# My Partnership System

## Description

2/1 Game Force system

---

## Partnership Rules

---

## 1m Opening

### 1c = 3+ clubs, 11-21 HCP

- **1d** = 4+ diamonds, 6+ HCP, forcing
- **1h** = 4+ hearts, 6+ HCP, forcing
- **1s** = 4+ spades, 6+ HCP, forcing
- **1n** = 6-10 HCP, no 4-card major

### 1d = 3+ diamonds, 11-21 HCP

- **1h** = 4+ hearts, 6+ HCP, forcing
- **1s** = 4+ spades, 6+ HCP, forcing
- **1n** = 6-10 HCP, no 4-card major

---

## 1M Opening

### 1h = 5+ hearts, 11-21 HCP

- **1s** = 4+ spades, 6+ HCP, forcing
- **1n** = Forcing 1NT, 6-12 HCP
- **2c** = 2/1 Game Force, 5+ clubs, 13+ HCP
- **2d** = 2/1 Game Force, 5+ diamonds, 13+ HCP
- **2h** = Simple raise, 3+ hearts, 7-10 points
- **3h** = Limit raise, 3+ hearts, 10-12 points
- **4h** = To play

### 1s = 5+ spades, 11-21 HCP

- **1n** = Forcing 1NT, 6-12 HCP
- **2c** = 2/1 Game Force, 5+ clubs, 13+ HCP
- **2d** = 2/1 Game Force, 5+ diamonds, 13+ HCP
- **2h** = 2/1 Game Force, 5+ hearts, 12+ HCP
- **2s** = Simple raise, 3+ spades, 7-10 points
- **3s** = Limit raise, 3+ spades, 10-12 points
- **4s** = To play

---

## 1n = 15-17 HCP, balanced

### 1n-(p)-2c = Stayman, asking for 4-card major

- **2d** = No 4-card major
  - **2h** = To play, 5 hearts
  - **2s** = To play, 5 spades
  - **2n** = Invitational, balanced
  - **3n** = To play
- **2h** = 4 hearts (may have 4 spades)
  - **2s** = Forcing, 5 spades
  - **2n** = Invitational
  - **3h** = Invitational, 3 hearts
  - **4h** = To play
- **2s** = 4 spades, denies 4 hearts
  - **2n** = Invitational
  - **3s** = Invitational, 3 spades
  - **4s** = To play

### 1n-(p)-2d = Transfer to hearts

- **2h** = Completes transfer
  - **2n** = Invitational, 5 hearts
  - **3h** = Invitational, 6 hearts
  - **4h** = To play
- **3h** = Super-accept, 4 hearts, max

### 1n-(p)-2h = Transfer to spades

- **2s** = Completes transfer
  - **2n** = Invitational, 5 spades
  - **3s** = Invitational, 6 spades
  - **4s** = To play
- **3s** = Super-accept, 4 spades, max

---

## 2n = 20-21 HCP, balanced

---

## 2c = 22+ HCP, artificial, game forcing

- **2d** = Waiting, artificial
- **2h** = Positive, 5+ hearts, 8+ points
- **2s** = Positive, 5+ spades, 8+ points
- **2n** = Positive, balanced

---

## Preemptive Openings

### 2d = Weak, 6+ diamonds, 6-10 HCP

### 2h = Weak, 6+ hearts, 6-10 HCP

### 2s = Weak, 6+ spades, 6-10 HCP

### 3c = Preempt, 7+ clubs

### 3d = Preempt, 7+ diamonds

### 3h = Preempt, 7+ hearts

### 3s = Preempt, 7+ spades

---

## Competition
```

---

## 5. Database Integration (Planned)

### Purpose

Parse the generated .md file into a queryable database structure with tree paths (PID) for O(1) lookup.

### Target Schema: `bid_rules` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `system_id` | uuid | FK to systems table |
| `convention_id` | uuid | FK to conventions table (optional) |
| `path` | text | Materialized path (e.g., `1n/2c/2d`) |
| `bid` | text | The bid itself (e.g., `2d`) |
| `meaning` | text | Meaning/description |
| `parent_path` | text | Parent's path for tree traversal |
| `depth` | int | Nesting level |

### Query Examples

```sql
-- Find meaning of 2c after 1n
SELECT meaning FROM bid_rules
WHERE system_id = ? AND path = '1n/2c';

-- Get all responses to 1n-2c
SELECT bid, meaning FROM bid_rules
WHERE system_id = ? AND parent_path = '1n/2c'
ORDER BY bid;

-- Get full tree under 1n opening
SELECT * FROM bid_rules
WHERE system_id = ? AND path LIKE '1n/%'
ORDER BY path;
```

### Parser Requirements

1. Parse markdown headings (`##`, `###`) as root sequences
2. Parse bullet points (`-`) as responses
3. Track indentation for nesting depth
4. Extract bid from `**bid**` pattern
5. Extract meaning after `=` separator
6. Build materialized path from parent chain

---

## 6. Frontend Presentation (Planned)

To be detailed later.

---

## 7. File Structure

```
src/conventions/
├── types.ts                    # Type definitions
├── index.ts                    # Exports SYSTEMS, CONVENTIONS, helpers
├── two_over_one_base.ts        # 2/1 Base System
├── stayman_1nt.ts              # Stayman over 1NT
├── major_transfers_1nt.ts      # Major Transfers over 1NT
└── ...                         # Future conventions/systems

src/components/workspace-system/
├── CreateSystemDialog.tsx      # Create system flow UI
└── ...

docs/
├── IMPLEMENTATION_PLAN_v3.md   # This document
├── SYSTEM_TEMPLATE_FORMAT.md   # TypeScript template reference
└── ...
```

---

## 8. Adding New Content

### Adding a New Convention

1. Create `src/conventions/new_convention.ts`:

```typescript
import { ConventionTemplate } from './types';

export const newConvention: ConventionTemplate = {
  id: 'new_convention',
  name: 'Convention Name',
  description: 'Brief description',
  options: [
    // Add questions if needed
  ],
  generate: (answers) => {
    // Return markdown string
  }
};
```

2. Register in `src/conventions/index.ts`:

```typescript
import { newConvention } from './new_convention';

export const CONVENTIONS: ConventionTemplate[] = [
  stayman1NT,
  majorTransfers1NT,
  newConvention,  // Add here
];
```

3. Add to relevant system's `availableConventions`:

```typescript
availableConventions: ['stayman_1nt', 'major_transfers_1nt', 'new_convention'],
```

### Adding a New Base System

1. Create `src/conventions/new_system.ts`:

```typescript
import { SystemTemplate } from './types';

export const newSystem: SystemTemplate = {
  id: 'new_system',
  name: 'System Name',
  description: 'Description',
  systemOptions: [
    // System-level questions
  ],
  availableConventions: ['stayman_1nt', 'major_transfers_1nt'],
  generate: (systemAnswers, selectedConventions, conventionAnswers) => {
    // Return markdown string
  }
};
```

2. Register in `src/conventions/index.ts`:

```typescript
import { newSystem } from './new_system';

export const SYSTEMS: SystemTemplate[] = [
  twoOverOneBase,
  newSystem,  // Add here
];
```

---

## 9. Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Type definitions | ✅ Complete | `src/conventions/types.ts` |
| 2/1 Base System | ✅ Complete | `src/conventions/two_over_one_base.ts` |
| Stayman convention | ✅ Complete | `src/conventions/stayman_1nt.ts` |
| Major Transfers convention | ✅ Complete | `src/conventions/major_transfers_1nt.ts` |
| Index exports | ✅ Complete | `src/conventions/index.ts` |
| CreateSystemDialog UI | ✅ Complete | `src/components/workspace-system/CreateSystemDialog.tsx` |
| .md file generation | ✅ Complete | Downloads on Save |
| .md parser | ❌ Planned | Parse into bid_rules table |
| Database schema | ❌ Planned | bid_rules table design |
| Frontend presentation | ❌ Planned | To be detailed |

---

## 10. Version History

| Version | Date | Changes |
|---------|------|---------|
| v1 | - | Initial implementation plan |
| v2 | - | Added TypeScript template architecture |
| v3 | 2026-01-31 | Comprehensive documentation of full flow |
