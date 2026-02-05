# System Template Format

This document describes the TypeScript structure for defining base systems and conventions, and how the Create System frontend uses them.

---

## 1. Type Definitions

### ConventionOption

Used for Yes/No questions in both systems and conventions.

```typescript
interface ConventionOption {
  id: string;        // Unique identifier, used as key in answers
  question: string;  // Question text shown to user
  default: boolean;  // Default value
}
```

### ConventionTemplate

For individual conventions (Stayman, Transfers, etc.)

```typescript
interface ConventionTemplate {
  id: string;                    // e.g., 'stayman_1nt'
  name: string;                  // e.g., 'Stayman (over 1NT)'
  description: string;           // Brief description
  options: ConventionOption[];   // Convention-specific questions
  generate: (answers: Record<string, boolean>) => string;  // Returns markdown
}
```

### SystemTemplate

For base systems (2/1, SAYC, etc.)

```typescript
interface SystemTemplate {
  id: string;                      // e.g., 'two_over_one_base'
  name: string;                    // e.g., '2/1 Base System'
  description: string;             // e.g., '2/1 Game Force system'
  systemOptions: ConventionOption[];   // Questions about the system itself
  availableConventions: string[];      // IDs of conventions that can be added
  generate: (
    systemAnswers: Record<string, boolean>,
    selectedConventions: string[],
    conventionAnswers: Record<string, boolean>
  ) => string;  // Returns markdown
}
```

---

## 2. File Structure

```
src/conventions/
├── types.ts                    # Type definitions
├── index.ts                    # Exports SYSTEMS, CONVENTIONS, helpers
├── two_over_one_base.ts        # 2/1 Base System
├── stayman_1nt.ts              # Stayman over 1NT
├── major_transfers_1nt.ts      # Major Transfers over 1NT
└── ...                         # Additional conventions/systems
```

---

## 3. Convention Template Example

**File:** `src/conventions/major_transfers_1nt.ts`

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

    lines.push('## 1n-(p)-2d = Transfer to hearts');
    lines.push('');
    lines.push('- **2h** = Completes transfer');
    // ... more lines

    if (superAccept) {
      lines.push('- **2s** = Super-accept, 4 hearts, max, short spades');
      lines.push('- **2n** = Super-accept, 4 hearts, max, balanced');
    }

    // ... rest of convention
    return lines.join('\n');
  }
};
```

---

## 4. System Template Example

**File:** `src/conventions/two_over_one_base.ts`

```typescript
import { SystemTemplate } from './types';
import { stayman1NT } from './stayman_1nt';
import { majorTransfers1NT } from './major_transfers_1nt';

const conventionMap: Record<string, typeof stayman1NT> = {
  'stayman_1nt': stayman1NT,
  'major_transfers_1nt': majorTransfers1NT,
};

export const twoOverOneBase: SystemTemplate = {
  id: 'two_over_one_base',
  name: '2/1 Base System',
  description: '2/1 Game Force system',

  // Questions about the system itself
  systemOptions: [
    {
      id: 'forcing_1nt_unpassed',
      question: 'Is 1NT over 1M forcing by an Unpassed Hand?',
      default: true
    }
  ],

  // Conventions that can be added to this system
  availableConventions: ['stayman_1nt', 'major_transfers_1nt'],

  generate: (
    systemAnswers: Record<string, boolean>,
    selectedConventions: string[],
    conventionAnswers: Record<string, boolean>
  ): string => {
    const lines: string[] = [];
    const forcing1NT = systemAnswers['forcing_1nt_unpassed'] !== false;

    // Base system content
    lines.push('## 1M Opening');
    lines.push('');
    if (forcing1NT) {
      lines.push('- **1n** = Forcing 1NT, 6-12 HCP');
    } else {
      lines.push('- **1n** = Non-forcing, 6-10 HCP');
    }
    // ... more base system content

    // Include selected conventions
    lines.push('## 1n = 15-17 HCP, balanced');
    lines.push('');
    for (const convId of selectedConventions) {
      const convention = conventionMap[convId];
      if (convention) {
        lines.push(convention.generate(conventionAnswers));
      }
    }

    return lines.join('\n');
  }
};
```

---

## 5. Index File

**File:** `src/conventions/index.ts`

```typescript
import { ConventionTemplate, SystemTemplate } from './types';
import { stayman1NT } from './stayman_1nt';
import { majorTransfers1NT } from './major_transfers_1nt';
import { twoOverOneBase } from './two_over_one_base';

// Base systems
export const SYSTEMS: SystemTemplate[] = [
  twoOverOneBase,
];

// Individual conventions
export const CONVENTIONS: ConventionTemplate[] = [
  stayman1NT,
  majorTransfers1NT,
];

export function getSystemById(id: string): SystemTemplate | undefined {
  return SYSTEMS.find(s => s.id === id);
}

export function getConventionById(id: string): ConventionTemplate | undefined {
  return CONVENTIONS.find(c => c.id === id);
}
```

---

## 6. Frontend Structure (CreateSystemDialog)

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

### UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SYSTEM NAME                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Enter system name...                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  2. BASE SYSTEM (radio buttons)                                 │
│                                                                 │
│  ○ 2/1 Base System                                              │
│    2/1 Game Force system                                        │
│                                                                 │
│  ○ SAYC (future)                                                │
│  ○ Precision (future)                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  3. SYSTEM OPTIONS (when base system selected)                  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Is 1NT over 1M forcing by an Unpassed Hand?   [Yes] [No]  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  4. CONVENTIONS TO INCLUDE (checkboxes)                         │
│                                                                 │
│  ☑ Stayman (over 1NT)                                           │
│    Responder bids 2C over 1NT to ask for 4-card major           │
│                                                                 │
│  ☑ Major Transfers over 1NT                                     │
│    Transfer to Major, 3M is superacceptance with max            │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ Play 2NT and new suit as super-accept?      [Yes] [No]  │  │
│    └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                              [Back] [Cancel] [Save]             │
│                                                                 │
│  Save is disabled until:                                        │
│  - System name is entered                                       │
│  - Base system is selected                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Generate Flow

When user clicks **Save**:

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

  // Call system's generate function
  const content = system.generate(
    systemAnswers,           // System-level answers
    selectedConventions,     // Which conventions to include
    conventionAnswers        // Convention-specific answers
  );
  lines.push(content);

  return lines.join('\n');
};
```

### Output

Downloads `<systemName>.md` file containing the complete system with selected conventions embedded.

---

## 7. Adding a New System

1. Create `src/conventions/new_system.ts`:

```typescript
import { SystemTemplate } from './types';

export const newSystem: SystemTemplate = {
  id: 'new_system',
  name: 'New System Name',
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

2. Add to `index.ts`:

```typescript
import { newSystem } from './new_system';

export const SYSTEMS: SystemTemplate[] = [
  twoOverOneBase,
  newSystem,  // Add here
];
```

---

## 8. Adding a New Convention

1. Create `src/conventions/new_convention.ts`:

```typescript
import { ConventionTemplate } from './types';

export const newConvention: ConventionTemplate = {
  id: 'new_convention',
  name: 'New Convention Name',
  description: 'Description',
  options: [
    // Convention-specific questions
  ],
  generate: (answers) => {
    // Return markdown string
  }
};
```

2. Add to `index.ts`:

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
