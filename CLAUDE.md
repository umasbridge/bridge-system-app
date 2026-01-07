# Bridge System App - Project Guidelines

## Project Overview
Interactive workspace web app for bridge partnerships to collaboratively build and maintain their bidding systems. Desktop-first for editing, mobile/iPad for view-only mode.

**Vision:** Any partnership can create, edit, comment on bidding systems using visual tables, text, and PDFs with hyperlinked navigation between sequences.

**Target Users:** Serious bridge partnerships (ACBL members, competitive players)
**Scale:** Potential 10-20k partnerships need comprehensive system documentation

## Architecture Decisions (Permanent)

### Stack: React + TypeScript + Vite (2025-11-21)
**What:** React 18.3.1 + TypeScript 5 + Vite 6.3.5, shadcn/ui components
**Why:**
- Modern React patterns with hooks and context
- Component-based architecture suits modular bidding tables/workspaces
- Vite provides fast HMR for iterative UI development
- shadcn/ui (Radix primitives) ensures accessibility
**Alternatives Rejected:**
- Figma-exported static HTML (can't handle dynamic interactions, state management)
- Plain JavaScript (type safety critical for complex nested data structures)
**Impact:** All components TypeScript, contenteditable-based rich text editing

### Database: Migrating to Supabase (2025-11-27)
**What:** Moving from IndexedDB + Dexie to Supabase for cloud persistence
**Previous (MVP):** Browser-based IndexedDB with Dexie wrapper, local-first persistence
**Why Migration:**
- Need real collaboration features (multi-user editing, sharing)
- Cloud sync required for cross-device access
- Supabase provides auth, real-time subscriptions, and PostgreSQL
**Migration Status:** In Progress
**Impact:** Will require schema migration, API layer changes, and auth integration

### Component Architecture: Native React Over Figma Exports (2025-11-21)
**What:** Custom React components (BiddingTable, SystemsTable, TextElement) with dynamic state
**Why:**
- Bidding tables require rich interactions: add rows, nested daughters, resize, color pickers, undo
- Figma exports are static HTML/CSS, can't handle:
  - ContentEditable text formatting with selection preservation
  - Nested data structures (parent/child bidding sequences)
  - Real-time state updates across multiple workspaces
- Current codebase already has mature component architecture
**Alternatives Rejected:**
- Figma-to-code tools (evaluated, rejected by user after discussion)
**Impact:** Continue with existing React component development, use Figma only for design mockups

### Templates Strategy: Essential But Infrastructure-Only for MVP (2025-11-21)
**What:** Template import/export infrastructure in MVP, 3 foundation templates post-MVP
**Why:**
- Market research shows templates are critical for user onboarding (BridgeDocs competitor has this)
- Users want to customize, not build from scratch
- But MVP focuses on core persistence first (user directive: "Minimal scope")
**Foundation Templates (Post-MVP):**
1. Standard American (5-card majors, 15-17 1NT)
2. 2/1 Game Force (most popular competitive system)
3. Precision Club (strong club system)
**Impact:** Design workspace data model to support template export/duplication

## Core Components

**Base Elements:**
- **TextBox** (workspace-system/TextElement): Rich text editor with formatting panel (font, size, colors, bold, italic, alignment, lists)
- **BiddingTable** (bidding-table/): 2-column (Bid | Meaning) nested response tables, color fills, keyboard shortcuts
- **PDFFileViewer** (workspace-system/PdfElement): PDF reference integration

**Workspace System:**
- Multi-workspace tabs with hyperlink navigation (Comments modal, SplitView, NewPage)
- Elements can be dragged, resized, hyperlinked
- WorkspaceProvider context manages state

## Market Context (From Strategic Analysis 2025-11-21)

**Primary Competitor:** BridgeDocs (bridgenotes.io, launched Oct 2024)
- Real-time collaboration, convention library, text-based format
- **Our Advantage:** Visual bidding table UI (superior UX for bridge players)
- **Their Advantage:** Community templates, real-time sync (our roadmap)

**Competitive Positioning:**
- ✅ Visual nested bidding tables (unique, better than text)
- ✅ 3-mode hyperlink navigation (more sophisticated than BridgeDocs)
- ✅ PDF integration
- ✅ Rich text formatting in workspace names
- 🔄 Supabase migration in progress (cloud persistence, auth, collaboration)
- ❌ No template library yet (roadmap)

**Monetization Potential:** Freemium ($5-10/month for collaboration) or one-time ($30-50 lifetime)

## Immediate Technical Debt

1. **Text formatting bug** - FIXED 2025-11-21
   - Root cause: applyFormat() handled textAlign first and returned early, preventing inline styles
   - TextFormatPanel sends textAlign:'left' by default with all formatting
   - Fixed: Added hasInlineFormatting check, skip textAlign when bold/colors/fontSize present
   - Location: src/components/workspace-system/TextElement.tsx:211-356

2. **SystemsTable collapse/expand** - FIXED 2025-11-21
   - Implemented: ChevronRight/ChevronDown icons next to parent rows with children
   - Clicking chevron toggles `collapsed` boolean, conditionally renders children
   - Location: SystemsTable.tsx:280-295 (toggleCollapsed), SystemsTableRow.tsx:148-165 (chevron UI)
   - Note: BiddingTable is unused subsystem - all table work in SystemsTable

3. **Table selection border visual bug** - FIXED 2025-11-21
   - Root cause: Box-shadow div and content div had same z-index, content rendered on top
   - Fixed: Added `zIndex: 1` to selection indicator, changed from border to inset box-shadow
   - Location: ResizableElement.tsx:188-196
   - Result: Blue border now visible on all 4 sides uniformly

4. **Editor Stability Implementation** - IN PROGRESS (Phases 1-7 Complete ✅)
   - Status: Phases 1-7 complete, Phase 8 (testing) pending
   - Last Updated: 2025-11-24
   - Completed:
     - ✅ All 5 utility files (`normalizeNodeTree.ts`, `canonicalizeStyle.ts`, `selectionBookmarks.ts`, `history.ts`, `pasteSanitizer.ts`)
     - ✅ Integrated into RichTextCell and TextElement
     - ✅ Undo/redo with Cmd/Ctrl+Z
     - ✅ Paste sanitization (Google Docs/Word)
     - ✅ Dev server compiles without errors
   - Next: Manual browser testing and acceptance tests
   - Location: See EDITOR_STABILITY_PLAN.md for full details

5. **Workspace Element Improvements** - COMPLETED 2025-11-25
   - Fixed: Table height calculation includes name header (34px) for proper element spacing
   - Fixed: PDF upload worker errors (local worker file in public/ directory)
   - Fixed: Workspace format panel only appears on border clicks (8px detection area)
   - Fixed: Duplicate name validation with real-time checking and red border warning
   - Fixed: PDF elements created directly without name dialog
   - Fixed: Format panels close properly when clicking away or on Apply button
   - Location: WorkspaceEditor.tsx, ElementNameDialog.tsx, PdfElement.tsx
   - All features tested and working in browser

6. **Workspace Name Bar Text Formatting** - COMPLETED 2025-11-27
   - Replaced Input element with contentEditable div for workspace name
   - Added TextFormatPanel integration when workspace name is focused
   - Supports: font, size, color, bold, italic, underline, strikethrough, highlight
   - Format panel appears on right side when editing, disappears when clicking elsewhere
   - Hyperlink option hidden (not applicable for workspace name)
   - Location: WorkspaceEditor.tsx:242-466 (handlers), 1093-1113 (contentEditable), 1598-1620 (format panel)

## File Structure
```
src/
├── components/
│   ├── workspace-system/         # Main app (multi-tab workspaces)
│   │   ├── TextElement.tsx       # Rich text with formatting + stability layer ✅
│   │   ├── TextFormatPanel.tsx   # Font, colors, alignment, lists
│   │   ├── WorkspaceEditor.tsx   # Canvas for elements
│   │   └── WorkspaceSystem.tsx   # Tab management + hyperlinks
│   ├── systems-table/            # Hierarchical table with hyperlinks
│   │   └── RichTextCell.tsx      # Table cell editor + stability layer ✅
│   ├── bidding-table/            # Nested 2-column tables
│   ├── insert-text/              # Alternative text component
│   └── ui/                       # 50+ shadcn/ui primitives
├── utils/
│   └── rte/                      # Rich Text Editor stability utilities ✅ NEW
│       ├── normalizeNodeTree.ts  # DOM normalization engine
│       ├── canonicalizeStyle.ts  # Style normalization
│       ├── selectionBookmarks.ts # Selection preservation
│       ├── history.ts            # Undo/redo controller
│       └── pasteSanitizer.ts     # Paste sanitization
└── App.tsx                       # Entry point (WorkspaceProvider)
```

## Development Standards

**From User Preferences (~/CLAUDE.md):**
- First Time Right: Thorough analysis before implementation
- Test before claiming success
- Root cause focus (WHY, not just what)
- Brief, factual reporting (no hyperbole)
- Use subagents for complex tasks and verification
- Browser automation available: `~/browser-testing-utils/test-browser.sh <url>`

## Session Learnings (Temporary)

### Market Validation (Added: 2025-11-21, Expires: 2025-12-21)
- Strong product viability: Clear pain point (partnerships use Word/GDocs with manual formatting)
- Target market: ~10-20k serious partnerships need comprehensive system docs
- Competitive gap: No tool combines visual tables + collaboration + hyperlinked nav + PDF integration
- Speed to market critical: BridgeDocs has 3-month head start but inferior visual tools

### User Preferences for This Project (Updated: 2025-11-27)
- "Deep" approach preferred (polish over speed)
- Not scared of complexity (mentions Figma + Claude Code + Chrome DevTools MCP)
- Will build first template manually using the app (dogfooding)
- Moving to Supabase for cloud persistence and collaboration features (2025-11-27)

### Session Progress (2026-01-01)
**Completed:**
- Split-view hyperlink type fix (TextElement.tsx)
- Table name row read-only in view mode (SystemsTableNameHeader.tsx)
- GitHub repo: `umasbridge/bridge-system-app` with PAT auth
- Display name feature: `getDisplayName`/`getDisplayHtml` in `src/lib/workspace-utils.ts`
  - Shows chapter name only, strips "SystemName_" prefix from headings
- Table repositioning fix: cascading reposition on expand/collapse (WorkspaceEditor.tsx)
- Statusline: dir, git branch, context %

**Next session:**
- Test display name fix in browser
- Add element repositioning on workspace load (fix stale gaps)
