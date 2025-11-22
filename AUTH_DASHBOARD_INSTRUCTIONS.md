# Bridge System App - Auth & Dashboard Implementation

## What Figma Delivered

**11 complete mockup pages** (not production code - it's a SHOWCASE app):
1. Design System (tokens, colors, typography, spacing, shadows)
2. Authentication (login, signup, password reset, 2FA)
3. Dashboard (workspace browser, template library)
4. Account Settings (security, i18n, notifications, privacy/GDPR)
5. Onboarding (interactive tooltip overlay)
6. Navigation (top bar, user menu, sidebar patterns)
7. Loading & Empty States (skeletons, progress, toasts)
8. Advanced Table Features (filter, sort, bulk actions, shortcuts)
9. Error & Accessibility (WCAG 2.1 AA, focus states, ARIA)
10. Responsive Layouts (desktop/tablet/mobile breakpoints)
11. Current App Reference (screenshot - DO NOT MODIFY)

**Documentation:**
- `/tmp/figma-auth/src/SUMMARY.md` - Complete overview of all 11 pages
- `/tmp/figma-auth/src/IMPROVEMENTS.md` - Detailed implementation guidance
- Full shadcn/ui component library included

## Critical Understanding

**The Figma zip is NOT production code** - it's a mockup showcase. You will:
1. **Extract design tokens** (colors, spacing, typography)
2. **Study UI patterns** (layouts, interactions, flows)
3. **Build components from scratch** matching the designs
4. **Integrate with existing workspace system**

**DO NOT copy-paste Figma component code** - it's demonstration only.

## What Already Exists (DON'T MODIFY)

**Working components** (in master branch):
- `src/components/workspace-system/` - Multi-tab workspace container
- `src/components/systems-table/` - Nested bidding tables with persistence
- `src/components/workspace-system/TextElement.tsx` - Rich text editor
- `src/db/database.ts` - IndexedDB with Dexie (workspaces, elements, column widths)

**Current tech stack**:
- React 18.3.1 + TypeScript 5 + Vite 6.3.5
- shadcn/ui components (Radix primitives)
- IndexedDB + Dexie for local persistence
- Lucide React for icons
- Tailwind CSS

**Entry point**: `App.tsx` currently renders `<WorkspaceSystem />` directly (no routing yet)

## Implementation Strategy

### Phase 1: Design Token Extraction

**Study** `/tmp/figma-auth/src/index.css` and `/tmp/figma-auth/src/components/DesignSystem.tsx`

**Extract to our codebase**:
```typescript
// src/styles/tokens.ts
export const tokens = {
  colors: {
    primary: '#2563EB',      // From Figma Design System
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#DC2626',
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    }
  },
  spacing: {
    // 4px/8px grid - extract from Figma
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
  animation: {
    fast: '150ms',
    standard: '300ms',
    slow: '500ms',
  }
};
```

**Update** `tailwind.config.js` with extracted tokens.

### Phase 2: Routing Setup

```bash
npm install react-router-dom
```

**Route structure**:
```
/ (root - redirect to /dashboard if logged in, /login if not)
├── /login
├── /signup
├── /reset-password
├── /dashboard (protected)
│   ├── Workspace browser grid/list view
│   └── Template library modal
├── /settings (protected)
│   ├── Profile, Security, Notifications
│   └── Language, Privacy, Data Export
└── /workspace/:id (protected)
    └── <WorkspaceSystem /> (EXISTING - don't modify)
```

### Phase 3: Build Auth Screens

**Reference**: `/tmp/figma-auth/src/components/Authentication.tsx`

**Build from scratch**:
- `src/pages/Login.tsx` - Email/password + social login buttons
- `src/pages/Signup.tsx` - Email/password/confirm + terms checkbox
- `src/pages/ResetPassword.tsx` - Email input + success message

**Key specs from Figma**:
- Centered layout (not top-left)
- Large logo (h-12, not h-8)
- Social login buttons (Google, Apple) - UI only, no backend
- Form validation (email format, password strength 8+ chars)
- Error states (red text below fields)
- Loading states (disabled button with spinner)

**Mock auth** (localStorage for now):
```typescript
// src/lib/mockAuth.ts
export const auth = {
  login: async (email: string, password: string) => {
    await new Promise(r => setTimeout(r, 1000)); // Simulate network
    if (!email || !password) {
      throw new Error('Email and password required');
    }
    localStorage.setItem('user', JSON.stringify({ email, name: 'Test User' }));
    return { success: true };
  },
  signup: async (email: string, password: string) => {
    await new Promise(r => setTimeout(r, 1000));
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    localStorage.setItem('user', JSON.stringify({ email, name: 'New User' }));
    return { success: true };
  },
  logout: () => localStorage.removeItem('user'),
  getCurrentUser: () => JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: () => !!localStorage.getItem('user'),
};
```

### Phase 4: Build Dashboard

**Reference**: `/tmp/figma-auth/src/components/Dashboard.tsx`

**Build**:
```typescript
// src/pages/Dashboard.tsx
import { workspaceOperations } from '../db/database';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [workspaces, setWorkspaces] = useState([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    workspaceOperations.getAll().then(setWorkspaces);
  }, []);

  const filteredWorkspaces = workspaces.filter(ws =>
    ws.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header with search and view toggle */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Your Workspaces</h1>
        <div className="flex gap-4">
          <input
            type="search"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button onClick={() => setView(view === 'grid' ? 'list' : 'grid')}>
            {view === 'grid' ? 'List' : 'Grid'}
          </button>
        </div>
      </div>

      {/* Grid/list view */}
      <div className={view === 'grid' ? 'grid grid-cols-3 gap-4' : 'flex flex-col gap-2'}>
        {filteredWorkspaces.map(ws => (
          <WorkspaceCard
            key={ws.id}
            workspace={ws}
            onClick={() => navigate(`/workspace/${ws.id}`)}
          />
        ))}
      </div>

      {/* Create new button */}
      <button onClick={() => navigate('/workspace/new')}>
        Create New Workspace
      </button>
    </div>
  );
}
```

**Key features from Figma**:
- Grid view (3 columns) with workspace cards
- List view (stacked rows)
- Search bar with filter
- "Create New Workspace" prominent button
- Template library modal (Standard American, 2/1 GF, Precision)
- Each card shows: title, last modified, element count

### Phase 5: Build Account Settings

**Reference**: `/tmp/figma-auth/src/components/AccountSettings.tsx`

**Build**:
```typescript
// src/pages/Settings.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function Settings() {
  const [user, setUser] = useState(auth.getCurrentUser());

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-6">Account Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="language">Language & Region</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          {/* Avatar upload, name, email, ACBL number */}
        </TabsContent>

        <TabsContent value="security">
          {/* 2FA toggle, password change, active sessions */}
        </TabsContent>

        <TabsContent value="notifications">
          {/* Granular toggles (workspace updates, shares, digest) */}
        </TabsContent>

        <TabsContent value="language">
          {/* Language dropdown (7 languages), date format, data residency */}
        </TabsContent>

        <TabsContent value="privacy">
          {/* GDPR compliance, export data, delete account */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Key features**:
- Profile: Avatar upload, name, email, ACBL number
- Security: 2FA toggle, password change, active sessions
- Notifications: Granular toggles (workspace updates, shares, digest)
- Language: Dropdown (English, Español, Français, Deutsch, 日本語, 中文, العربية), date format, data residency
- Privacy: GDPR compliance badges, export data button, delete account

**Store preferences in localStorage for now.**

### Phase 6: Onboarding Overlay

**Reference**: `/tmp/figma-auth/src/components/Onboarding.tsx`

**Build**:
```typescript
// src/components/OnboardingOverlay.tsx
import { useState, useEffect } from 'react';

function OnboardingOverlay({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      target: '[data-insert-table]',
      text: 'Click here to create your first bidding table',
      position: 'bottom'
    },
    {
      target: '[data-row-actions]',
      text: 'Hover over rows to add siblings (+), children (++), or delete (x)',
      position: 'right'
    },
    {
      target: '[data-collapse-icon]',
      text: 'Click chevron icons to collapse/expand nested sequences',
      position: 'right'
    },
    {
      target: '[data-hyperlink]',
      text: 'Select text and create hyperlinks to other workspaces (comment, split-view, or new page)',
      position: 'bottom'
    }
  ];

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (completed) {
      onComplete();
    }
  }, []);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('onboarding_completed', 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/20">
      {/* Tooltip pointing to steps[step].target */}
      <div className="absolute bg-white rounded-lg shadow-lg p-4">
        <p className="text-sm mb-4">{steps[step].text}</p>
        <div className="flex justify-between">
          <button onClick={handleSkip} className="text-neutral-600">
            Skip Tour
          </button>
          <button onClick={handleNext} className="bg-primary text-white px-4 py-2 rounded">
            {step < steps.length - 1 ? 'Next' : 'Got it!'}
          </button>
        </div>
        <div className="text-xs text-neutral-500 mt-2">
          Step {step + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
}
```

**Show once per user** (check localStorage `onboarding_completed`).

### Phase 7: Navigation

**Reference**: `/tmp/figma-auth/src/components/NavigationComponents.tsx`

**Build**:
```typescript
// src/components/TopNav.tsx
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/mockAuth';

function TopNav({ workspaceTitle }: { workspaceTitle?: string }) {
  const navigate = useNavigate();
  const user = auth.getCurrentUser();

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  return (
    <nav className="border-b bg-white px-6 py-4 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <img src="/logo.svg" alt="Bridge System App" className="h-12" />
        {workspaceTitle && (
          <h1 className="text-lg font-semibold">{workspaceTitle}</h1>
        )}
      </div>

      {/* User menu */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="flex items-center gap-2">
              <span className="text-sm">{user.name}</span>
              <Avatar>
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => navigate('/dashboard')}>
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
}
```

### Phase 8: Advanced Features (Optional - Can Defer)

Figma provided designs for:
- Loading states (skeleton loaders) - `/tmp/figma-auth/src/components/LoadingEmptyStates.tsx`
- Empty states ("No workspaces yet" illustrations)
- Error screens (404, 500, network error) - `/tmp/figma-auth/src/components/ErrorAccessibilityStates.tsx`
- Advanced table features (filter, sort, bulk actions) - `/tmp/figma-auth/src/components/AdvancedTableFeatures.tsx`
- Responsive mobile layouts - `/tmp/figma-auth/src/components/ResponsiveLayouts.tsx`

**These can be added later** - focus on core auth/dashboard first.

## Database Schema Updates

**Add to** `src/db/database.ts`:
```typescript
import Dexie, { Table } from 'dexie';

// Add new interfaces
interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  acblNumber?: string;
  preferences?: {
    language: string;
    dateFormat: string;
    dataResidency: string;
    notifications: {
      workspaceUpdates: boolean;
      shareInvitations: boolean;
      weeklyDigest: boolean;
      productUpdates: boolean;
    };
  };
  createdAt: Date;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'Standard American' | '2/1 Game Force' | 'Precision Club';
  initialRows: RowData[];
  createdAt: Date;
}

// Extend database class
class BridgeSystemDatabase extends Dexie {
  workspaces!: Table<Workspace>;
  elements!: Table<WorkspaceElement>;
  systemsTableState!: Table<SystemsTableState>;
  users!: Table<User>;        // NEW
  templates!: Table<Template>; // NEW

  constructor() {
    super('BridgeSystemDB');
    this.version(2).stores({
      workspaces: '++id, title, createdAt, updatedAt',
      elements: '++id, workspaceId, type, x, y, width, height',
      systemsTableState: '++id, workspaceId, elementId',
      users: '++id, email',      // NEW
      templates: '++id, name, category', // NEW
    });
  }
}

export const db = new BridgeSystemDatabase();

// Add template operations
export const templateOperations = {
  getAll: async () => db.templates.toArray(),
  getByCategory: async (category: string) =>
    db.templates.where('category').equals(category).toArray(),
  create: async (template: Omit<Template, 'id' | 'createdAt'>) => {
    const id = await db.templates.add({
      ...template,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    });
    return db.templates.get(id);
  },
};
```

## Testing Strategy

1. **Auth flow**:
   - Navigate to http://localhost:3000/login
   - Fill form, submit, verify redirect to dashboard
   - Logout, verify redirect to login
   - Test validation errors (invalid email, short password)

2. **Dashboard**:
   - Verify workspaces load from IndexedDB
   - Test grid/list view toggle
   - Test search filter
   - Click workspace card, verify navigation to /workspace/:id

3. **Settings**:
   - Change language preference, verify localStorage update
   - Toggle notifications, verify persistence
   - Test export data (downloads JSON)

4. **Template library**:
   - Open modal, select Standard American
   - Verify new workspace created with initial rows

5. **Onboarding**:
   - Clear localStorage `onboarding_completed`
   - Navigate to /workspace/new
   - Verify tooltips appear pointing to correct elements
   - Click through steps, verify dismissal

6. **Responsive**:
   - Resize to 768px (tablet) - sidebar should collapse
   - Resize to 600px (mobile) - should show view-only banner

**Use Chrome DevTools MCP for browser testing**:
```typescript
// In your test thread
// 1. Navigate to login page
await mcp__chrome_devtools__navigate_page({ type: 'url', url: 'http://localhost:3000/login' });

// 2. Take snapshot to find form elements
await mcp__chrome_devtools__take_snapshot();

// 3. Fill login form
await mcp__chrome_devtools__fill({ uid: 'email_input_uid', value: 'test@example.com' });
await mcp__chrome_devtools__fill({ uid: 'password_input_uid', value: 'testpass123' });

// 4. Click submit
await mcp__chrome_devtools__click({ uid: 'submit_button_uid' });

// 5. Verify redirect to dashboard
await mcp__chrome_devtools__take_screenshot();
```

## Accessibility Requirements (WCAG 2.1 AA)

From Figma's Error & Accessibility page (`/tmp/figma-auth/src/components/ErrorAccessibilityStates.tsx`):

### Focus States
- **2px solid ring** with **2px offset** on ALL interactive elements
- Color-coded: Primary blue for buttons, neutral for inputs
- Visible when navigating with TAB key

```css
button:focus-visible {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
}

input:focus-visible {
  outline: 2px solid #525252;
  outline-offset: 2px;
}
```

### Color Contrast
- Text: **4.5:1** minimum ratio (3:1 for large text 18px+)
- UI components: **3:1** minimum ratio
- Test with WebAIM Contrast Checker or Chrome DevTools

**Passing examples** (from Figma):
- Primary blue (#2563EB) on white: 10.2:1 ✅
- Dark gray (#404040) on white: 16.5:1 ✅

**Failing examples** (avoid):
- Light gray (#D4D4D4) on white: 1.8:1 ❌
- Warning yellow (#F59E0B) on white: 2.1:1 ❌

### Keyboard Navigation
- **TAB**: Navigate through interactive elements
- **SHIFT+TAB**: Navigate backwards
- **ENTER/SPACE**: Activate buttons/links
- **ESC**: Close modals/dropdowns
- **Arrow keys**: Navigate within menus/dropdowns

**Focus trap in modals**: When modal opens, focus should move inside and not escape until modal closes.

```typescript
// Example focus trap implementation
function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();

      // Trap TAB focus within modal
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable?.[0] as HTMLElement;
        const last = focusable?.[focusable.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {children}
    </div>
  );
}
```

### ARIA Labels
- Icon-only buttons MUST have `aria-label`
- Form inputs MUST have associated `<label>` or `aria-label`
- Status messages use `aria-live="polite"` or `aria-live="assertive"`

```tsx
// Good ✅
<button aria-label="Close dialog">
  <X className="h-4 w-4" />
