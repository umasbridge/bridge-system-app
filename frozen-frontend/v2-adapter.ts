/**
 * V2 Adapter Layer
 *
 * Converts between V1's Supabase data format (Workspace/WorkspaceElement)
 * and V2's frontend format (Page/Element) used by the new UI components.
 */

import type {
  Page,
  Element as V2Element,
  TextElement as V2TextElement,
  BidTableElement as V2BidTableElement,
  RowData as V2RowData,
} from '@/types';

import type {
  Workspace,
  WorkspaceElement,
  SystemsTableElement,
  TextElement as V1TextElement,
  RowData as V1RowData,
} from './supabase-db';

import { getDisplayName, getDisplayHtml } from './workspace-utils';

// =====================
// V1 → V2 CONVERSION
// =====================

/**
 * Convert V1 RowData (bidHtmlContent/meaningHtmlContent) to V2 RowData (bidHtml/meaningHtml).
 * Recursively converts children.
 */
export function convertRowsV1toV2(rows: V1RowData[]): V2RowData[] {
  return rows.map(row => ({
    id: row.id,
    bid: row.bid,
    bidHtml: row.bidHtmlContent,
    bidFillColor: row.bidFillColor,
    meaning: row.meaning,
    meaningHtml: row.meaningHtmlContent,
    children: row.children ? convertRowsV1toV2(row.children) : [],
    collapsed: row.collapsed,
    isMerged: row.isMerged,
  }));
}

/**
 * Convert V2 RowData (bidHtml/meaningHtml) back to V1 RowData (bidHtmlContent/meaningHtmlContent).
 * Recursively converts children.
 */
export function convertRowsV2toV1(rows: V2RowData[]): V1RowData[] {
  return rows.map(row => ({
    id: row.id,
    bid: row.bid,
    bidHtmlContent: row.bidHtml,
    bidFillColor: row.bidFillColor,
    meaning: row.meaning,
    meaningHtmlContent: row.meaningHtml,
    children: row.children ? convertRowsV2toV1(row.children) : [],
    collapsed: row.collapsed,
    isMerged: row.isMerged,
  }));
}

/**
 * Convert V1 hyperlink HTML to V2 format.
 * V1: <a data-workspace-link="WorkspaceName" data-workspace="WorkspaceName">text</a>
 * V2: <a href="bridge://pageId/mode" data-page-id="pageId" data-link-mode="split">text</a>
 *
 * @param html - HTML string with V1 hyperlinks
 * @param workspaces - Array of V1 workspaces (to look up IDs by title)
 */
export function convertHyperlinksToV2(html: string | undefined, workspaces: Workspace[]): string | undefined {
  if (!html) return html;

  // Helper to strip existing href, V1-specific attributes, class, and style from captured groups
  const cleanAttrs = (attrs: string) => attrs
    .replace(/href="[^"]*"/gi, '')
    .replace(/data-workspace-link="[^"]*"/gi, '')
    .replace(/data-workspace="[^"]*"/gi, '')
    .replace(/data-link-type="[^"]*"/gi, '')
    .replace(/class="[^"]*"/gi, '')
    .replace(/style="[^"]*"/gi, '');

  // Map V1 data-link-type to V2 mode
  // Default to 'popup' for older V1 links without data-link-type
  const v1LinkTypeToV2Mode = (attrs: string): string => {
    const match = attrs.match(/data-link-type="([^"]*)"/i);
    if (!match) return 'popup';
    const v1Type = match[1];
    if (v1Type === 'comment') return 'popup';
    if (v1Type === 'new-page') return 'newpage';
    if (v1Type === 'split-view') return 'split';
    return 'popup';
  };

  // Match V1 hyperlink patterns
  return html.replace(
    /<a\b([^>]*?)data-workspace-link="([^"]*)"([^>]*?)>/gi,
    (_match, before, workspaceName, after) => {
      const workspace = workspaces.find(w => w.title === workspaceName);
      const pageId = workspace?.id || workspaceName;
      const mode = v1LinkTypeToV2Mode(before + after);
      const cleanBefore = cleanAttrs(before);
      const cleanAfter = cleanAttrs(after);
      return `<a${cleanBefore}href="bridge://${pageId}/${mode}" data-page-id="${pageId}" data-link-mode="${mode}" style="color:#2563eb;text-decoration:underline;cursor:pointer"${cleanAfter}>`;
    }
  ).replace(
    /<a\b([^>]*?)data-workspace="([^"]*)"([^>]*?)>/gi,
    (_match, before, workspaceName, after) => {
      // Skip if already converted (has data-page-id)
      if (before.includes('data-page-id') || after.includes('data-page-id')) return _match;
      const workspace = workspaces.find(w => w.title === workspaceName);
      const pageId = workspace?.id || workspaceName;
      const mode = v1LinkTypeToV2Mode(before + after);
      const cleanBefore = cleanAttrs(before);
      const cleanAfter = cleanAttrs(after);
      return `<a${cleanBefore}href="bridge://${pageId}/${mode}" data-page-id="${pageId}" data-link-mode="${mode}" style="color:#2563eb;text-decoration:underline;cursor:pointer"${cleanAfter}>`;
    }
  );
}

