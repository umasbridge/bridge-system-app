/**
 * Seed Conventions Script
 * Run with: npx tsx scripts/seedConventions.ts
 *
 * Reads convention markdown files and inserts them into Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// You'll need to set these environment variables or replace with actual values
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fwvbjmntuersvhvqxuxq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''; // Need service key for admin operations

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required');
  console.error('Get it from: Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Get admin user ID
const ADMIN_EMAIL = 'umasbridge@gmail.com';

interface RowData {
  id: string;
  bid: string;
  meaning: string;
  children: RowData[];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function parseConventionMarkdown(markdown: string) {
  const lines = markdown.split('\n');

  let name = '';
  let description = '';
  let slug = '';
  const rows: RowData[] = [];

  const stack: { indent: number; row: RowData }[] = [];
  let inDescription = false;

  for (const line of lines) {
    // Parse H1 - Convention name
    if (line.startsWith('# ')) {
      name = line.substring(2).trim();
      slug = name.toLowerCase()
        .replace(/[()]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      inDescription = true;
      continue;
    }

    // Parse description
    if (inDescription && !line.startsWith('---') && !line.startsWith('#')) {
      if (line.trim()) {
        description += (description ? ' ' : '') + line.trim();
      }
      continue;
    }

    if (line.startsWith('---')) {
      inDescription = false;
      continue;
    }

    // Parse H2 - Trigger sequence
    if (line.startsWith('## ') && line.includes('=')) {
      const content = line.substring(3).trim();
      const [bid, meaning] = content.split('=').map(s => s.trim());

      const row: RowData = {
        id: generateId(),
        bid,
        meaning,
        children: []
      };

      rows.push(row);
      stack.length = 0;
      stack.push({ indent: -1, row });
      continue;
    }

    // Skip H3 section headers
    if (line.startsWith('### ')) {
      continue;
    }

    // Parse bullet points
    const bulletMatch = line.match(/^(\s*)-\s+\*\*([^*]+)\*\*\s*=\s*(.+)$/);
    if (bulletMatch) {
      const [, indentStr, bid, meaning] = bulletMatch;
      const indent = indentStr.length;

      const row: RowData = {
        id: generateId(),
        bid: bid.trim(),
        meaning: meaning.trim(),
        children: []
      };

      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length > 0) {
        stack[stack.length - 1].row.children.push(row);
      } else {
        rows.push(row);
      }

      stack.push({ indent, row });
    }
  }

  return { name, description, slug, rows };
}

async function getAdminUserId(): Promise<string> {
  const { data, error } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .single();

  if (error) {
    // Try raw SQL if the above doesn't work
    const { data: sqlData, error: sqlError } = await supabase.rpc('get_admin_user_id');
    if (sqlError) {
      console.error('Could not find admin user. Creating placeholder...');
      // For now, we'll use a placeholder - the RLS policies will handle access
      return '00000000-0000-0000-0000-000000000000';
    }
    return sqlData;
  }

  return data.id;
}

async function seedConvention(filePath: string, adminUserId: string) {
  console.log(`\nProcessing: ${filePath}`);

  const markdown = fs.readFileSync(filePath, 'utf-8');
  const parsed = parseConventionMarkdown(markdown);

  console.log(`  Name: ${parsed.name}`);
  console.log(`  Slug: ${parsed.slug}`);
  console.log(`  Rows: ${parsed.rows.length}`);

  // Check if convention already exists
  const { data: existing } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', parsed.slug)
    .single();

  if (existing) {
    console.log(`  Already exists, skipping...`);
    return;
  }

  // Create workspace
  const workspaceId = crypto.randomUUID();
  const { error: wsError } = await supabase
    .from('workspaces')
    .insert({
      id: workspaceId,
      user_id: adminUserId,
      title: parsed.name,
      title_html_content: `<span style="font-weight: 700; font-size: 18px">${parsed.name}</span>`,
      is_library: true,
      library_type: 'convention',
      slug: parsed.slug,
      canvas_width: 794,
      canvas_height: 1123
    });

  if (wsError) {
    console.error(`  Error creating workspace:`, wsError);
    return;
  }

  // Create element
  const { error: elError } = await supabase
    .from('elements')
    .insert({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      type: 'systems-table',
      position: { x: 20, y: 20 },
      size: { width: 750, height: 600 },
      z_index: 0,
      name: parsed.name,
      data: {
        initialRows: parsed.rows,
        levelWidths: { 0: 80 },
        meaningWidth: 400,
        showName: false
      }
    });

  if (elError) {
    console.error(`  Error creating element:`, elError);
    return;
  }

  console.log(`  ✓ Created successfully`);
}

async function main() {
  console.log('Seeding conventions...');

  // Get admin user ID
  const adminUserId = await getAdminUserId();
  console.log(`Admin user ID: ${adminUserId}`);

  // Find all convention files
  const conventionsDir = path.join(__dirname, '../docs/conventions');
  const files = fs.readdirSync(conventionsDir).filter(f => f.endsWith('.md'));

  console.log(`Found ${files.length} convention files`);

  for (const file of files) {
    await seedConvention(path.join(conventionsDir, file), adminUserId);
  }

  console.log('\nDone!');
}

main().catch(console.error);
