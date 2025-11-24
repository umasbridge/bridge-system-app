/**
 * Paste Sanitization
 *
 * Cleans pasted HTML from external sources (Google Docs, Word, etc.)
 * to ensure consistent formatting and remove unwanted metadata.
 */

/**
 * Allowed HTML elements
 */
const ALLOWED_ELEMENTS = new Set([
  'SPAN',
  'BR',
  'DIV',
  'P',
  'UL',
  'OL',
  'LI',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'A',
]);

/**
 * Allowed style properties
 */
const ALLOWED_STYLES = new Set([
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-align',
]);

/**
 * Elements to strip completely (including content)
 */
const STRIP_ELEMENTS = new Set([
  'SCRIPT',
  'STYLE',
  'META',
  'LINK',
  'OBJECT',
  'EMBED',
  'IFRAME',
]);

/**
 * Office XML artifacts to remove
 */
const OFFICE_ARTIFACTS = new Set([
  'O:P',
  'W:SDT',
  'W:SDTPR',
  'W:SDTCONTENT',
  'V:SHAPE',
  'V:IMAGEDATA',
]);

/**
 * Sanitize style attribute
 */
function sanitizeStyle(styleAttr: string): string {
  const styles: string[] = [];
  const declarations = styleAttr.split(';');

  for (const decl of declarations) {
    const [prop, value] = decl.split(':').map(s => s.trim());
    if (!prop || !value) continue;

    // Only keep allowed properties
    if (ALLOWED_STYLES.has(prop)) {
      // Remove vendor prefixes
      if (!prop.startsWith('-webkit-') && !prop.startsWith('-moz-') && !prop.startsWith('-ms-')) {
        styles.push(`${prop}: ${value}`);
      }
    }
  }

  return styles.join('; ');
}

/**
 * Convert block elements to inline with <br> separators
 */
function convertBlockToInline(elem: HTMLElement, fragment: DocumentFragment): void {
  // Add content of the block
  while (elem.firstChild) {
    fragment.appendChild(elem.firstChild);
  }

  // Add a BR after block elements (except the last one)
  fragment.appendChild(document.createElement('br'));
}

/**
 * Convert legacy formatting tags to canonical spans
 */
function convertLegacyTag(elem: HTMLElement): HTMLSpanElement {
  const span = document.createElement('span');
  const tagName = elem.tagName.toUpperCase();

  // Map legacy tags to styles
  switch (tagName) {
    case 'STRONG':
    case 'B':
      span.style.fontWeight = '700';
      break;
    case 'EM':
    case 'I':
      span.style.fontStyle = 'italic';
      break;
    case 'U':
      span.style.textDecoration = 'underline';
      break;
  }

  // Merge with existing inline styles
  if (elem.hasAttribute('style')) {
    const existingStyle = sanitizeStyle(elem.getAttribute('style') || '');
    const mergedStyle = span.getAttribute('style') + '; ' + existingStyle;
    span.setAttribute('style', mergedStyle);
  }

  // Copy children
  while (elem.firstChild) {
    span.appendChild(elem.firstChild);
  }

  // Copy data attributes (but not class or id)
  for (const attr of Array.from(elem.attributes)) {
    if (attr.name.startsWith('data-') && attr.name !== 'data-kix' && !attr.name.startsWith('data-kix-')) {
      span.setAttribute(attr.name, attr.value);
    }
  }

  return span;
}

/**
 * Recursively sanitize a DOM node
 */
