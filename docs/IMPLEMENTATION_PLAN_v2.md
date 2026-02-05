# Bridge System App - Implementation Plan v2

## Overview

This document defines the architecture for building, storing, and managing bridge bidding systems. The key change from v1 is the introduction of **TypeScript Convention Templates** that generate normalized markdown files based on user configuration choices.

---

## 1. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TYPESCRIPT CONVENTION TEMPLATES                        │
│                          src/conventions/                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   major_transfers_1nt.ts     stayman_1nt.ts        jacoby_2nt.ts           │
│   ┌─────────────────────┐    ┌─────────────────┐   ┌─────────────────┐     │
│   │ id: string          │    │ id: string      │   │ id: string      │     │
│   │ name: string        │    │ name: string    │   │ name: string    │     │
│   │ description: string │    │ description     │   │ description     │     │
│   │ options: Option[]   │    │ options: []     │   │ options: []     │     │
│   │ generate(answers)   │    │ generate()      │   │ generate()      │     │
│   └─────────────────────┘    └─────────────────┘   └─────────────────┘     │
│                                                                             │
│   Each template contains:                                                   │
│   - Metadata (name, description)                                            │
│   - User-configurable options with questions                                │
│   - Generator function that outputs markdown based on answers               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER SYSTEM CREATION                              │
│                                                                             │
│   Step 1: Select conventions                                                │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │ [x] Major Transfers over 1NT                                │          │
│   │ [ ] Stayman over 1NT                                        │          │
│   │ [ ] Jacoby 2NT                                              │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
│   Step 2: Answer convention-specific questions                              │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │ Major Transfers over 1NT:                                   │          │
│   │ "Play 2NT and new suit as super-accept?"  [Yes] [No]        │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
│   Step 3: Enter system name                                                 │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │ System Name: [Uma + PS 2025___________________]             │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MARKDOWN GENERATOR                                │
│                                                                             │
│   For each selected convention:                                             │
│     convention.generate(userAnswers) → markdown string                      │
│                                                                             │
│   Combine all outputs into single normalized .md file                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NORMALIZED MARKDOWN FILE                            │
│                      docs/systems/<system_name>.md                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   # Uma + PS 2025                                                           │
│                                                                             │
│   ## Description                                                            │
│   Transfer to Major, 3M is superacceptance with max                         │
│                                                                             │
│   ---                                                                       │
│                                                                             │
│   ## 1n-(p)-2d = Transfer to hearts                                         │
│   - **2h** = Completes transfer                                             │
│     - **p** = To play, weak with 5 hearts                                   │
│     - **2n** = Invitational, 5 hearts                                       │
│   - **2s** = Super-accept, 4 hearts, max, short spades  ← included if Y     │
│   - **3h** = Super-accept, 4 hearts, maximum                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PARSER ENGINE                                  │
│                                                                             │
│   Parse normalized .md file → INSERT into bid_rules table                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRIORITY-INDEXED DATABASE (PID)                          │
│                         [Supabase - PostgreSQL]                             │
│                                                                             │
│                      *** SINGLE SOURCE OF TRUTH ***                         │
│                                                                             │
│   bid_rules table with sequence, meaning, auction_path, etc.                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. TypeScript Convention Template Structure

### 2.1 File Location

```
src/
├── conventions/
│   ├── index.ts                    # Exports all conventions
│   ├── types.ts                    # Shared types
│   ├── major_transfers_1nt.ts      # Major Transfers over 1NT
│   ├── stayman_1nt.ts              # Stayman over 1NT
│   ├── stayman_2nt.ts              # Stayman over 2NT
│   ├── jacoby_2nt.ts               # Jacoby 2NT
│   ├── jacoby_transfers_2nt.ts     # Jacoby Transfers over 2NT
│   └── ...
```

### 2.2 Type Definitions (types.ts)

```typescript
export interface ConventionOption {
  id: string;
  question: string;
  default: boolean;
}

export interface ConventionTemplate {
  id: string;
  name: string;
  description: string;
  options: ConventionOption[];
  generate: (answers: Record<string, boolean>) => string;
}
```

### 2.3 Convention Template Example (major_transfers_1nt.ts)

```typescript
import { ConventionTemplate } from './types';

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

  generate: (answers: Record<string, boolean>): string => {
    const superAccept = answers['super_accept_2n_newsuit'] || false;

    const lines: string[] = [];

    // Transfer to hearts
    lines.push('## 1n-(p)-2d = Transfer to hearts');
    lines.push('');
    lines.push('- **2h** = Completes transfer');
    lines.push('  - **p** = To play, weak with 5 hearts');
    lines.push('  - **2n** = Invitational, 5 hearts');
    lines.push('  - **3h** = Invitational, 6 hearts');
    lines.push('  - **3n** = Choice of games, 5 hearts');
    lines.push('  - **4h** = To play, 6 hearts');

    if (superAccept) {
      lines.push('- **2s** = Super-accept, 4 hearts, max, short spades');
      lines.push('- **2n** = Super-accept, 4 hearts, max, balanced');
    }

    lines.push('- **3h** = Super-accept, 4 hearts, maximum');
    lines.push('');

    // Transfer to spades
    lines.push('## 1n-(p)-2h = Transfer to spades');
    lines.push('');
    lines.push('- **2s** = Completes transfer');
    lines.push('  - **p** = To play, weak with 5 spades');
    lines.push('  - **2n** = Invitational, 5 spades');
    lines.push('  - **3s** = Invitational, 6 spades');
    lines.push('  - **3n** = Choice of games, 5 spades');
    lines.push('  - **4s** = To play, 6 spades');

    if (superAccept) {
      lines.push('- **2n** = Super-accept, 4 spades, max, balanced');
      lines.push('- **3c** = Super-accept, 4 spades, max, short clubs');
      lines.push('- **3d** = Super-accept, 4 spades, max, short diamonds');
      lines.push('- **3h** = Super-accept, 4 spades, max, short hearts');
    }

    lines.push('- **3s** = Super-accept, 4 spades, maximum');
    lines.push('');

    return lines.join('\n');
  }
};
```

