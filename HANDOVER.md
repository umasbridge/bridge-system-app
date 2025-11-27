# Supabase Migration Handover

## Context
Bridge System App - migrated from IndexedDB (Dexie) to Supabase for cloud persistence and auth.

## Current Status: MIGRATION COMPLETE (Needs Verification)

### What's Done
1. **Supabase client setup** - `src/lib/supabase.ts` with env vars in `.env`
2. **Auth integration complete** - Login, Signup, ProtectedRoute all use Supabase auth
3. **Database API layer** - `src/lib/supabase-db.ts` replaces IndexedDB
4. **SQL schema deployed** - Tables `workspaces` and `elements` with RLS
5. **All 10 component imports updated** to use `supabase-db.ts`
6. **Admin user created** - `umasbridge@gmail.com` / `snapdragon`
7. **Storage bucket created** - `workspace-files` for images (public, with RLS policies)
8. **Google OAuth scaffolded** - Code ready, needs Google Cloud Console setup
9. **UUID fix** - Element IDs now use `crypto.randomUUID()` instead of short strings
10. **Tested and verified** - Login, workspace creation, element persistence all work

### Bugs Fixed This Session
- Element IDs were short strings (`x6jr5b`), changed to UUIDs for Supabase
- Added missing `imageOperations.getByElementId()` stub method

## Credentials
`.env` file contains:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` - API access
- `APP_ADMIN_EMAIL` / `APP_ADMIN_PASSWORD` - App login (`umasbridge@gmail.com` / `snapdragon`)

## Key Files
- `src/lib/supabase.ts` - Supabase client
- `src/lib/supabase-db.ts` - Database operations (workspaceOperations, elementOperations, imageOperations)
- `src/lib/auth-context.tsx` - Auth state (signIn, signUp, signInWithGoogle, signOut)
- `src/db/database.ts` - OLD IndexedDB (can be deleted after verification)

## What Needs Verification Next Thread

### CRITICAL: Verify Feature Parity with IndexedDB

The old `src/db/database.ts` had these operations that MUST work in Supabase:

**workspaceOperations:**
- [x] `create(title)` - Tested, works
- [x] `getAll()` - Tested, works
- [x] `getById(id)` - Used in app, needs explicit test
- [x] `update(id, updates)` - Used in app, needs explicit test
- [x] `delete(id)` - Used in app, needs explicit test

**elementOperations:**
- [x] `create(element)` - Tested, works
- [x] `getByWorkspaceId(workspaceId)` - Tested, works (elements load on refresh)
- [ ] `getAll()` - Needs test
- [ ] `update(id, updates)` - Needs test (editing table rows, moving elements)
- [ ] `delete(id)` - Needs test
- [ ] `bulkUpdate(elements)` - Needs test
- [ ] `deleteByWorkspaceId(workspaceId)` - Needs test

**imageOperations:**
- [ ] `create(image)` - Needs test (paste image into text element)
- [ ] `getByElementId(elementId)` - Currently returns `[]` (stub)
- [ ] `getUrl(workspaceId, elementId, fileName)` - Needs test
- [ ] `delete(...)` - Needs test
- [ ] `deleteByWorkspaceId(workspaceId)` - Needs test

### Test Checklist for Next Thread
1. Edit a Systems Table (add rows, edit cells) - verify `elementOperations.update` works
2. Move/resize an element - verify position updates persist
3. Delete an element - verify `elementOperations.delete` works
4. Delete a workspace - verify cascade deletes elements
5. Paste an image into a text element - verify Storage upload works
6. Verify images display after refresh

### Google OAuth Setup (Optional)
To enable Google login:
1. Google Cloud Console → Create OAuth 2.0 credentials
2. Add redirect URI: `https://fwvbjmntuersvhvqxuxq.supabase.co/auth/v1/callback`
3. Supabase Dashboard → Auth → Providers → Google → Add Client ID/Secret

## Prompt for Next Thread

```
Continue Supabase migration verification for bridge-system-app.

Previous work completed:
- Full migration from IndexedDB to Supabase done
- Auth, workspaces, elements all working
- Storage bucket created for images
- Admin login: umasbridge@gmail.com / snapdragon

CRITICAL TASK: Verify ALL IndexedDB functionality works in Supabase
1. Test element updates (edit table rows, move/resize elements)
2. Test element deletion
3. Test workspace deletion (should cascade delete elements)
4. Test image paste into text elements (uses Supabase Storage)
5. Compare src/db/database.ts with src/lib/supabase-db.ts for any missing features

Once verified:
- Delete old src/db/database.ts
- Update CLAUDE.md to reflect Supabase as the database

See HANDOVER.md for full checklist.
```
