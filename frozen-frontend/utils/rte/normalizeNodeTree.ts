/**
 * DOM Tree Normalization Engine
 *
 * Ensures consistent, canonical DOM structure by:
 * - Flattening nested spans with identical styles
 * - Merging adjacent spans with identical styles
 * - Converting legacy tags to canonical spans
 * - Removing empty nodes
 * - Normalizing style values
 */

import {
  canonicalizeInlineStyle,
  styleRecordToString,
  areStylesEqual,
} from './canonicalizeStyle';

/**
 * Elements that should be preserved (not merged or unwrapped)
 */
const PRESERVED_ELEMENTS = new Set(['A', 'IMG', 'BR', 'UL', 'OL', 'LI']);

/**
 * Block-level elements
 */
const BLOCK_ELEMENTS = new Set(['DIV', 'P', 'UL', 'OL', 'LI']);

/**
 * Legacy tags that should be converted to canonical spans
 */
const LEGACY_INLINE_TAGS: Record<string, Record<string, string>> = {
  'B': { 'font-weight': '700' },
  'STRONG': { 'font-weight': '700' },
  'I': { 'font-style': 'italic' },
  'EM': { 'font-style': 'italic' },
  'U': { 'text-decoration': 'underline' },
};

/**
 * Check if a node is a text node with only whitespace
 */
function isWhitespaceTextNode(node: Node): boolean {
  return node.nodeType === Node.TEXT_NODE && !/\S/.test(node.textContent || '');
}

/**
 * Check if a node is empty (no content or only whitespace)
 */
function isEmptyNode(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    return !node.textContent;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const elem = node as HTMLElement;

    // BR is not considered empty
    if (elem.tagName === 'BR') return false;

    // IMG is not considered empty
    if (elem.tagName === 'IMG') return false;

    // Element with no children is empty
    if (elem.childNodes.length === 0) return true;

    // Element with only whitespace text is empty
    if (elem.childNodes.length === 1 && isWhitespaceTextNode(elem.childNodes[0])) {
      return true;
    }
  }

  return false;
}

/**
 * Get the canonical style record for an element
 */
function getCanonicalStyle(elem: HTMLElement): Record<string, string> {
  return canonicalizeInlineStyle(elem.style);
}

/**
 * Convert legacy inline tag to canonical span
 */
function convertLegacyTag(elem: HTMLElement): HTMLSpanElement | null {
  const tagName = elem.tagName.toUpperCase();
  const legacyStyle = LEGACY_INLINE_TAGS[tagName];

  if (!legacyStyle) return null;

  const span = document.createElement('span');

  // Copy existing inline styles
  const existingStyle = getCanonicalStyle(elem);
  const mergedStyle = { ...legacyStyle, ...existingStyle };

  span.setAttribute('style', styleRecordToString(mergedStyle));

  // Move all children
  while (elem.firstChild) {
    span.appendChild(elem.firstChild);
  }

  // Copy non-style attributes (like data-*)
  for (const attr of Array.from(elem.attributes)) {
    if (attr.name !== 'style') {
      span.setAttribute(attr.name, attr.value);
    }
  }

  return span;
}

/**
 * Handle font tags specially
 */
function convertFontTag(elem: HTMLElement): HTMLSpanElement {
  const span = document.createElement('span');
  const style: Record<string, string> = {};

  // Extract font attributes
  const color = elem.getAttribute('color');
  const face = elem.getAttribute('face');
  const size = elem.getAttribute('size');

  if (color) {
    style['color'] = color;
  }
  if (face) {
    style['font-family'] = face;
  }
  if (size) {
    // Font size attribute (1-7, where 3 is normal)
    const sizeMap: Record<string, string> = {
      '1': '10px',
      '2': '13px',
      '3': '16px',
      '4': '18px',
      '5': '24px',
      '6': '32px',
      '7': '48px',
    };
    style['font-size'] = sizeMap[size] || '16px';
  }

  // Merge with existing inline styles
  const existingStyle = getCanonicalStyle(elem);
  const mergedStyle = { ...style, ...existingStyle };

  if (Object.keys(mergedStyle).length > 0) {
    span.setAttribute('style', styleRecordToString(mergedStyle));
  }

  // Move all children
  while (elem.firstChild) {
    span.appendChild(elem.firstChild);
  }

  return span;
}

/**
 * Flatten nested spans: if parent and child are both spans with styles,
 * merge the styles and unwrap the child
 */
function flattenNestedSpans(elem: HTMLElement): void {
  if (elem.tagName !== 'SPAN') return;

  const parentStyle = getCanonicalStyle(elem);
  const children = Array.from(elem.childNodes);

  for (const child of children) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const childElem = child as HTMLElement;

    // Only flatten nested spans, preserve other elements
    if (childElem.tagName !== 'SPAN') continue;

    // Don't flatten if child has special attributes (bookmarks, etc)
    if (childElem.hasAttribute('data-rte-bookmark')) continue;

    const childStyle = getCanonicalStyle(childElem);

    // If child has no additional styles, unwrap it
    if (Object.keys(childStyle).length === 0) {
      while (childElem.firstChild) {
        elem.insertBefore(childElem.firstChild, childElem);
      }
      childElem.remove();
      continue;
    }

    // If styles are identical, unwrap the child
    if (areStylesEqual(parentStyle, childStyle)) {
      while (childElem.firstChild) {
        elem.insertBefore(childElem.firstChild, childElem);
      }
      childElem.remove();
      continue;
    }

    // If parent has no styles, lift child styles to parent
    if (Object.keys(parentStyle).length === 0) {
      elem.setAttribute('style', styleRecordToString(childStyle));
      while (childElem.firstChild) {
        elem.insertBefore(childElem.firstChild, childElem);
      }
      childElem.remove();
    }
  }
}