### 2.4 Index File (index.ts)

```typescript
import { ConventionTemplate } from './types';
import { majorTransfers1NT } from './major_transfers_1nt';
import { stayman1NT } from './stayman_1nt';
// ... import others

export const CONVENTIONS: ConventionTemplate[] = [
  majorTransfers1NT,
  stayman1NT,
  // ... add others
];

export function getConventionById(id: string): ConventionTemplate | undefined {
  return CONVENTIONS.find(c => c.id === id);
}

export * from './types';
```

---

## 3. Data Flow

### 3.1 System Creation Flow

```
User Action                    System Response
───────────────────────────────────────────────────────────────────────
1. Click "Create New System"  →  Show dialog with options
2. Select "Build from         →  Show convention checklist
   Conventions"
3. Check conventions          →  Store selections
4. Click "Next"               →  Show questions for selected conventions
5. Answer questions           →  Store answers
6. Click "Next"               →  Show name input
7. Enter system name          →  Store name
8. Click "Create"             →  For each selected convention:
                                   a. Call convention.generate(answers)
                                   b. Combine outputs
                                   c. Add header with system name
                                   d. Download as <name>.md
```

### 3.2 Normalized Markdown Format

The generated .md file follows this structure:

```markdown
# <System Name>

## Description

<Combined description from selected conventions>

---

## <auction_path> = <bid_name>

- **<bid>** = <meaning>
  - **<continuation>** = <meaning>
    - **<continuation>** = <meaning>

## <next_auction_path> = <bid_name>

- **<bid>** = <meaning>
...
```

---

## 4. Implementation Phases

### Phase 1: Convention Templates (Current)
- [x] Create types.ts with ConventionTemplate interface
- [x] Create major_transfers_1nt.ts with super-accept option
- [x] Update CreateSystemDialog to use convention templates
- [x] Implement .md file download
- [ ] Refactor: Move convention code from CreateSystemDialog to src/conventions/

### Phase 2: Add More Conventions
- [ ] stayman_1nt.ts (with Garbage Stayman option)
- [ ] stayman_2nt.ts
- [ ] jacoby_transfers_2nt.ts
- [ ] jacoby_2nt.ts
- [ ] texas_transfers_1nt.ts

### Phase 3: Parser Engine
- [ ] Parse normalized .md format
- [ ] Extract auction_path, bid, meaning
- [ ] Build tree structure from indentation
- [ ] Insert into bid_rules table

### Phase 4: System Query Integration
- [ ] Query bid_rules from System Query page
- [ ] Support all three query types:
  - Bid → Meaning
  - Meaning → Bid
  - Keyword search

### Phase 5: Full System Templates
- [ ] Create base system templates (opening bids, responses)
- [ ] Allow combining base system + conventions
- [ ] Convention conflict detection

---

## 5. Convention Options Examples

### Major Transfers over 1NT
| Option ID | Question | Effect |
|-----------|----------|--------|
| super_accept_2n_newsuit | Play 2NT and new suit as super-accept? | Includes 2NT/new suit bids |

### Stayman over 1NT (future)
| Option ID | Question | Effect |
|-----------|----------|--------|
| garbage_stayman | Play Garbage Stayman? | Includes weak exit sequences |
| smolen | Play Smolen? | Includes 5-4 major GF sequences |

### Jacoby 2NT (future)
| Option ID | Question | Effect |
|-----------|----------|--------|
| serious_3nt | Play Serious 3NT? | Includes 3NT as serious slam try |

---

## 6. File Naming Convention

- Convention templates: `src/conventions/<convention_id>.ts`
- Generated markdown: `docs/systems/<system_name>.md`
- System name in filename: spaces replaced with underscores

---

## 7. Comparison with v1

| Aspect | v1 | v2 |
|--------|----|----|
| Convention storage | Static .md files | TypeScript templates with generate() |
| User options | Not supported | Questions with Y/N answers |
| Output | Direct to database | .md file first, then parse |
| Flexibility | Fixed sequences | Conditional sequences based on answers |
| Maintainability | Edit .md files | Edit TypeScript code |

---

## Appendix: Convention Checklist

### Over 1NT
- [x] major_transfers_1nt (with super-accept option)
- [ ] stayman_1nt (with Garbage Stayman, Smolen options)
- [ ] minor_transfers_1nt
- [ ] texas_transfers_1nt

### Over 2NT
- [ ] stayman_2nt
- [ ] jacoby_transfers_2nt
- [ ] texas_transfers_2nt

### Major Suit Raises
- [ ] jacoby_2nt (with Serious 3NT option)
- [ ] splinters
- [ ] bergen_raises

### Competitive
- [ ] cappelletti
- [ ] dont
- [ ] lebensohl

### Other
- [ ] new_minor_forcing
- [ ] fourth_suit_forcing
- [ ] reverse_drury
