/**
 * System Document Import Utility
 * Creates workspaces and elements from parsed bidding system documents
 */

import { supabase } from '../lib/supabase';
import {
  workspaceOperations,
  elementOperations,
  type SystemsTableElement,
  type TextElement,
  type RowData as DBRowData
} from '../lib/supabase-db';
import type { ParsedSystem, ChapterContent, RowData, ParseProgress } from './claudeSystemParser';

export interface ImportResult {
  systemWorkspaceId: string;
  chapterWorkspaceIds: string[];
  totalTables: number;
  totalTextBoxes: number;
  totalBids: number;
}

/**
 * Import a parsed system document into the database
 * Creates: System workspace + TOC + Chapter workspaces + Tables/Text + Bidding rules
 */
export async function importParsedSystem(
  parsedSystem: ParsedSystem,
  onProgress?: (progress: ParseProgress) => void
): Promise<ImportResult> {
  const chapterWorkspaceIds: string[] = [];
  let totalTables = 0;
  let totalTextBoxes = 0;
  let totalBids = 0;

  try {
    onProgress?.({
      stage: 'creating',
      progress: 72,
      message: 'Creating system workspace...'
    });

    // 1. Create main system workspace
    const systemWorkspace = await workspaceOperations.create(parsedSystem.systemName, 'bidding_system');

    // Set the title HTML content
    await workspaceOperations.update(systemWorkspace.id, {
      titleHtmlContent: `<span style="font-weight: 700">${parsedSystem.systemName}</span>`
    });

    onProgress?.({
      stage: 'creating',
      progress: 75,
      message: 'Creating chapters...'
    });

    // 2. Create chapter workspaces and collect their IDs for TOC
    const chapterInfo: { name: string; workspaceId: string; content: ChapterContent[] }[] = [];

    for (let i = 0; i < parsedSystem.chapters.length; i++) {
      const chapter = parsedSystem.chapters[i];
      const chapterTitle = `${parsedSystem.systemName}_${chapter.name}`;

      // Create chapter workspace (type='user_defined', it's a linked workspace)
      const chapterWorkspace = await workspaceOperations.create(chapterTitle, 'user_defined');

      await workspaceOperations.update(chapterWorkspace.id, {
        titleHtmlContent: `<span style="font-weight: 700">${chapter.name}</span>`
      });

      // Update chapter workspace to be wider for content
      await workspaceOperations.update(chapterWorkspace.id, {
        canvasWidth: 900
      });

      chapterWorkspaceIds.push(chapterWorkspace.id);
      chapterInfo.push({
        name: chapter.name,
        workspaceId: chapterWorkspace.id,
        content: chapter.content
      });

      onProgress?.({
        stage: 'creating',
        progress: 75 + Math.floor((i / parsedSystem.chapters.length) * 10),
        message: `Created chapter: ${chapter.name}`
      });
    }

    onProgress?.({
      stage: 'building',
      progress: 85,
      message: 'Building content...'
    });

    // 3. Create tables and text boxes in each chapter workspace
    const MYGAP = 43; // Standard spacing between elements
    for (const chapter of chapterInfo) {
      let yPosition = 50;
      let zIndex = 1;

      for (const item of chapter.content) {
        if (item.type === 'table') {
          // Create a systems-table element
          const dbRows = convertToDBRows(item.rows);
          totalTables++;
          totalBids += countBids(item.rows);

          // Calculate table height based on row count
          const rowCount = countAllRows(item.rows);
          const estimatedHeight = Math.max(200, rowCount * 32 + 80);

          const tableElement: SystemsTableElement = {
            id: crypto.randomUUID(),
            workspaceId: chapter.workspaceId,
            type: 'systems-table',
            name: item.name,
            position: { x: 50, y: yPosition },
            size: { width: 820, height: estimatedHeight },
            zIndex: zIndex++,
            showName: true,
            nameHtmlContent: `<span style="font-weight: 700">${item.name}</span>`,
            initialRows: dbRows,
            meaningWidth: 620,
            levelWidths: { 0: 100 },
            gridlines: { enabled: false, color: '#D1D5DB', width: 1 }
          };

          await elementOperations.create(tableElement);
          yPosition += estimatedHeight + MYGAP;
        } else {
          // Create a text element
          totalTextBoxes++;

          // Convert text content to HTML preserving formatting
          const htmlContent = convertTextToHtml(item.content);

          // Height estimation: title (~40px) + content lines + list padding
          const lineCount = (item.content.match(/\n/g) || []).length + 1;
          const listItemCount = (item.content.match(/^\s*(\d+[\.\)]|[a-zA-Z][\.\)]|[-*•●])\s+/gm) || []).length;
          // 24px per line, 6px extra per list item, 50px for title/padding
          const estimatedHeight = Math.max(100, lineCount * 24 + listItemCount * 6 + 50);

          const textElement: TextElement = {
            id: crypto.randomUUID(),
            workspaceId: chapter.workspaceId,
            type: 'text',
            name: item.name,
            position: { x: 50, y: yPosition },
            size: { width: 820, height: estimatedHeight },
            zIndex: zIndex++,
            content: item.content,
            htmlContent: `<div style="font-weight: 700; margin-bottom: 12px; font-size: 14px;">${item.name}</div>${htmlContent}`
          };

          await elementOperations.create(textElement);
          yPosition += estimatedHeight + MYGAP;
        }
      }
    }

    onProgress?.({
      stage: 'building',
      progress: 90,
      message: 'Creating table of contents...'
    });

    // 4. Create TOC table in system workspace with hyperlinks to chapters
    const tocRows: DBRowData[] = chapterInfo.map((chapter) => ({
      id: crypto.randomUUID(),
      bid: chapter.name,
      bidHtmlContent: createHyperlinkHtml(chapter.name, `${parsedSystem.systemName}_${chapter.name}`),
      meaning: '',
      meaningHtmlContent: '',
      children: []
    }));

    // Calculate TOC width based on longest chapter name
    // Minimum 300px to fit "Table of Contents" heading without wrapping
    const maxChapterNameLength = Math.max(...chapterInfo.map(c => c.name.length));
    const tocWidth = Math.min(500, Math.max(300, maxChapterNameLength * 10 + 50));

    // TOC has chapter names in bid column, meaning column minimal
    // meaningWidth = total row width (must be >= levelWidths[0] + actual meaning column)
    // actualMeaningWidth = meaningWidth - levelWidths[0] for level 0
    const tocBidColumnWidth = tocWidth - 30; // Most of width for chapter names
    const tocElement: SystemsTableElement = {
      id: crypto.randomUUID(),
      workspaceId: systemWorkspace.id,
      type: 'systems-table',
      name: `${parsedSystem.systemName}_TOC`,
      position: { x: 50, y: 50 },
      size: { width: tocWidth, height: Math.max(150, tocRows.length * 32 + 80) },
      zIndex: 1,
      showName: true,
      nameHtmlContent: `<span style="font-weight: 700">Table of Contents</span>`,
      initialRows: tocRows,
      meaningWidth: tocWidth, // Total row width
      levelWidths: { 0: tocBidColumnWidth }, // Bid column width
      gridlines: { enabled: false, color: '#D1D5DB', width: 1 }
    };

    await elementOperations.create(tocElement);

    // Update system workspace - ensure minimum 600px for button bar visibility
    await workspaceOperations.update(systemWorkspace.id, {
      canvasWidth: Math.max(600, tocWidth + 100)
    });

    onProgress?.({
      stage: 'generating',
      progress: 95,
      message: 'Generating practice rules...'
    });

    // 5. Extract bidding rules for practice
    try {
      await supabase.rpc('extract_bidding_rules', { p_system_id: systemWorkspace.id });
    } catch (err) {
      console.warn('Failed to extract bidding rules:', err);
      // Non-fatal - continue with import
    }

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Import complete!'
    });

    return {
      systemWorkspaceId: systemWorkspace.id,
      chapterWorkspaceIds,
      totalTables,
      totalTextBoxes,
      totalBids
    };

  } catch (error) {
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'Import failed'
    });
    throw error;
  }
}

