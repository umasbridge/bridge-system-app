-- Conventions Library Migration
-- Adds support for library workspaces (conventions, base systems)

-- Add library columns to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_library BOOLEAN DEFAULT false;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS library_type TEXT; -- 'convention' | 'base_system'
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE; -- 'stayman_1nt' for URL-friendly access

-- Index for library queries
CREATE INDEX IF NOT EXISTS idx_workspaces_is_library ON workspaces(is_library) WHERE is_library = true;
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug) WHERE slug IS NOT NULL;

-- Update RLS policies to allow viewing library workspaces

-- Drop existing select policy
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;

-- New select policy: own workspaces OR library workspaces
CREATE POLICY "Users can view own or library workspaces"
  ON workspaces FOR SELECT
  USING (auth.uid() = user_id OR is_library = true);

-- Admin check function (for editing library content)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT email = 'umasbridge@gmail.com' FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update policy: own workspaces OR admin can edit library
DROP POLICY IF EXISTS "Users can update own workspaces" ON workspaces;
CREATE POLICY "Users can update own or admin library workspaces"
  ON workspaces FOR UPDATE
  USING (auth.uid() = user_id OR (is_library = true AND is_admin()));

-- Elements: allow viewing elements in library workspaces
DROP POLICY IF EXISTS "Users can view elements in own workspaces" ON elements;
CREATE POLICY "Users can view elements in own or library workspaces"
  ON elements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = elements.workspace_id
      AND (workspaces.user_id = auth.uid() OR workspaces.is_library = true)
    )
  );

-- Elements: admin can edit library elements
DROP POLICY IF EXISTS "Users can update elements in own workspaces" ON elements;
CREATE POLICY "Users can update elements in own or library workspaces"
  ON elements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = elements.workspace_id
      AND (workspaces.user_id = auth.uid() OR (workspaces.is_library = true AND is_admin()))
    )
  );

-- Elements: admin can insert into library workspaces
DROP POLICY IF EXISTS "Users can insert elements in own workspaces" ON elements;
CREATE POLICY "Users can insert elements in own or library workspaces"
  ON elements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = elements.workspace_id
      AND (workspaces.user_id = auth.uid() OR (workspaces.is_library = true AND is_admin()))
    )
  );

-- Elements: admin can delete from library workspaces
DROP POLICY IF EXISTS "Users can delete elements in own workspaces" ON elements;
CREATE POLICY "Users can delete elements in own or library workspaces"
  ON elements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = elements.workspace_id
      AND (workspaces.user_id = auth.uid() OR (workspaces.is_library = true AND is_admin()))
    )
  );