/**
 * Merge adjacent sibling spans with identical styles
 */
function mergeAdjacentSpans(parent: HTMLElement): void {
  const children = Array.from(parent.childNodes);

  for (let i = 0; i < children.length - 1; i++) {
    const current = children[i];
    const next = children[i + 1];

    // Both must be span elements
    if (current.nodeType !== Node.ELEMENT_NODE || next.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const currentElem = current as HTMLElement;
    const nextElem = next as HTMLElement;

    if (currentElem.tagName !== 'SPAN' || nextElem.tagName !== 'SPAN') {
      continue;
    }

    // Don't merge bookmarks or special spans
    if (currentElem.hasAttribute('data-rte-bookmark') ||
        nextElem.hasAttribute('data-rte-bookmark')) {
      continue;
    }

    // Check if they have identical styles
    const currentStyle = getCanonicalStyle(currentElem);
    const nextStyle = getCanonicalStyle(nextElem);

    if (!areStylesEqual(currentStyle, nextStyle)) {
      continue;
    }

    // Check if they have identical non-style attributes
    const currentAttrs = Array.from(currentElem.attributes).filter(a => a.name !== 'style');
    const nextAttrs = Array.from(nextElem.attributes).filter(a => a.name !== 'style');

    if (currentAttrs.length !== nextAttrs.length) {
      continue;
    }

    const attrsMatch = currentAttrs.every(attr =>
      nextElem.getAttribute(attr.name) === attr.value
    );

    if (!attrsMatch) {
      continue;
    }

    // Merge: move all children from next into current
    while (nextElem.firstChild) {
      currentElem.appendChild(nextElem.firstChild);
    }

    // Remove the next element
    nextElem.remove();

    // Update children array to reflect removal
    children.splice(i + 1, 1);

    // Stay at current index to check if we can merge with the new next element
    i--;
  }
}

/**
 * Remove consecutive BR tags, keeping only one
 */
function collapseConsecutiveBRs(parent: HTMLElement): void {
  const children = Array.from(parent.childNodes);

  for (let i = 0; i < children.length - 1; i++) {
    const current = children[i];
    const next = children[i + 1];

    if (current.nodeType === Node.ELEMENT_NODE &&
        next.nodeType === Node.ELEMENT_NODE) {
      const currentElem = current as HTMLElement;
      const nextElem = next as HTMLElement;

      // Both are BR tags
      if (currentElem.tagName === 'BR' && nextElem.tagName === 'BR') {
        nextElem.remove();
        children.splice(i + 1, 1);
        i--; // Check again in case there are more consecutive BRs
      }
    }
  }
}

/**
 * Recursively normalize a DOM tree
 */
function normalizeRecursive(node: Node): void {
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const elem = node as HTMLElement;
  const tagName = elem.tagName.toUpperCase();

  // Convert legacy tags
  if (LEGACY_INLINE_TAGS[tagName]) {
    const span = convertLegacyTag(elem);
    if (span && elem.parentNode) {
      elem.parentNode.replaceChild(span, elem);
      normalizeRecursive(span);
      return;
    }
  }

  // Convert FONT tags
  if (tagName === 'FONT') {
    const span = convertFontTag(elem);
    if (elem.parentNode) {
      elem.parentNode.replaceChild(span, elem);
      normalizeRecursive(span);
      return;
    }
  }

  // Canonicalize styles for span elements
  if (tagName === 'SPAN' && elem.hasAttribute('style')) {
    const canonicalStyle = getCanonicalStyle(elem);
    if (Object.keys(canonicalStyle).length > 0) {
      elem.setAttribute('style', styleRecordToString(canonicalStyle));
    } else {
      elem.removeAttribute('style');
    }
  }

  // Recursively process children first (bottom-up)
  const children = Array.from(elem.childNodes);
  for (const child of children) {
    normalizeRecursive(child);
  }

  // Remove empty text nodes
  for (const child of Array.from(elem.childNodes)) {
    if (isEmptyNode(child) && child.nodeType === Node.TEXT_NODE) {
      child.remove();
    }
  }

  // Flatten nested spans
  if (tagName === 'SPAN') {
    flattenNestedSpans(elem);
  }

  // Merge adjacent spans
  mergeAdjacentSpans(elem);

  // Collapse consecutive BRs
  collapseConsecutiveBRs(elem);

  // Remove empty spans (after all merging/flattening)
  if (tagName === 'SPAN' && isEmptyNode(elem)) {
    elem.remove();
  }
}

/**
 * Main entry point: normalize a contenteditable DOM tree
 * @param root The root contenteditable element
 */
export function normalizeNodeTree(root: HTMLElement): void {
  // Process the root's children
  const children = Array.from(root.childNodes);
  for (const child of children) {
    normalizeRecursive(child);
  }

  // Merge adjacent spans at root level
  mergeAdjacentSpans(root);

  // Collapse consecutive BRs at root level
  collapseConsecutiveBRs(root);

  // Remove empty text nodes at root level
  for (const child of Array.from(root.childNodes)) {
    if (isEmptyNode(child) && child.nodeType === Node.TEXT_NODE) {
      child.remove();
    }
  }
}