/**
 * Convert parsed RowData to database RowData format
 */
function convertToDBRows(rows: RowData[]): DBRowData[] {
  return rows.map(row => ({
    id: row.id || crypto.randomUUID(),
    bid: row.bid,
    bidHtmlContent: row.bidHtmlContent || `<span>${row.bid}</span>`,
    meaning: row.meaning,
    meaningHtmlContent: row.meaningHtmlContent || `<span>${row.meaning}</span>`,
    children: row.children ? convertToDBRows(row.children) : []
  }));
}

/**
 * Convert plain text to HTML preserving original formatting
 * Processes line by line - handles numbered lists with nested bullets
 * Preserves indentation for non-list content
 */
function convertTextToHtml(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  // Simple state tracking
  let inNumberedList = false;
  let inBulletList = false;
  let lastNumberedItemOpen = false; // Track if we need to close a <li> tag

  // Patterns - use trimmed line for matching to handle inconsistent PDF spacing
  const numberedPattern = /^(\d+)[\.\)]\s+(.*)$/;
  const bulletPattern = /^[-*•●○◦▪▸►]\s+(.*)$/;

  const escapeHtml = (str: string) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Get leading whitespace count
  const getIndent = (line: string) => {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const indent = getIndent(line);

    // Handle empty lines
    if (trimmedLine === '') {
      result.push('<div style="height: 8px;"></div>');
      continue;
    }

    // Check for numbered list item (1. 2. 3. etc) - use trimmed line
    const numberedMatch = trimmedLine.match(numberedPattern);
    if (numberedMatch) {
      const content = escapeHtml(numberedMatch[2]);

      // Close any open bullet list
      if (inBulletList) {
        result.push('</ul>');
        inBulletList = false;
      }

      // Close previous numbered item if open
      if (lastNumberedItemOpen) {
        result.push('</li>');
        lastNumberedItemOpen = false;
      }

      // Start numbered list if not in one
      if (!inNumberedList) {
        result.push('<ol style="margin: 8px 0; padding-left: 28px; list-style-type: decimal;">');
        inNumberedList = true;
      }

      result.push(`<li style="margin-bottom: 10px;">${content}`);
      lastNumberedItemOpen = true;
      continue;
    }

    // Check for bullet list item - use trimmed line
    const bulletMatch = trimmedLine.match(bulletPattern);
    if (bulletMatch) {
      const content = escapeHtml(bulletMatch[1]);

      // If we're in a numbered list, start a nested bullet list
      if (inNumberedList && !inBulletList) {
        result.push('<ul style="margin: 6px 0 6px 20px; padding-left: 20px; list-style-type: disc;">');
        inBulletList = true;
      } else if (!inBulletList) {
        // Standalone bullet list
        result.push('<ul style="margin: 8px 0; padding-left: 28px; list-style-type: disc;">');
        inBulletList = true;
      }

      result.push(`<li style="margin-bottom: 6px;">${content}</li>`);
      continue;
    }

    // Non-list line - close all lists
    if (inBulletList) {
      result.push('</ul>');
      inBulletList = false;
    }
    if (lastNumberedItemOpen) {
      result.push('</li>');
      lastNumberedItemOpen = false;
    }
    if (inNumberedList) {
      result.push('</ol>');
      inNumberedList = false;
    }

    // Regular paragraph - preserve indentation
    const marginLeft = indent > 0 ? `margin-left: ${indent * 8}px; ` : '';
    result.push(`<div style="${marginLeft}margin-bottom: 8px;">${escapeHtml(trimmedLine)}</div>`);
  }

  // Close any remaining open tags
  if (inBulletList) result.push('</ul>');
  if (lastNumberedItemOpen) result.push('</li>');
  if (inNumberedList) result.push('</ol>');

  return `<div style="font-family: inherit; line-height: 1.6;">${result.join('')}</div>`;
}

