import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { workspaceOperations, elementOperations } from '../../lib/supabase-db';
import { TextFormatPanel, TextFormat } from './TextFormatPanel';

interface ImportTextDialogProps {
  onClose: () => void;
  onImportComplete: (workspaceId: string) => void;
}

export function ImportTextDialog({ onClose, onImportComplete }: ImportTextDialogProps) {
  const [textName, setTextName] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [plainContent, setPlainContent] = useState('');
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPasted, setHasPasted] = useState(false);
  const pasteAreaRef = useRef<HTMLDivElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);

  // Format panel state
  const [showFormatPanel, setShowFormatPanel] = useState(false);
  const [applyFormatFn, setApplyFormatFn] = useState<((format: TextFormat) => void) | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  // Load existing element names for uniqueness check
  useEffect(() => {
    const loadExistingNames = async () => {
      const elements = await elementOperations.getAll();
      const names = elements
        .filter(el => el.name && el.name.trim())
        .map(el => el.name!.toLowerCase().trim());
      setExistingNames(names);
    };
    loadExistingNames();
  }, []);

  const isNameUnique = textName.trim() && !existingNames.includes(textName.toLowerCase().trim());
  const canSave = isNameUnique && (htmlContent.trim() || plainContent.trim());

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    console.log('[ImportTextDialog] Paste event received:', { hasHtml: !!html, hasText: !!text, htmlLength: html?.length, textLength: text?.length });
    console.log('[ImportTextDialog] RAW HTML:', html);

    if (html) {
      // Clean up the HTML while preserving formatting
      const cleanedHtml = cleanPastedHtml(html);
      console.log('[ImportTextDialog] Cleaned HTML:', cleanedHtml);
      setHtmlContent(cleanedHtml);
      setPlainContent(text);
      setHasPasted(true);
    } else if (text) {
      // Convert plain text to HTML with line breaks
      const htmlFromText = text.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');
      setHtmlContent(htmlFromText);
      setPlainContent(text);
      setHasPasted(true);
    }
  };

  // Set initial content ONCE when contentEditable is first rendered after paste
  // We use a ref to track if we've already set the initial content
  const initialContentSetRef = useRef(false);
  useEffect(() => {
    if (hasPasted && contentEditableRef.current && htmlContent && !initialContentSetRef.current) {
      contentEditableRef.current.innerHTML = htmlContent;
      initialContentSetRef.current = true;
    }
  }, [hasPasted, htmlContent]);

  // Clean pasted HTML - LINE BY LINE approach
  // For each line: replicate left offset, bullet (if any), space after bullet, and text with formatting
  function cleanPastedHtml(html: string): string {
    // Step 1: Remove Word fragment markers and namespace tags
    let cleanedHtml = html
      .replace(/<!--StartFragment-->|<!--EndFragment-->/gi, '')
      .replace(/<o:p[^>]*>[\s\u00A0]*<\/o:p>/gi, '')
      .replace(/<o:p[^>]*>/gi, '').replace(/<\/o:p>/gi, '');

    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanedHtml, 'text/html');

    // Remove script, meta, link, style tags
    doc.querySelectorAll('script, meta, link, style').forEach(el => el.remove());

    // Remove class and lang attributes
    doc.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'));
    doc.querySelectorAll('[lang]').forEach(el => el.removeAttribute('lang'));

    // Helper to convert various units to pixels
    const convertToPx = (value: string): number | null => {
      const inMatch = value.match(/([\d.]+)\s*in/i);
      if (inMatch) return Math.round(parseFloat(inMatch[1]) * 96);
      const ptMatch = value.match(/([\d.]+)\s*pt/i);
      if (ptMatch) return Math.round(parseFloat(ptMatch[1]) * 1.333);
      const cmMatch = value.match(/([\d.]+)\s*cm/i);
      if (cmMatch) return Math.round(parseFloat(cmMatch[1]) * 37.8);
      const pxMatch = value.match(/([\d.]+)\s*px/i);
      if (pxMatch) return Math.round(parseFloat(pxMatch[1]));
      return null;
    };

    // Wingdings/Symbol character mapping to Unicode
    const wingdingsMap: { [key: string]: string } = {
      'Ø': '➤', 'ü': '✓', '·': '•', 'q': '✗', 'n': '■',
      'o': '□', 'l': '●', 'm': '○', 'F': '✈', '*': '✶', 'P': '☛',
    };

    // Helper function to clean element HTML while preserving formatting
    const cleanElementHtml = (el: Element): string => {
      let result = '';
      el.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          result += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const elem = node as HTMLElement;
          const tag = elem.tagName.toLowerCase();

          if (tag === 'b' || tag === 'strong') {
            result += `<b>${cleanElementHtml(elem)}</b>`;
          } else if (tag === 'i' || tag === 'em') {
            result += `<i>${cleanElementHtml(elem)}</i>`;
          } else if (tag === 'u') {
            result += `<u>${cleanElementHtml(elem)}</u>`;
          } else if (tag === 'span') {
            const style = elem.getAttribute('style') || '';
            const preservedStyles: string[] = [];

            // Check for background/highlight
            if (style.includes('background')) {
              const bgMatch = style.match(/background(?:-color)?:\s*([^;]+)/i);
              if (bgMatch) preservedStyles.push(`background-color: ${bgMatch[1]}`);
            }
            if (style.includes('mso-highlight')) {
              const hlMatch = style.match(/mso-highlight:\s*([^;]+)/i);
              if (hlMatch) preservedStyles.push(`background-color: ${hlMatch[1]}`);
            }
            if (style.includes('text-decoration')) {
              const tdMatch = style.match(/text-decoration:\s*([^;]+)/i);
              if (tdMatch) preservedStyles.push(`text-decoration: ${tdMatch[1]}`);
            }
            if (style.includes('font-weight')) {
              const fwMatch = style.match(/font-weight:\s*([^;]+)/i);
              if (fwMatch && (fwMatch[1] === 'bold' || parseInt(fwMatch[1]) >= 700)) {
                result += `<b>${cleanElementHtml(elem)}</b>`;
                return;
              }
            }

            if (preservedStyles.length > 0) {
              result += `<span style="${preservedStyles.join('; ')}">${cleanElementHtml(elem)}</span>`;
            } else {
              result += cleanElementHtml(elem);
            }
          } else {
            result += cleanElementHtml(elem);
          }
        }
      });
      return result;
    };

    // Process each paragraph as a line
    doc.querySelectorAll('p').forEach(p => {
      const innerHTML = p.innerHTML;
      const styleAttr = p.getAttribute('style') || '';

      // Extract margin-left (left offset of the line)
      const marginMatch = styleAttr.match(/margin-left:\s*([^;]+)/i);
      let marginLeftPx = 0;
      if (marginMatch) {
        const px = convertToPx(marginMatch[1]);
        if (px !== null) marginLeftPx = px;
      }

      // Check for Word list conditional comments (indicates bullet/number)
      const conditionalMatch = innerHTML.match(/<!--\[if !supportLists\]-->([\s\S]*?)<!--\[endif\]-->/i);

      if (conditionalMatch) {
        // This is a bulleted/numbered line
        const markerHtml = conditionalMatch[1];
        const afterEndif = innerHTML.substring(innerHTML.indexOf('<!--[endif]-->') + 14);

        // Parse the marker to get bullet character
        const tempDiv = doc.createElement('div');
        tempDiv.innerHTML = markerHtml;

        // Check for Wingdings/Symbol font
        const markerSpan = tempDiv.querySelector('span[style*="font-family"]');
        let fontFamily = '';
        if (markerSpan) {
          const style = markerSpan.getAttribute('style') || '';
          const fontMatch = style.match(/font-family:\s*([^;]+)/i);
          if (fontMatch) fontFamily = fontMatch[1];
        }

        // Get the bullet/marker character
        let markerText = (tempDiv.textContent || '').trim().replace(/[\s\u00A0]+$/, '');

        // Convert Wingdings/Symbol to Unicode
        if (fontFamily.toLowerCase().includes('wingdings') || fontFamily.toLowerCase().includes('symbol')) {
          markerText = wingdingsMap[markerText] || markerText;
        }

        // Clean up rest content (remove Word spacing spans)
        let restContent = afterEndif
          .replace(/<span[^>]*style="[^"]*font:\s*[\d.]+pt[^"]*"[^>]*>[\s\u00A0]*<\/span>/gi, '')
          .replace(/<span[^>]*>[\s\u00A0]*<\/span>/gi, '');

        tempDiv.innerHTML = restContent;
        const restText = cleanElementHtml(tempDiv).trim();

        // Bullet character - make • larger
        let bulletHtml: string;
        if (markerText === '•') {
          bulletHtml = `<span style="font-size: 1.8em; line-height: 0.6; vertical-align: middle;">•</span>`;
        } else {
          bulletHtml = markerText;
        }

        // Use hanging indent: padding-left for text indent, negative text-indent pulls bullet back
        // This makes wrapped text align with text after bullet, not the bullet itself
        const bulletIndent = 17; // Width of bullet (12.7px) + space (~4px)
        p.innerHTML = `${bulletHtml} ${restText}`;

        // Apply hanging indent style
        const styles: string[] = [];
        if (marginLeftPx > 0) {
          styles.push(`margin-left: ${marginLeftPx}px`);
        }
        styles.push(`padding-left: ${bulletIndent}px`);
        styles.push(`text-indent: -${bulletIndent}px`);
        p.setAttribute('style', styles.join('; '));

        console.log('[ImportTextDialog] Line:', { markerText, marginLeftPx });
      } else {
        // Non-bulleted line - need to add padding to align with bulleted text
        // First, save the original margin-left before cleaning
        const origMarginLeft = marginLeftPx;

        // Clean styles helper for child spans only
        const cleanChildStyles = (element: HTMLElement) => {
          const styleAttr = element.getAttribute('style');
          if (!styleAttr) return;

          const newStyles: string[] = [];
          styleAttr.split(';').forEach(prop => {
            const colonIdx = prop.indexOf(':');
            if (colonIdx === -1) return;

            const propName = prop.substring(0, colonIdx).trim().toLowerCase();
            const propValue = prop.substring(colonIdx + 1).trim();

            // Skip Word-specific properties
            if (propName.startsWith('mso-')) return;
            if (propName === 'font-family') return;
            if (propName === 'font' && propValue.toLowerCase().includes('times')) return;
            if (propName === 'line-height' && propValue === 'normal') return;

            if (propName === 'color' || propName === 'background-color' || propName === 'background') {
              newStyles.push(`${propName}: ${propValue}`);
            } else if (propName === 'font-weight' || propName === 'font-style') {
              newStyles.push(`${propName}: ${propValue}`);
            } else if (propName === 'font-size') {
              const px = convertToPx(propValue);
              if (px !== null) newStyles.push(`font-size: ${px}px`);
            } else if (propName === 'text-decoration') {
              newStyles.push(`${propName}: ${propValue}`);
            }
          });

          if (newStyles.length > 0) {
            element.setAttribute('style', newStyles.join('; '));
          } else {
            element.removeAttribute('style');
          }
        };

        // Clean styles on child spans
        p.querySelectorAll('span[style]').forEach(span => {
          cleanChildStyles(span as HTMLElement);
        });

        // Remove empty spans
        p.querySelectorAll('span').forEach(span => {
          const hasText = (span.textContent || '').trim().length > 0;
          const hasStyle = span.hasAttribute('style');
          const hasChildren = span.children.length > 0;

          if (!hasText && !hasChildren) {
            span.remove();
          } else if (!hasStyle && !hasChildren) {
            const parent = span.parentNode;
            while (span.firstChild) {
              parent?.insertBefore(span.firstChild, span);
            }
            span.remove();
          }
        });

        // Now apply the paragraph styles
        // Non-bulleted lines at same indent level as bulleted lines should align with text after bullet
        // Since bulleted lines use padding-left:17px; text-indent:-17px, non-bulleted lines just need padding-left:17px
        const pStyles: string[] = [];
        if (origMarginLeft > 0) {
          pStyles.push(`margin-left: ${origMarginLeft}px`);
          // Add padding to align with text after bullet (matches the padding-left on bulleted lines)
          pStyles.push(`padding-left: 17px`);
        }

        if (pStyles.length > 0) {
          p.setAttribute('style', pStyles.join('; '));
        } else {
          p.removeAttribute('style');
        }

        console.log('[ImportTextDialog] Non-bulleted line:', { origMarginLeft, text: (p.textContent || '').substring(0, 40) });
      }
    });

    // Convert font tags to spans
    doc.querySelectorAll('font').forEach(fontEl => {
      const span = doc.createElement('span');
      const color = fontEl.getAttribute('color');
      if (color) span.style.color = color;
      span.innerHTML = fontEl.innerHTML;
      fontEl.parentNode?.replaceChild(span, fontEl);
    });

    // Get the result
    let result = doc.body.innerHTML
      .replace(/<p[^>]*>\s*<\/p>/gi, '') // Remove empty paragraphs
      .trim();

    return result;
  }

  // Handle content changes in the editable area
  const handleContentChange = () => {
    if (contentEditableRef.current) {
      setHtmlContent(contentEditableRef.current.innerHTML);
      setPlainContent(contentEditableRef.current.innerText);
    }
  };

  // Handle focus for format panel
  const handleFocus = () => {
    console.log('[ImportTextDialog] handleFocus triggered, showing format panel');
    setShowFormatPanel(true);
    setApplyFormatFn(() => applyFormat);
  };

  // Handle click inside the editable area (to ensure format panel shows even if already focused)
  const handleEditableClick = () => {
    if (hasPasted && !showFormatPanel) {
      console.log('[ImportTextDialog] handleEditableClick - showing format panel');
      setShowFormatPanel(true);
      setApplyFormatFn(() => applyFormat);
    }
  };

  // Handle blur
  const handleBlur = () => {
    // Delay to allow clicking format panel buttons
    setTimeout(() => {
      if (!document.activeElement?.closest('[data-format-panel]')) {
        setShowFormatPanel(false);
        setApplyFormatFn(null);
      }
    }, 200);
  };

  // Handle selection change to update selected text
  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setSelectedText(selection.toString());
    }
  };

  // Apply formatting to selection
  const applyFormat = useCallback((format: TextFormat) => {
    if (!contentEditableRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!contentEditableRef.current.contains(range.commonAncestorContainer)) return;

    // Apply formatting using execCommand for simplicity
    if (format.bold !== undefined) {
      document.execCommand('bold', false);
    }
    if (format.italic !== undefined) {
      document.execCommand('italic', false);
    }
    if (format.underline !== undefined) {
      document.execCommand('underline', false);
    }
    if (format.strikethrough !== undefined) {
      document.execCommand('strikeThrough', false);
    }
    if (format.color) {
      document.execCommand('foreColor', false, format.color);
    }
    if (format.backgroundColor) {
      document.execCommand('hiliteColor', false, format.backgroundColor);
    }
    if (format.fontSize) {
      // Wrap selection in span with font size
      const selectedText = range.toString();
      if (selectedText) {
        const span = document.createElement('span');
        span.style.fontSize = format.fontSize;
        range.surroundContents(span);
      }
    }

    // Update state after formatting
    handleContentChange();
  }, []);

  // Handle format application from panel
  const handleFormatApply = useCallback((format: TextFormat) => {
    if (applyFormatFn) {
      applyFormatFn(format);
    }
  }, [applyFormatFn]);

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);

    try {
      // Find or create "My Systems Library" workspace
      const workspaces = await workspaceOperations.getAll();
      let libraryWorkspace = workspaces.find(ws => ws.title === 'My Systems Library');

      if (!libraryWorkspace) {
        libraryWorkspace = await workspaceOperations.create('My Systems Library', false);
      }

      // Create the text element
      await elementOperations.create({
        id: crypto.randomUUID(),
        workspaceId: libraryWorkspace.id,
        type: 'text',
        name: textName,
        position: { x: 50, y: 50 },
        size: { width: 600, height: 400 },
        zIndex: 1,
        content: plainContent,
        htmlContent: htmlContent
      } as any);

      onImportComplete(libraryWorkspace.id);
    } catch (err) {
      console.error('Failed to save text:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <>
      {/* Scoped styles for imported text content */}
      <style>{`
        .imported-text-content p {
          margin: 0 0 0.15em 0;
        }
        .imported-text-content p:last-child {
          margin-bottom: 0;
        }
      `}</style>
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-auto"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="bg-white rounded-lg shadow-2xl flex flex-col"
          style={{ width: showFormatPanel ? '1200px' : '900px', height: '700px' }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header with Name Input */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <Label htmlFor="text-name" className="text-base font-medium whitespace-nowrap">
              Text Name:
            </Label>
            <Input
              id="text-name"
              type="text"
              value={textName}
              onChange={(e) => setTextName(e.target.value)}
              placeholder="Enter a unique name for this text..."
              className={`flex-1 h-10 text-base ${
                textName.trim() && !isNameUnique
                  ? 'border-red-400 focus:border-red-500'
                  : ''
              }`}
              autoFocus
            />
          </div>
          {textName.trim() && !isNameUnique && (
            <p className="text-sm text-red-600 mt-2 ml-28">
              This name already exists. Please choose a unique name.
            </p>
          )}
        </div>

        {/* Main content area - Text editor on left, Format panel on right */}
        <div className="flex-1 flex overflow-hidden">
          {/* Text Area - Either paste prompt or editable content */}
          <div
            className="flex-1 overflow-auto p-4 focus:outline-none"
          >
            {!hasPasted ? (
              <div
                ref={pasteAreaRef}
                contentEditable
                suppressContentEditableWarning
                onPaste={handlePaste}
                className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg cursor-text focus:outline-none focus:border-blue-400"
                style={{ caretColor: 'transparent' }}
                onKeyDown={(e) => {
                  // Only allow paste, prevent typing
                  if (!(e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                  }
                }}
              >
                <p className="text-xl mb-2 pointer-events-none">Paste your text here</p>
                <p className="text-sm pointer-events-none">Copy text from Microsoft Word, PDF, or any source and paste (Ctrl+V / Cmd+V)</p>
                <p className="text-sm mt-2 text-gray-500 pointer-events-none">Formatting will be preserved</p>
              </div>
            ) : (
              <div
                ref={contentEditableRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleContentChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onClick={handleEditableClick}
                onMouseUp={handleSelectionChange}
                onKeyUp={handleSelectionChange}
                className="min-h-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 imported-text-content"
                style={{
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                  lineHeight: '1.5'
                }}
              />
            )}
          </div>

          {/* Format Panel - Right side */}
          {showFormatPanel && (
            <div className="w-80 border-l border-gray-200 bg-gray-50 p-4 overflow-auto" data-format-panel>
              <TextFormatPanel
                position={{ x: 0, y: 0 }}
                onApply={handleFormatApply}
                onClose={() => setShowFormatPanel(false)}
                selectedText={selectedText}
                isSidePanel={true}
              />
            </div>
          )}
        </div>

        {/* Footer with Save/Close */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <Button onClick={onClose} variant="outline" className="px-8">
            Close
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="px-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        </div>
      </div>
    </>,
    document.body
  );
}