/**
 * Convert V2 hyperlink HTML back to V1 format.
 * V2: <a href="bridge://pageId/mode" data-page-id="pageId" data-link-mode="split">text</a>
 * V1: <a data-workspace-link="WorkspaceTitle" data-workspace="WorkspaceTitle">text</a>
 */
export function convertHyperlinksToV1(html: string | undefined, workspaces: Workspace[]): string | undefined {
  if (!html) return html;

  return html.replace(
    /<a\b([^>]*?)data-page-id="([^"]*)"([^>]*?)>/gi,
    (_match, before, pageId, after) => {
      const workspace = workspaces.find(w => w.id === pageId);
      const title = workspace?.title || pageId;
      // Remove V2-specific attributes, add V1 attributes
      const cleanBefore = before
        .replace(/href="bridge:\/\/[^"]*"/gi, '')
        .replace(/data-link-mode="[^"]*"/gi, '');
      const cleanAfter = after
        .replace(/href="bridge:\/\/[^"]*"/gi, '')
        .replace(/data-link-mode="[^"]*"/gi, '');
      return `<a${cleanBefore}data-workspace-link="${title}" data-workspace="${title}" style="color:#2563eb;text-decoration:underline;cursor:pointer"${cleanAfter}>`;
    }
  );
}

/**
 * Recursively convert hyperlinks in RowData from V1 to V2 format.
 */
function convertRowHyperlinksToV2(rows: V2RowData[], workspaces: Workspace[]): V2RowData[] {
  return rows.map(row => ({
    ...row,
    bidHtml: convertHyperlinksToV2(row.bidHtml, workspaces),
    meaningHtml: convertHyperlinksToV2(row.meaningHtml, workspaces),
    children: row.children ? convertRowHyperlinksToV2(row.children, workspaces) : [],
  }));
}

/**
 * Recursively convert hyperlinks in RowData from V2 to V1 format.
 */
function convertRowHyperlinksToV1(rows: V1RowData[], workspaces: Workspace[]): V1RowData[] {
  return rows.map(row => ({
    ...row,
    bidHtmlContent: convertHyperlinksToV1(row.bidHtmlContent, workspaces),
    meaningHtmlContent: convertHyperlinksToV1(row.meaningHtmlContent, workspaces),
    children: row.children ? convertRowHyperlinksToV1(row.children, workspaces) : [],
  }));
}

/**
 * Convert a V1 WorkspaceElement to a V2 Element.
 */
