# Supabase Migration Handover

## Context
Bridge System App - migrated from IndexedDB (Dexie) to Supabase for cloud persistence and auth.

## Current Status: IMAGE OPERATIONS FIXED (Needs Manual Image Test)

### What's Done (This Session - 2025-11-27)
1. **Image operations rewritten for Supabase Storage**
   - `imageOperations.create()` uploads to Storage, returns permanent URL
   - `imageOperations.delete()` now takes (workspaceId, elementId, imageId)
   - `imageOperations.deleteByWorkspaceId()` cleans up on workspace delete
   - `imageOperations.deleteByElementId()` for element cleanup
2. **Components updated for Storage URLs**
   - `TextElement.tsx` and `RichTextCell.tsx` use Storage URLs directly (not objectURLs)
   - Images use `crypto.randomUUID()` for proper UUIDs
   - Removed objectURL loading machinery (no longer needed)
3. **Workspace delete cleans Storage** - Added in `WorkspaceSystem.tsx`
4. **++ button auto-expands parent** - Fixed UX issue where child rows were hidden

### Verified Working
- [x] Text element creation and persistence
- [x] Table element creation and persistence
- [x] Table row data persistence (nested children save correctly)
- [x] Workspace list retrieval
- [x] Build passes without TypeScript errors
- [x] No console errors

### Still Needs Manual Testing
- [ ] **Image paste** - Paste image into text element, refresh, verify it displays
- [ ] Element deletion
- [ ] Workspace deletion (should clean up Storage files)

## Credentials
`.env` file contains:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` - API access
- `APP_ADMIN_EMAIL` / `APP_ADMIN_PASSWORD` - App login (`umasbridge@gmail.com` / `snapdragon`)

## Key Files
- `src/lib/supabase.ts` - Supabase client
- `src/lib/supabase-db.ts` - Database operations (workspaceOperations, elementOperations, imageOperations)
- `src/lib/auth-context.tsx` - Auth state
- `src/db/database.ts` - OLD IndexedDB (can be deleted after verification)

## Known Issues / Cleanup Needed
1. **Test workspace has ~15 empty child rows** - Created during ++ button testing
   - Run this SQL to clean up: See "Cleanup SQL" section below

## Cleanup SQL
```sql
-- View current table data structure
SELECT id, name, data->'initialRows' as rows
FROM elements WHERE type = 'systems-table';

-- To delete empty child rows, update the initialRows JSON manually in Supabase dashboard
-- or delete the test workspace and recreate
```

## Prompt for Next Thread

```
Continue bridge-system-app development.

Previous session completed:
- Image operations rewritten for Supabase Storage
- Components use Storage URLs directly (persist after refresh)
- ++ button now auto-expands parent row
- All verified: text/table persistence works

PRIORITY TASKS:
1. Manual test: Paste image into text element, refresh, verify it displays
2. If images work, delete old src/db/database.ts
3. Clean up test data (optional)

Login: umasbridge@gmail.com / snapdragon

The app is at http://localhost:3001 (run `npm run dev` if not running)
```
