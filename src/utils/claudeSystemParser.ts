/**
 * Claude System Parser
 * Client-side utility to parse bridge bidding system documents using Claude API
 * via Supabase Edge Function
 */

import { supabase } from '../lib/supabase';

export interface RowData {
  id: string;
  bid: string;
  bidHtmlContent: string;
  meaning: string;
  meaningHtmlContent: string;
  children: RowData[];
}

export interface TableContent {
  type: 'table';
  name: string;
  rows: RowData[];
}

export interface TextContent {
  type: 'text';
  name: string;
  content: string;
}

export type ChapterContent = TableContent | TextContent;

export interface ChapterData {
  name: string;
  content: ChapterContent[];
}

export interface ParsedSystem {
  systemName: string;
  chapters: ChapterData[];
}

export interface ParseProgress {
  stage: 'uploading' | 'extracting' | 'analyzing' | 'creating' | 'building' | 'generating' | 'complete' | 'error';
  progress: number;
  message: string;
}

/**
 * Parse a bridge bidding system document using Claude API
 * @param extractedText - Text extracted from PDF
 * @param systemName - Name of the system
 * @param onProgress - Progress callback
 * @returns Parsed system structure
 */
export async function parseSystemDocument(
  extractedText: string,
  systemName: string,
  onProgress?: (progress: ParseProgress) => void
): Promise<ParsedSystem> {
  onProgress?.({
    stage: 'analyzing',
    progress: 35,
    message: 'Analyzing structure with AI...'
  });

  try {
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('parse-system-doc', {
      body: {
        extractedText,
        systemName
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to parse document');
    }

    if (!data) {
      throw new Error('No data returned from parser');
    }

    onProgress?.({
      stage: 'analyzing',
      progress: 70,
      message: 'Structure analysis complete'
    });

    return data as ParsedSystem;
  } catch (err) {
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: err instanceof Error ? err.message : 'Failed to parse document'
    });
    throw err;
  }
}

/**
 * Validate parsed system structure
 * @param parsed - Parsed system to validate
 * @returns Validation result with errors if any
 */
export function validateParsedSystem(parsed: ParsedSystem): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!parsed.systemName) {
    errors.push('System name is missing');
  }

  if (!parsed.chapters || parsed.chapters.length === 0) {
    errors.push('No chapters found in document');
  } else {
    parsed.chapters.forEach((chapter, i) => {
      if (!chapter.name) {
        warnings.push(`Chapter ${i + 1} has no name`);
      }
      if (!chapter.content || chapter.content.length === 0) {
        warnings.push(`Chapter "${chapter.name || i + 1}" has no content`);
      } else {
        chapter.content.forEach((item, j) => {
          if (item.type === 'table' && (!item.rows || item.rows.length === 0)) {
            warnings.push(`Table "${item.name || j + 1}" in chapter "${chapter.name || i + 1}" has no rows`);
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Count total elements in parsed system
 * @param parsed - Parsed system
 * @returns Element counts
 */
export function countParsedElements(parsed: ParsedSystem): {
  chapters: number;
  tables: number;
  textBoxes: number;
  rows: number;
  totalBids: number;
} {
  let tables = 0;
  let textBoxes = 0;
  let rows = 0;
  let totalBids = 0;

  const countRows = (rowList: RowData[]): void => {
    for (const row of rowList) {
      rows++;
      if (row.bid) totalBids++;
      if (row.children && row.children.length > 0) {
        countRows(row.children);
      }
    }
  };

  for (const chapter of parsed.chapters) {
    for (const item of chapter.content) {
      if (item.type === 'table') {
        tables++;
        countRows(item.rows);
      } else {
        textBoxes++;
      }
    }
  }

  return {
    chapters: parsed.chapters.length,
    tables,
    textBoxes,
    rows,
    totalBids
  };
}