function elementToV2(element: WorkspaceElement, order: number, workspaces: Workspace[]): V2Element | null {
  switch (element.type) {
    case 'systems-table': {
      const st = element as SystemsTableElement;
      const v2Rows = st.initialRows ? convertRowsV1toV2(st.initialRows) : [];
      const v2RowsWithLinks = convertRowHyperlinksToV2(v2Rows, workspaces);
      return {
        id: element.id,
        type: 'bidtable',
        order,
        name: element.name || st.nameHtmlContent?.replace(/<[^>]*>/g, '') || undefined,
        nameHtml: convertHyperlinksToV2(st.nameHtmlContent, workspaces),
        showName: st.showName ?? true,
        rows: v2RowsWithLinks,
        levelWidths: st.levelWidths || { 0: 80 },
        width: st.meaningWidth || 400,
        gridlines: st.gridlines,
        defaultRowHeight: st.defaultRowHeight,
      } as V2BidTableElement;
    }

    case 'text': {
      const t = element as V1TextElement;
      return {
        id: element.id,
        type: 'text',
        order,
        mode: 'default' as const,
        content: t.content || '',
        htmlContent: convertHyperlinksToV2(t.htmlContent, workspaces),
        borderColor: (element.borderColor && element.borderColor !== 'transparent') ? element.borderColor : '#d1d5db',
        borderWidth: (element.borderWidth && element.borderWidth > 0) ? element.borderWidth : 2,
        fillColor: element.fillColor || 'transparent',
        // Don't inherit V1 size.width - let text elements default to full available width
      } as V2TextElement;
    }

    // V1-only types: return null (handled as unsupported placeholders)
    case 'image':
    case 'pdf':
    case 'file':
      return null;

    default:
      return null;
  }
}

/**
 * Convert a V1 Workspace + its elements to a V2 Page.
 */
export function workspaceToPage(
  workspace: Workspace,
  elements: WorkspaceElement[],
  allWorkspaces: Workspace[],
  isMain: boolean = false,
): Page {
  // Sort elements by y position to determine order
  const sorted = [...elements].sort((a, b) => a.position.y - b.position.y);

  const v2Elements: V2Element[] = [];
  sorted.forEach((el, index) => {
    const v2El = elementToV2(el, index, allWorkspaces);
    if (v2El) {
      v2Elements.push(v2El);
    }
  });

  return {
    id: workspace.id,
    type: workspace.type === 'bidding_system' ? 'system' : 'comment',
    isMain,
    title: getDisplayName(workspace.title),
    titleHtml: getDisplayHtml(convertHyperlinksToV2(workspace.titleHtmlContent, allWorkspaces), workspace.title),
    description: workspace.descriptionHtml?.replace(/<[^>]*>/g, '') || undefined,
    descriptionHtml: convertHyperlinksToV2(workspace.descriptionHtml, allWorkspaces),
    elements: v2Elements,
    createdAt: new Date(workspace.createdAt).toISOString(),
    updatedAt: new Date(workspace.updatedAt).toISOString(),
    backgroundColor: workspace.backgroundColor,
    pageBorderColor: workspace.borderColor,
    pageBorderWidth: workspace.borderWidth,
    canvasWidth: workspace.canvasWidth,
    leftMargin: workspace.leftMargin,
    topMargin: workspace.topMargin,
    elementSpacing: workspace.elementSpacing,
  };
}

// =====================
// V2 → V1 CONVERSION (for saving back to Supabase)
// =====================

/**
 * Convert a V2 element update back to V1 element data format for Supabase.
 * This produces partial updates suitable for elementOperations.update().
 */