function sanitizeNode(node: Node, isRoot: boolean = false): Node | DocumentFragment | null {
  // Text nodes - keep but clean up
  if (node.nodeType === Node.TEXT_NODE) {
    let text = node.textContent || '';

    // Collapse multiple spaces
    text = text.replace(/\s+/g, ' ');

    // Trim only if not inside a span/formatting element
    if (!isRoot) {
      text = text.trim();
    }

    if (!text) return null;

    return document.createTextNode(text);
  }

  // Element nodes
  if (node.nodeType === Node.ELEMENT_NODE) {
    const elem = node as HTMLElement;
    const tagName = elem.tagName.toUpperCase();

    // Strip completely
    if (STRIP_ELEMENTS.has(tagName) || OFFICE_ARTIFACTS.has(tagName)) {
      return null;
    }

    // Strip Google Docs metadata spans
    if (tagName === 'SPAN' && elem.className && elem.className.includes('kix-')) {
      // Keep children but remove the span wrapper
      const fragment = document.createDocumentFragment();
      for (const child of Array.from(elem.childNodes)) {
        const sanitized = sanitizeNode(child);
        if (sanitized) fragment.appendChild(sanitized);
      }
      return fragment;
    }

    // Convert block elements to inline + BR
    if (tagName === 'DIV' || tagName === 'P') {
      const fragment = document.createDocumentFragment();

      for (const child of Array.from(elem.childNodes)) {
        const sanitized = sanitizeNode(child);
        if (sanitized) fragment.appendChild(sanitized);
      }

      // Add BR after block (except if it's the root)
      if (!isRoot) {
        fragment.appendChild(document.createElement('br'));
      }

      return fragment;
    }

    // Convert legacy formatting tags
    if (tagName === 'STRONG' || tagName === 'B' || tagName === 'EM' || tagName === 'I' || tagName === 'U') {
      const span = convertLegacyTag(elem);

      // Recursively sanitize children
      const children = Array.from(span.childNodes);
      span.innerHTML = '';
      for (const child of children) {
        const sanitized = sanitizeNode(child);
        if (sanitized) span.appendChild(sanitized);
      }

      return span;
    }

    // Keep if allowed
    if (!ALLOWED_ELEMENTS.has(tagName)) {
      // Unknown element - keep children but remove wrapper
      const fragment = document.createDocumentFragment();
      for (const child of Array.from(elem.childNodes)) {
        const sanitized = sanitizeNode(child);
        if (sanitized) fragment.appendChild(sanitized);
      }
      return fragment;
    }

    // Clone the allowed element
    const cleaned = document.createElement(tagName);

    // Sanitize and copy style attribute
    if (elem.hasAttribute('style')) {
      const sanitizedStyle = sanitizeStyle(elem.getAttribute('style') || '');
      if (sanitizedStyle) {
        cleaned.setAttribute('style', sanitizedStyle);
      }
    }

    // Keep href for links
    if (tagName === 'A' && elem.hasAttribute('href')) {
      cleaned.setAttribute('href', elem.getAttribute('href') || '');
    }

    // Keep src and data-image-id for images
    if (tagName === 'IMG') {
      if (elem.hasAttribute('src')) {
        cleaned.setAttribute('src', elem.getAttribute('src') || '');
      }
      if (elem.hasAttribute('data-image-id')) {
        cleaned.setAttribute('data-image-id', elem.getAttribute('data-image-id') || '');
      }
    }

    // Recursively sanitize children
    for (const child of Array.from(elem.childNodes)) {
      const sanitized = sanitizeNode(child);
      if (sanitized) cleaned.appendChild(sanitized);
    }

    return cleaned;
  }

  return null;
}

/**
 * Sanitize pasted HTML and return a clean DocumentFragment
 * @param html Raw HTML string from clipboard
 * @returns Clean DocumentFragment ready to insert
 */
export function sanitizePastedHTML(html: string): DocumentFragment {
  // Parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Create a fragment to hold the cleaned content
  const fragment = document.createDocumentFragment();

  // Process body content
  const body = doc.body;
  if (!body) return fragment;

  // Sanitize each top-level node
  for (const child of Array.from(body.childNodes)) {
    const sanitized = sanitizeNode(child, true);
    if (sanitized) {
      fragment.appendChild(sanitized);
    }
  }

  // Remove trailing BR if present
  const lastChild = fragment.lastChild;
  if (lastChild && lastChild.nodeType === Node.ELEMENT_NODE) {
    const lastElem = lastChild as HTMLElement;
    if (lastElem.tagName === 'BR') {
      lastElem.remove();
    }
  }

  return fragment;
}

/**
 * Get pasted content from clipboard event
 * Tries HTML first, falls back to plain text
 */
export function getClipboardContent(event: ClipboardEvent): string {
  const clipboardData = event.clipboardData;
  if (!clipboardData) return '';

  // Try HTML first
  const html = clipboardData.getData('text/html');
  if (html) return html;

  // Fall back to plain text
  const text = clipboardData.getData('text/plain');
  if (text) {
    // Convert plain text to HTML (preserve line breaks)
    return text.split('\n').join('<br>');
  }

  return '';
}
