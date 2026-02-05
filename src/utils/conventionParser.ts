/**
 * Convention Parser
 * Converts convention markdown files to RowData structure for SystemsTable
 */

import type { RowData } from '../components/systems-table';

interface ParsedConvention {
  name: string;
  description: string;        // Plain text description (legacy)
  descriptionHtml: string;    // HTML formatted description for text element
  slug: string;
  rows: RowData[];
}

/**
 * Generate a unique ID for rows
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Convert simple markdown to HTML
 */
function markdownToHtml(md: string): string {
  let html = md
    // Bold: **text** -> <strong>text</strong>
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic: *text* -> <em>text</em>
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Line breaks: double newline -> <br><br>
    .replace(/\n\n/g, '<br><br>')
    // Single newlines -> <br>
    .replace(/\n/g, '<br>');

  return html;
}

/**
 * Parse a convention markdown file into RowData structure
 *
 * Expected format:
 * # Convention Name
 * ## Description
 * Description text with **bold** and other markdown...
 * ---
 * ## trigger-sequence = Name
 * ### Section (optional)
 * - **bid** = meaning
 *   - **followup** = meaning
 *     - **deeper** = meaning
 */
export function parseConventionMarkdown(markdown: string): ParsedConvention {
  const lines = markdown.split('\n');

  let name = '';
  let description = '';
  let descriptionLines: string[] = [];
  let slug = '';
  const rows: RowData[] = [];

  // Stack to track parent rows at each indentation level
  const stack: { indent: number; row: RowData }[] = [];

  let inDescription = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Parse H1 - Convention name
    if (line.startsWith('# ')) {
      name = line.substring(2).trim();
      slug = name.toLowerCase()
        .replace(/[()]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      continue;
    }

    // Parse ## Description section
    if (line.startsWith('## Description')) {
      inDescription = true;
      continue;
    }

    // End of description on --- or next ## section
    if (inDescription && (line.startsWith('---') || (line.startsWith('## ') && !line.startsWith('## Description')))) {
      inDescription = false;
      // Don't continue - let this line be processed below if it's a ## section
      if (line.startsWith('---')) {
        continue;
      }
    }

    // Collect description lines
    if (inDescription) {
      descriptionLines.push(line);
      continue;
    }

    // Parse H2 - Trigger sequence (e.g., ## 1n-(p)-2c = Stayman)
    if (line.startsWith('## ') && line.includes('=')) {
      foundFirstSection = true;
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

    // Skip H3 section headers (e.g., ### Opener's Responses)
    if (line.startsWith('### ')) {
      continue;
    }

    // Parse bullet points - the tree structure
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

      // Find parent based on indentation
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length > 0) {
        // Add as child of current parent
        stack[stack.length - 1].row.children.push(row);
      } else {
        // Top level row
        rows.push(row);
      }

      stack.push({ indent, row });
    }
  }

  // Build description from collected lines
  description = descriptionLines.join(' ').trim();
  const descriptionHtml = markdownToHtml(descriptionLines.join('\n').trim());

  return { name, description, descriptionHtml, slug, rows };
}

/**
 * Create workspace and element data for a convention
 */
export function createConventionWorkspaceData(
  parsed: ParsedConvention,
  userId: string
) {
  const workspaceId = crypto.randomUUID();
  const descriptionElementId = crypto.randomUUID();
  const tableElementId = crypto.randomUUID();

  const workspace = {
    id: workspaceId,
    user_id: userId,
    title: parsed.name,
    is_library: true,
    library_type: 'convention',
    slug: parsed.slug,
    canvas_width: 794,
    canvas_height: 1123
  };

  const elements: any[] = [];

  // Add description text element if there's a description
  if (parsed.descriptionHtml) {
    elements.push({
      id: descriptionElementId,
      workspace_id: workspaceId,
      type: 'text',
      position: { x: 20, y: 20 },
      size: { width: 750, height: 100 },
      z_index: 0,
      data: {
        htmlContent: parsed.descriptionHtml
      }
    });
  }

  // Add systems table element
  const tableYPosition = parsed.descriptionHtml ? 140 : 20; // Below description if present
  elements.push({
    id: tableElementId,
    workspace_id: workspaceId,
    type: 'systems-table',
    position: { x: 20, y: tableYPosition },
    size: { width: 750, height: 400 },
    z_index: 1,
    name: parsed.name,
    data: {
      initialRows: parsed.rows,
      levelWidths: { 0: 80 },
      meaningWidth: 300,
      showName: true
    }
  });

  return { workspace, elements };
}

/**
 * Parse all convention files from a directory
 * (For use in a Node.js script or build step)
 */
export async function parseConventionFile(filePath: string): Promise<ParsedConvention> {
  // This would be used in a Node.js context
  // For browser, we'd fetch the file content differently
  const response = await fetch(filePath);
  const markdown = await response.text();
  return parseConventionMarkdown(markdown);
}