export function v2ElementToV1Update(
  v2Element: Partial<V2Element>,
  workspaces: Workspace[],
): Record<string, any> {
  const updates: Record<string, any> = {};

  if ('type' in v2Element) {
    if (v2Element.type === 'bidtable') {
      const bt = v2Element as Partial<V2BidTableElement>;
      if (bt.rows) updates.initialRows = convertRowsV2toV1(convertRowHyperlinksToV1(convertRowsV2toV1(bt.rows), workspaces) as any);
      if (bt.levelWidths) updates.levelWidths = bt.levelWidths;
      if (bt.width !== undefined) updates.meaningWidth = bt.width;
      if (bt.showName !== undefined) updates.showName = bt.showName;
      if (bt.nameHtml !== undefined) updates.nameHtmlContent = convertHyperlinksToV1(bt.nameHtml, workspaces);
      if (bt.gridlines !== undefined) updates.gridlines = bt.gridlines;
      if (bt.defaultRowHeight !== undefined) updates.defaultRowHeight = bt.defaultRowHeight;
    } else if (v2Element.type === 'text') {
      const t = v2Element as Partial<V2TextElement>;
      if (t.content !== undefined) updates.content = t.content;
      if (t.htmlContent !== undefined) updates.htmlContent = convertHyperlinksToV1(t.htmlContent, workspaces);
      if (t.borderColor !== undefined) updates.borderColor = t.borderColor;
      if (t.borderWidth !== undefined) updates.borderWidth = t.borderWidth;
      if (t.fillColor !== undefined) updates.fillColor = t.fillColor;
    }
  } else {
    // Partial updates without type - just pass through what we can
    const anyUpdate = v2Element as any;
    if (anyUpdate.rows) {
      const v1Rows = convertRowsV2toV1(anyUpdate.rows);
      updates.initialRows = convertRowHyperlinksToV1(v1Rows, workspaces);
    }
    if (anyUpdate.levelWidths) updates.levelWidths = anyUpdate.levelWidths;
    if (anyUpdate.width !== undefined) updates.meaningWidth = anyUpdate.width;
    if (anyUpdate.showName !== undefined) updates.showName = anyUpdate.showName;
    if (anyUpdate.nameHtml !== undefined) updates.nameHtmlContent = convertHyperlinksToV1(anyUpdate.nameHtml, workspaces);
    if (anyUpdate.name !== undefined) updates.name = anyUpdate.name;
    if (anyUpdate.gridlines !== undefined) updates.gridlines = anyUpdate.gridlines;
    if (anyUpdate.defaultRowHeight !== undefined) updates.defaultRowHeight = anyUpdate.defaultRowHeight;
    if (anyUpdate.content !== undefined) updates.content = anyUpdate.content;
    if (anyUpdate.htmlContent !== undefined) updates.htmlContent = convertHyperlinksToV1(anyUpdate.htmlContent, workspaces);
    if (anyUpdate.borderColor !== undefined) updates.borderColor = anyUpdate.borderColor;
    if (anyUpdate.borderWidth !== undefined) updates.borderWidth = anyUpdate.borderWidth;
    if (anyUpdate.fillColor !== undefined) updates.fillColor = anyUpdate.fillColor;
  }

  return updates;
}

/**
 * Convert V2 page title/description changes to V1 workspace update format.
 */
export function v2PageToV1WorkspaceUpdate(
  updates: Partial<Page>,
  workspaces: Workspace[],
): Partial<Workspace> {
  const result: Partial<Workspace> = {};

  if (updates.title !== undefined) result.title = updates.title;
  if (updates.titleHtml !== undefined) result.titleHtmlContent = convertHyperlinksToV1(updates.titleHtml, workspaces);
  if (updates.descriptionHtml !== undefined) result.descriptionHtml = convertHyperlinksToV1(updates.descriptionHtml, workspaces);
  if (updates.backgroundColor !== undefined) result.backgroundColor = updates.backgroundColor;
  if (updates.pageBorderColor !== undefined) result.borderColor = updates.pageBorderColor;
  if (updates.pageBorderWidth !== undefined) result.borderWidth = updates.pageBorderWidth;
  if (updates.canvasWidth !== undefined) result.canvasWidth = updates.canvasWidth;
  if (updates.leftMargin !== undefined) result.leftMargin = updates.leftMargin;
  if (updates.topMargin !== undefined) result.topMargin = updates.topMargin;
  if (updates.elementSpacing !== undefined) result.elementSpacing = updates.elementSpacing;

  return result;
}

/**
 * Get the list of available pages for hyperlinks.
 * Converts V1 workspaces to the format V2 components expect.
 */
export function getAvailablePages(workspaces: Workspace[]): Array<{ id: string; name: string }> {
  return workspaces.map(w => ({ id: w.id, name: w.title }));
}
