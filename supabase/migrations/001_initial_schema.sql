-- Bridge System App - Initial Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- WORKSPACES TABLE
-- =====================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  border_color TEXT DEFAULT '#000000',
  border_width INTEGER DEFAULT 1,
  background_color TEXT DEFAULT 'white',
  canvas_width INTEGER DEFAULT 794,
  canvas_height INTEGER DEFAULT 1123,
  partners JSONB DEFAULT '[]'::jsonb
);

-- Index for faster user queries
CREATE INDEX idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX idx_workspaces_updated_at ON workspaces(updated_at DESC);

-- =====================
-- ELEMENTS TABLE
-- =====================
CREATE TABLE elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('systems-table', 'text', 'image', 'pdf', 'file')),
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}'::jsonb,
  size JSONB NOT NULL DEFAULT '{"width": 400, "height": 200}'::jsonb,
  z_index INTEGER NOT NULL DEFAULT 0,
  border_color TEXT DEFAULT 'transparent',
  border_width INTEGER DEFAULT 0,
  fill_color TEXT,
  is_manually_positioned BOOLEAN DEFAULT false,
  name TEXT,
  -- Type-specific data stored as JSONB
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster workspace element queries
CREATE INDEX idx_elements_workspace_id ON elements(workspace_id);
CREATE INDEX idx_elements_z_index ON elements(workspace_id, z_index);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;

-- Workspace policies
CREATE POLICY "Users can view own workspaces"
  ON workspaces FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspaces"
  ON workspaces FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspaces"
  ON workspaces FOR DELETE
  USING (auth.uid() = user_id);

-- Element policies (based on workspace ownership)
CREATE POLICY "Users can view elements in own workspaces"
  ON elements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = elements.workspace_id
      AND workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert elements in own workspaces"
  ON elements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = elements.workspace_id
      AND workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update elements in own workspaces"
  ON elements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = elements.workspace_id
      AND workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete elements in own workspaces"
  ON elements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = elements.workspace_id
      AND workspaces.user_id = auth.uid()
    )
  );

-- =====================
-- STORAGE BUCKET FOR IMAGES/PDFS
-- =====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-files', 'workspace-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload to own workspace folders"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'workspace-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own workspace files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'workspace-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own workspace files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'workspace-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================
-- HELPER FUNCTIONS
-- =====================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_elements_updated_at
  BEFORE UPDATE ON elements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