/**
 * Create hyperlink HTML for TOC entries
 * Uses the same format as RichTextCell.applyHyperlink
 */
function createHyperlinkHtml(displayText: string, targetWorkspaceTitle: string): string {
  return `<a href="#" data-workspace="${targetWorkspaceTitle}" data-link-type="split-view" class="text-green-600 underline cursor-pointer hover:text-green-800">${displayText}</a>`;
}

/**
 * Count total rows including nested children
 */
function countAllRows(rows: RowData[]): number {
  let count = 0;
  for (const row of rows) {
    count++;
    if (row.children && row.children.length > 0) {
      count += countAllRows(row.children);
    }
  }
  return count;
}

/**
 * Count bids (non-empty bid fields)
 */
function countBids(rows: RowData[]): number {
  let count = 0;
  for (const row of rows) {
    if (row.bid) count++;
    if (row.children && row.children.length > 0) {
      count += countBids(row.children);
    }
  }
  return count;
}

/**
 * Delete an imported system and all its components
 * Useful for cleanup if import is interrupted
 */
export async function deleteImportedSystem(
  systemWorkspaceId: string,
  chapterWorkspaceIds: string[]
): Promise<void> {
  // Delete chapter workspaces first
  for (const id of chapterWorkspaceIds) {
    try {
      await workspaceOperations.delete(id);
    } catch (err) {
      console.warn('Failed to delete chapter workspace:', id, err);
    }
  }

  // Delete system workspace (cascades to elements and bidding rules)
  try {
    await workspaceOperations.delete(systemWorkspaceId);
  } catch (err) {
    console.warn('Failed to delete system workspace:', systemWorkspaceId, err);
  }
}