</button>

<input id="email" type="email" />
<label htmlFor="email">Email address</label>

<div aria-live="polite" role="status">
  {message}
</div>

// Bad ❌
<button>
  <X className="h-4 w-4" />
</button>

<input type="email" placeholder="Email" />
```

### Semantic HTML
Use proper semantic elements instead of generic divs:
- `<button>` for actions (not `<div onclick>`)
- `<nav>` for navigation
- `<main>` for main content
- `<form>` for forms
- `<header>`, `<footer>`, `<aside>` for page structure

## Responsive Design

From Figma's Responsive Layouts page (`/tmp/figma-auth/src/components/ResponsiveLayouts.tsx`):

### Breakpoints

**Desktop (1440px+)**: Primary experience
- 3-column workspace grid
- Full navigation always visible
- All features enabled
- Sidebar permanently open

**Tablet (768px - 1024px)**: Adapted experience
- 2-column workspace grid
- Collapsible sidebar with hamburger menu
- Tables have horizontal scroll
- Touch-optimized buttons (larger tap targets)
- 25% reduced spacing

**Mobile (<768px)**: View-only mode
- Single column stacked layout
- Bottom tab navigation (Home, Templates, Shared, Settings)
- Tables convert to stacked cards
- Banner: "Editing is best on desktop - view only on mobile"
- 44x44px minimum touch targets
- Large, tappable buttons

### Tailwind Breakpoint Reference
```css
/* Mobile-first approach */
.grid {
  grid-template-columns: 1fr; /* Mobile: 1 column */
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr); /* Tablet: 2 columns */
  }
}

