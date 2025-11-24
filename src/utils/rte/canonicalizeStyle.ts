/**
 * Canonicalize inline styles to ensure consistent formatting
 *
 * Normalizes:
 * - Font weights (bold → 700, normal → 400)
 * - Colors (rgb → hex, lowercase)
 * - Font sizes (all to px, rounded integers)
 * - Property ordering (alphabetical)
 */

/**
 * Convert RGB/RGBA color to hex format
 */
function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return rgb;

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  const a = match[4] ? parseFloat(match[4]) : 1;

  // If alpha is not 1, keep as rgba
  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // Convert to hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  // Try to use shorthand if possible
  if (hex[1] === hex[2] && hex[3] === hex[4] && hex[5] === hex[6]) {
    return `#${hex[1]}${hex[3]}${hex[5]}`;
  }

  return hex;
}

/**
 * Normalize font weight values
 */
function normalizeFontWeight(weight: string): string {
  const normalized: Record<string, string> = {
    'bold': '700',
    'bolder': '900',
    'lighter': '300',
    'normal': '400',
  };

  return normalized[weight.toLowerCase()] || weight;
}

/**
 * Convert font size to pixels
 */
function normalizeFontSize(size: string): string {
  // Already in pixels
  if (size.endsWith('px')) {
    return Math.round(parseFloat(size)) + 'px';
  }

  // Convert pt to px (1pt = 1.333px)
  if (size.endsWith('pt')) {
    return Math.round(parseFloat(size) * 1.333) + 'px';
  }

  // For em/rem, we'd need context - just keep as is for now
  return size;
}

/**
 * Normalize a color value to lowercase hex
 */
function normalizeColor(color: string): string {
  // Handle rgb/rgba
  if (color.startsWith('rgb')) {
    return rgbToHex(color).toLowerCase();
  }

  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.toLowerCase();
    // Try to convert to shorthand
    if (hex.length === 7 && hex[1] === hex[2] && hex[3] === hex[4] && hex[5] === hex[6]) {
      return `#${hex[1]}${hex[3]}${hex[5]}`;
    }
    return hex;
  }

  // Keep named colors as-is
  return color.toLowerCase();
}

/**
 * Remove extra quotes from font family
 */
function normalizeFontFamily(fontFamily: string): string {
  // Remove extra quotes but preserve the font family name
  return fontFamily.replace(/['"]/g, '').trim();
}

/**
 * Canonicalize inline style object
 * Returns a normalized Record<string, string> with alphabetically ordered properties
 */
export function canonicalizeInlineStyle(style: CSSStyleDeclaration): Record<string, string> {
  const result: Record<string, string> = {};

  // List of properties we care about (alphabetically ordered)
  const relevantProps = [
    'background-color',
    'color',
    'font-family',
    'font-size',
    'font-style',
    'font-weight',
    'text-align',
    'text-decoration',
  ];

  for (const prop of relevantProps) {
    const value = style.getPropertyValue(prop);
    if (!value) continue;

    let normalized = value;

    // Apply property-specific normalization
    switch (prop) {
      case 'font-weight':
        normalized = normalizeFontWeight(value);
        break;
      case 'font-size':
        normalized = normalizeFontSize(value);
        break;
      case 'color':
      case 'background-color':
        normalized = normalizeColor(value);
        break;
      case 'font-family':
        normalized = normalizeFontFamily(value);
        break;
    }

    // Skip properties with default/empty values
    if (normalized && normalized !== 'normal' && normalized !== 'inherit') {
      result[prop] = normalized;
    }
  }

  return result;
}

/**
 * Convert a style record back to a style string
 */
export function styleRecordToString(styleRecord: Record<string, string>): string {
  return Object.entries(styleRecord)
    .map(([prop, value]) => `${prop}: ${value}`)
    .join('; ');
}

/**
 * Compare two style records for equality
 */
export function areStylesEqual(
  style1: Record<string, string>,
  style2: Record<string, string>
): boolean {
  const keys1 = Object.keys(style1).sort();
  const keys2 = Object.keys(style2).sort();

  if (keys1.length !== keys2.length) return false;

  for (let i = 0; i < keys1.length; i++) {
    if (keys1[i] !== keys2[i]) return false;
    if (style1[keys1[i]] !== style2[keys2[i]]) return false;
  }

  return true;
}
