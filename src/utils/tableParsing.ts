import type { RowData } from '../components/systems-table/SystemsTable';

// Generate unique IDs for rows
export const generateRowId = () => Math.random().toString(36).substring(2, 8);

/**
 * Parse CSS value with units (px, pt, in, cm) to pixels
 */
function parseCssToPixels(value: string): number {
  const match = value.match(/([\d.]+)\s*(px|pt|in|cm|mm)?/i);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  const unit = (match[2] || 'px').toLowerCase();

  switch (unit) {
    case 'pt': return num * 1.333; // 1pt ≈ 1.333px
    case 'in': return num * 96;    // 1in = 96px
    case 'cm': return num * 37.8;  // 1cm ≈ 37.8px
    case 'mm': return num * 3.78;  // 1mm ≈ 3.78px
    default: return num;           // px or no unit
  }
}

/**
 * Detect indentation level from cell content
 * Checks for leading spaces, &nbsp;, and CSS padding/margin
 */
function detectIndentationLevel(cell: Element): number {
  const text = cell.textContent || '';
  const html = cell.innerHTML || '';
  const styleAttr = cell.getAttribute('style') || '';

  // Debug logging
  console.log('[tableParsing] Cell text:', JSON.stringify(text.substring(0, 50)));
  console.log('[tableParsing] Cell style:', styleAttr);

  // Count leading whitespace characters (spaces, tabs)
  let leadingSpaces = 0;
  for (const char of text) {
    if (char === ' ' || char === '\t' || char === '\u00A0') { // \u00A0 is &nbsp;
      leadingSpaces++;
    } else {
      break;
    }
  }

  // Count &nbsp; entities at the start of HTML
  const nbspMatch = html.match(/^(?:&nbsp;|\u00A0|&#160;)+/i);
  const nbspCount = nbspMatch ? (nbspMatch[0].match(/(&nbsp;|\u00A0|&#160;)/gi) || []).length : 0;

  // Check for CSS padding-left or margin-left with any unit
  let cssPadding = 0;

  // Match padding-left, margin-left, text-indent with any unit (px, pt, in, cm)
  const paddingMatch = styleAttr.match(/padding-left\s*:\s*([\d.]+\s*(?:px|pt|in|cm|mm)?)/i);
  const marginMatch = styleAttr.match(/margin-left\s*:\s*([\d.]+\s*(?:px|pt|in|cm|mm)?)/i);
  const textIndentMatch = styleAttr.match(/text-indent\s*:\s*([\d.]+\s*(?:px|pt|in|cm|mm)?)/i);

  if (paddingMatch) {
    const px = parseCssToPixels(paddingMatch[1]);
    cssPadding = Math.max(cssPadding, Math.floor(px / 20));
    console.log('[tableParsing] Found padding-left:', paddingMatch[1], '=', px, 'px, level:', Math.floor(px / 20));
  }

  if (marginMatch) {
    const px = parseCssToPixels(marginMatch[1]);
    cssPadding = Math.max(cssPadding, Math.floor(px / 20));
    console.log('[tableParsing] Found margin-left:', marginMatch[1], '=', px, 'px, level:', Math.floor(px / 20));
  }

  if (textIndentMatch) {
    const px = parseCssToPixels(textIndentMatch[1]);
    if (px > 0) {
      cssPadding = Math.max(cssPadding, Math.floor(px / 20));
      console.log('[tableParsing] Found text-indent:', textIndentMatch[1], '=', px, 'px, level:', Math.floor(px / 20));
    }
  }

  // Also check nested elements for indentation (Word often uses nested spans/paragraphs)
  const nestedElements = cell.querySelectorAll('[style*="margin"], [style*="padding"], [style*="indent"]');
  nestedElements.forEach(el => {
    const nestedStyle = el.getAttribute('style') || '';
    const nestedMargin = nestedStyle.match(/margin-left\s*:\s*([\d.]+\s*(?:px|pt|in|cm|mm)?)/i);
    const nestedPadding = nestedStyle.match(/padding-left\s*:\s*([\d.]+\s*(?:px|pt|in|cm|mm)?)/i);

    if (nestedMargin) {
      const px = parseCssToPixels(nestedMargin[1]);
      cssPadding = Math.max(cssPadding, Math.floor(px / 20));
    }
    if (nestedPadding) {
      const px = parseCssToPixels(nestedPadding[1]);
      cssPadding = Math.max(cssPadding, Math.floor(px / 20));
    }
  });

  // Use the maximum detected indentation
  // Typically 2-4 spaces per level
  const spaceLevel = Math.floor(Math.max(leadingSpaces, nbspCount) / 2);

  const finalLevel = Math.max(spaceLevel, cssPadding);
  console.log('[tableParsing] Final level:', finalLevel, '(spaces:', leadingSpaces, ', nbsp:', nbspCount, ', css:', cssPadding, ')');

  return finalLevel;
}

/**
 * Strip leading whitespace/indentation from text
 */
function stripLeadingIndent(text: string): string {
  return text.replace(/^[\s\u00A0]+/, '').trim();
}

/**
 * Strip leading whitespace entities from HTML
 */
function stripHtmlLeadingIndent(html: string): string {
  return html.replace(/^(?:&nbsp;|\u00A0|&#160;|\s)+/gi, '').trim();
}

/**
 * Clean HTML content by removing extra whitespace from both ends
 * and removing Word/Office specific tags
 */
function cleanHtmlContent(html: string): string {
  let cleaned = html;

  // Remove Microsoft Office specific tags like <o:p></o:p>
  cleaned = cleaned.replace(/<o:p[^>]*>.*?<\/o:p>/gi, '');
  cleaned = cleaned.replace(/<\/?o:[^>]*>/gi, '');

  // Remove empty span tags
  cleaned = cleaned.replace(/<span[^>]*>\s*<\/span>/gi, '');

  // Unwrap content from paragraph tags (replace <p>content</p> with just content)
  // This prevents extra line spacing
  cleaned = cleaned.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1');

  // Strip leading/trailing whitespace entities
  cleaned = cleaned
    .replace(/^(?:&nbsp;|\u00A0|&#160;|\s|<br\s*\/?>)+/gi, '') // Strip from start
    .replace(/(?:&nbsp;|\u00A0|&#160;|\s|<br\s*\/?>)+$/gi, ''); // Strip from end

  return cleaned.trim();
}

interface FlatRow {
  id: string;
  bid: string;
  bidHtmlContent: string;
  meaning: string;
  meaningHtmlContent: string;
  level: number;
}

/**
 * Build hierarchical RowData from flat rows with levels
 * Level 0 = parent rows, Level 1 = daughter rows (children of the preceding level 0 row)
 * Multiple consecutive level 1 rows are all siblings under the same parent
 */
function buildHierarchy(flatRows: FlatRow[]): RowData[] {
  console.log('[buildHierarchy] Input flatRows:', flatRows.map((r, i) => ({
    index: i + 1,
    bid: r.bid,
    meaning: r.meaning.substring(0, 30),
    level: r.level
  })));

  const result: RowData[] = [];
  let currentParent: RowData | null = null;

  for (const flatRow of flatRows) {
    const newRow: RowData = {
      id: flatRow.id,
      bid: flatRow.bid,
      bidHtmlContent: flatRow.bidHtmlContent,
      meaning: flatRow.meaning,
      meaningHtmlContent: flatRow.meaningHtmlContent,
      children: []
    };

    if (flatRow.level === 0) {
      // This is a parent row - add to result and set as current parent
      result.push(newRow);
      currentParent = newRow;
      console.log('[buildHierarchy] Added parent:', newRow.bid);
    } else {
      // This is a daughter row (level > 0) - add as child of current parent
      if (currentParent) {
        currentParent.children.push(newRow);
        console.log('[buildHierarchy] Added child:', newRow.bid, 'to parent:', currentParent.bid);
      } else {
        // No parent yet, add as top-level (fallback)
        result.push(newRow);
        console.log('[buildHierarchy] No parent, added as top-level:', newRow.bid);
      }
    }
  }

  console.log('[buildHierarchy] Output hierarchy:', JSON.stringify(result.map(r => ({
    bid: r.bid,
    childCount: r.children.length,
    children: r.children.map(c => ({ bid: c.bid, childCount: c.children.length }))
  })), null, 2));

  return result;
}

/**
 * Parse HTML table content into RowData format with hierarchy detection
 * Handles tables with hierarchy indicated by empty first column:
 * - If column 1 has content: parent row (col1=bid, col2=meaning)
 * - If column 1 is empty but col2 has content: daughter row (col2=bid, col3=meaning)
 */
export function parseHtmlTable(html: string): RowData[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');

  if (tables.length === 0) {
    return [];
  }

  const flatRows: FlatRow[] = [];
  const table = tables[0];
  const trs = table.querySelectorAll('tr');

  // Track rowspan coverage: which rows are covered by a cell spanning from above
  // Key: row index, Value: number of columns occupied by rowspan from above
  const rowspanCoverage: Map<number, number> = new Map();

  // First pass: detect rowspans and build coverage map
  trs.forEach((tr, rowIndex) => {
    const cells = tr.querySelectorAll('td, th');
    let visualColIndex = rowspanCoverage.get(rowIndex) || 0;

    cells.forEach((cell) => {
      const rowspan = parseInt(cell.getAttribute('rowspan') || '1');
      if (rowspan > 1) {
        // This cell spans multiple rows - mark coverage for subsequent rows
        for (let r = rowIndex + 1; r < rowIndex + rowspan; r++) {
          const existing = rowspanCoverage.get(r) || 0;
          rowspanCoverage.set(r, existing + 1);
        }
      }
    });
  });

  console.log('[parseHtmlTable] Rowspan coverage map:', Object.fromEntries(rowspanCoverage));

  // Track the visual column where the current parent's bid is located
  let parentVisualBidCol = -1;

  // Second pass: parse rows with visual column adjustment
  trs.forEach((tr, rowIndex) => {
    const cells = tr.querySelectorAll('td, th');
    const rowspanOffset = rowspanCoverage.get(rowIndex) || 0;

    // Find the first column with content (the bid column)
    let cellIndex = -1;
    let bidCell: Element | null = null;
    let meaningCell: Element | null = null;

    for (let i = 0; i < cells.length; i++) {
      const text = (cells[i].textContent || '').trim();
      if (text) {
        cellIndex = i;
        bidCell = cells[i];
        meaningCell = i + 1 < cells.length ? cells[i + 1] : null;
        break;
      }
    }

    // Skip rows with no content
    if (cellIndex === -1 || !bidCell) {
      console.log('[parseHtmlTable] Skipping empty row', rowIndex);
      return;
    }

    // Calculate the VISUAL column index (accounting for rowspan from above)
    const visualBidCol = cellIndex + rowspanOffset;

    const bid = (bidCell.textContent || '').trim();
    const meaning = meaningCell ? (meaningCell.textContent || '').trim() : '';
    const bidHtml = cleanHtmlContent(bidCell.innerHTML || bid);
    const meaningHtml = meaningCell ? cleanHtmlContent(meaningCell.innerHTML || meaning) : meaning;

    console.log('[parseHtmlTable] Row', rowIndex, ': cellIndex =', cellIndex,
      ', rowspanOffset =', rowspanOffset, ', visualBidCol =', visualBidCol,
      ', parentVisualBidCol =', parentVisualBidCol, ', bid =', bid);

    // Determine level based on visual column position
    let level: number;

    if (parentVisualBidCol === -1 || visualBidCol <= parentVisualBidCol) {
      // This is a parent row (bid at same or further left visual position)
      level = 0;
      parentVisualBidCol = visualBidCol;
      console.log('[parseHtmlTable] -> Parent row (level 0)');
    } else {
      // This is a daughter row (bid visually indented to the right)
      level = 1;
      console.log('[parseHtmlTable] -> Daughter row (level 1)');
    }

    flatRows.push({
      id: generateRowId(),
      bid,
      bidHtmlContent: bidHtml,
      meaning,
      meaningHtmlContent: meaningHtml,
      level
    });
  });

  // Build hierarchical structure from flat rows
  return buildHierarchy(flatRows);
}

/**
 * Detect indentation level from text (leading spaces/tabs)
 */
function detectTextIndentLevel(text: string): number {
  let leadingSpaces = 0;
  for (const char of text) {
    if (char === ' ' || char === '\u00A0') {
      leadingSpaces++;
    } else if (char === '\t') {
      leadingSpaces += 2; // Tab counts as 2 spaces
    } else {
      break;
    }
  }
  // 2 spaces per level
  return Math.floor(leadingSpaces / 2);
}

/**
 * Parse tab-separated text (from Excel/Google Sheets) into RowData format with hierarchy
 * First column = bid, Second column = meaning
 * Detects hierarchy via leading spaces in the bid column
 */
export function parseTabText(text: string): RowData[] {
  const lines = text.split('\n').filter(line => line.trim());
  const flatRows: FlatRow[] = lines.map(line => {
    const parts = line.split('\t');
    const bidRaw = parts[0] || '';
    const level = detectTextIndentLevel(bidRaw);
    const bid = bidRaw.trim();
    const meaning = parts[1]?.trim() || '';

    return {
      id: generateRowId(),
      bid,
      bidHtmlContent: bid,
      meaning,
      meaningHtmlContent: meaning,
      level
    };
  }).filter(row => row.bid || row.meaning);

  // Build hierarchical structure
  return buildHierarchy(flatRows);
}

/**
 * Detect if clipboard content is a table and parse it
 * Returns null if no table detected
 */
export function parseClipboardAsTable(clipboardData: DataTransfer): RowData[] | null {
  const html = clipboardData.getData('text/html');
  const text = clipboardData.getData('text/plain');

  // First try HTML table parsing
  if (html) {
    const rows = parseHtmlTable(html);
    if (rows.length > 0) {
      return rows;
    }
  }

  // Fallback to tab-separated text (Excel/Google Sheets copy)
  if (text) {
    // Check if text looks like tab-separated data (has tabs and multiple lines)
    const hasMultipleLines = text.includes('\n');
    const hasTabs = text.includes('\t');

    if (hasMultipleLines && hasTabs) {
      const rows = parseTabText(text);
      if (rows.length > 0) {
        return rows;
      }
    }
  }

  return null;
}