@media (min-width: 1440px) {
  .grid {
    grid-template-columns: repeat(3, 1fr); /* Desktop: 3 columns */
  }
}
```

### Touch Target Sizes
- **Minimum**: 44x44px for all tappable elements on mobile
- **Recommended**: 48x48px for primary actions
- Add padding to small icons to meet minimum size

```tsx
// Good ✅ (mobile)
<button className="p-3 min-w-[44px] min-h-[44px]">
  <Icon className="h-5 w-5" />
</button>

// Bad ❌ (mobile)
<button className="p-1">
  <Icon className="h-4 w-4" />
</button>
```

## Git Workflow

```bash
# Start from latest master
git checkout master
git pull origin master

# Create feature branch
git checkout -b feature/auth-dashboard

# Commit frequently as you build
git add src/styles/tokens.ts
git commit -m "Extract design tokens from Figma"

git add src/pages/Login.tsx src/pages/Signup.tsx src/pages/ResetPassword.tsx
git commit -m "Build authentication screens from Figma design"

git add src/pages/Dashboard.tsx src/components/WorkspaceCard.tsx
git commit -m "Build dashboard with workspace browser"

git add src/pages/Settings.tsx
git commit -m "Build account settings page with i18n support"

git add src/components/TopNav.tsx
git commit -m "Add top navigation with user menu"

