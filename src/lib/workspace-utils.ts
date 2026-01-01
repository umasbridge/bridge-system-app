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
