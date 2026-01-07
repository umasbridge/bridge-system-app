/**
 * Workspace utility functions
 */

/**
 * Extracts the display name from a workspace title.
 * If the title contains an underscore, returns the part after the first underscore (chapter name).
 * Otherwise, returns the full title.
 *
 * Examples:
 *   "2over1_Opening Bids" -> "Opening Bids"
 *   "MySystem_Chapter 1_Details" -> "Chapter 1_Details"
 *   "Simple Name" -> "Simple Name"
 */
export function getDisplayName(title: string | undefined | null): string {
  if (!title) return '';

  const underscoreIndex = title.indexOf('_');
  if (underscoreIndex === -1) {
    return title;
  }

  return title.substring(underscoreIndex + 1);
}

/**
 * Processes HTML content to replace the full workspace name with the display name.
 * Finds text nodes containing the full name and replaces with chapter name only.
 *
 * Examples:
 *   '<span style="font-weight: 700">2over1_Opening Bids</span>' -> '<span style="font-weight: 700">Opening Bids</span>'
 */
export function getDisplayHtml(html: string | undefined | null, fullTitle: string | undefined | null): string {
  if (!html || !fullTitle) return html || '';

  const displayName = getDisplayName(fullTitle);

  // If no underscore in title, return html as-is
  if (displayName === fullTitle) {
    return html;
  }

  // Get the system prefix (everything before and including the first underscore)
  const underscoreIndex = fullTitle.indexOf('_');
  if (underscoreIndex === -1) {
    return html;
  }
  const systemPrefix = fullTitle.substring(0, underscoreIndex + 1);

  // Replace the system prefix with empty string in the HTML
  // This is more robust than trying to match the full title
  return html.replace(new RegExp(escapeRegExp(systemPrefix), 'g'), '');
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts the system name from a workspace title.
 * If the title contains an underscore, returns the part before the first underscore.
 * Otherwise, returns the full title.
 *
 * Examples:
 *   "2over1_Opening Bids" -> "2over1"
 *   "Simple Name" -> "Simple Name"
 */
export function getSystemName(title: string | undefined | null): string {
  if (!title) return '';

  const underscoreIndex = title.indexOf('_');
  if (underscoreIndex === -1) {
    return title;
  }

  return title.substring(0, underscoreIndex);
}