git add src/components/OnboardingOverlay.tsx
git commit -m "Add interactive onboarding overlay"

# When complete, push branch (DON'T merge to master yet)
git push origin feature/auth-dashboard
```

**Wait for review/approval before merging** to avoid conflicts with workspace enhancements happening in parallel on master branch.

## Deliverables Checklist

- [ ] Design tokens extracted and applied (`src/styles/tokens.ts`, `tailwind.config.js`)
- [ ] React Router setup with auth guards
- [ ] Login screen (centered, large logo, social buttons, validation)
- [ ] Signup screen (email/password/confirm, terms checkbox)
- [ ] Reset Password screen (email input, success message)
- [ ] Dashboard with workspace browser (grid/list views, search)
- [ ] Template library modal (3 templates with realistic content)
- [ ] Settings page (5 tabs: Profile, Security, Notifications, Language, Privacy)
- [ ] Onboarding overlay (4-step interactive tooltips)
- [ ] Top navigation with user menu dropdown
- [ ] Auth protection (redirect to /login if not authenticated)
- [ ] All forms validate (email format, password strength)
- [ ] Loading states (button spinners, skeleton loaders)
- [ ] Empty states ("No workspaces yet" with CTA)
- [ ] Error states (form errors, network errors)
- [ ] Focus states visible on all interactive elements (2px ring, 2px offset)
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 text, 3:1 UI)
- [ ] Keyboard navigation works (TAB, ESC, ENTER)
- [ ] ARIA labels on icon-only buttons
- [ ] Semantic HTML throughout
- [ ] Responsive (desktop 1440px+, tablet 768-1024px, mobile <768px)
- [ ] 44x44px touch targets on mobile
- [ ] Tested with Chrome DevTools MCP
- [ ] No conflicts with existing workspace editor

## Key Files to Reference

**In Figma zip** (`/tmp/figma-auth/`):
- `src/SUMMARY.md` - Overview of all 11 pages
- `src/IMPROVEMENTS.md` - Detailed implementation notes (READ THIS FIRST)
- `src/index.css` - Design tokens (extract these)
- `src/components/DesignSystem.tsx` - Component patterns and specifications
- `src/components/Authentication.tsx` - Auth screen layouts
- `src/components/Dashboard.tsx` - Dashboard UI patterns
- `src/components/AccountSettings.tsx` - Settings page tabs and features
- `src/components/Onboarding.tsx` - Onboarding overlay tooltips
- `src/components/NavigationComponents.tsx` - Top nav and user menu
- `src/components/LoadingEmptyStates.tsx` - Loading/empty state patterns
- `src/components/AdvancedTableFeatures.tsx` - Advanced table interactions (optional)
- `src/components/ErrorAccessibilityStates.tsx` - Error screens and accessibility patterns
- `src/components/ResponsiveLayouts.tsx` - Responsive breakpoint examples

**DO NOT copy code directly** - use as visual reference and specification to build production-quality components.

## User Preferences (from ~/CLAUDE.md)

- **First Time Right**: Thorough analysis before implementation
- **Test before claiming success**: All forms validate, routing works, tested with Chrome DevTools MCP
- **Brief reporting**: State what you did, not what you're about to do
- **No sycophancy**: Objective technical assessment, push back when needed
- **Git commits**: Commit frequently with clear messages
- **Root cause focus**: Explain WHY, not just what

## Starting Checklist

1. [ ] Read `/tmp/figma-auth/src/IMPROVEMENTS.md` (implementation guide)
2. [ ] Read `/tmp/figma-auth/src/SUMMARY.md` (page overview)
3. [ ] Extract design tokens from `/tmp/figma-auth/src/index.css`
4. [ ] Create `feature/auth-dashboard` branch
5. [ ] Install `react-router-dom`
6. [ ] Build and test login screen first
7. [ ] Use Chrome DevTools MCP to verify form submission
8. [ ] Commit after each working feature
9. [ ] Test accessibility (TAB navigation, focus states)
10. [ ] Test responsive (resize to 768px, 600px)

---

**Starting point**: Extract design tokens, setup routing, build login screen, test with Chrome DevTools MCP. Commit each feature as you build.

**Integration**: When done, this branch provides the wrapper (auth/dashboard) around the existing workspace editor (master branch). Merge will be coordinated to avoid conflicts.

**Questions?** Read `IMPROVEMENTS.md` first - it has detailed implementation guidance from Figma.
