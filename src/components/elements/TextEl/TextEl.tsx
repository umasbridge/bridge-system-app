import { useEffect, useRef } from 'react';
import { Resizable } from 're-resizable';
import { cn } from '@/components/ui/utils';
import { useRichText } from './useRichText';
import { BlockFormatBar } from './BlockFormatBar';
import { TextFormatPanel } from './TextFormatPanel';
import { HyperlinkMenu } from './HyperlinkMenu';
import { TextElProps } from './types';
import { LAYOUT } from '@/types';

/**
 * TextEl - Unified rich text component with modes
 *
 * Modes:
 * - default: Full features (formatting, images, hyperlinks, resize, element styling)
 * - title: Limited (text formatting only, single line, no images/bullets/hyperlinks)
 * - cell: For BidTable cells (no resize, no bullets, but hyperlinks allowed)
 */
export function TextEl({
  mode,
  value, // Plain text (used as fallback when htmlValue is undefined)
  htmlValue,
  onChange,
  readOnly = false,
  placeholder,
  minHeight,
  onFocus,
  onBlur,
  availablePages = [],
  onHyperlinkClick,
  className,
  // Element styling (default mode only)
  borderColor = '#d1d5db',
  borderWidth = 2,
  fillColor = 'transparent',
  isSelected = false,
  onSelect,
  width,
  maxWidth,
  onWidthChange,
}: TextElProps) {
  // Determine default min height based on mode
  const effectiveMinHeight = minHeight ?? (mode === 'cell' ? 20 : LAYOUT.MIN_ELEMENT_HEIGHT);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Use the rich text hook
  const {
    contentEditableRef,
    selection,
    showFormatPanel,
    showHyperlinkMenu,
    isFocused,
    openHyperlinkMenu,
    closePanels,
    applyFormat,
    applyHyperlink,
    removeHyperlink,
    handlers,
  } = useRichText({
    mode,
    initialHtml: htmlValue || value, // Use plain value as fallback
    onChange,
    onFocus,
    onBlur,
    onHyperlinkClick,
    readOnly,
  });

  // Sync external htmlValue changes - but NOT while the element has focus
  // (to avoid resetting cursor position during typing)
  useEffect(() => {
    if (contentEditableRef.current && htmlValue !== undefined && !isFocused) {
      // Only update if the external value differs from current content
      if (contentEditableRef.current.innerHTML !== htmlValue) {
        contentEditableRef.current.innerHTML = htmlValue;
      }
    }
  }, [htmlValue, isFocused]);

  // Handle click on element border (for default mode) - selects element for toolbar
  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'default' || readOnly) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const borderArea = 10;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const isOnBorder =
      clickX <= borderArea ||
      clickX >= rect.width - borderArea ||
      clickY <= borderArea ||
      clickY >= rect.height - borderArea;
    if (isOnBorder) {
      e.stopPropagation();
      e.preventDefault();
      onSelect?.();
      closePanels();
    }
  };

  // Prevent focus when mousedown is on the border area
  const handleWrapperMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'default' || readOnly) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const borderArea = 10;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const isOnBorder =
      clickX <= borderArea ||
      clickX >= rect.width - borderArea ||
      clickY <= borderArea ||
      clickY >= rect.height - borderArea;
    if (isOnBorder) {
      e.preventDefault();
    }
  };

  // Base styles for all modes
  const baseStyles = cn(
    'outline-none',
    'whitespace-pre-wrap',
    'break-words',
    'leading-relaxed',
  );

  const cursorStyle = readOnly ? 'default' : 'text';

  // Mode-specific styles
  const modeStyles = {
    default: cn(
      'p-3',
      'min-w-[100px]',
    ),
    title: cn(
      'px-2 py-1',
      'font-semibold',
      'text-lg',
    ),
    cell: cn(
      'px-2 py-1',
      'text-sm',
    ),
  };

  // For default mode, wrap in a styled container
  if (mode === 'default') {
    const resizeEnabled = !readOnly && isSelected;

    return (
      <div className="relative">
        <Resizable
          size={{ width: width || '100%', height: 'auto' }}
          minWidth={100}
          maxWidth={maxWidth}
          enable={{
            right: resizeEnabled,
            top: false,
            bottom: false,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
          onResizeStop={(_e, _direction, _ref, d) => {
            if (onWidthChange) {
              const currentW = width || _ref.offsetWidth - d.width;
              let newWidth = currentW + d.width;
              if (maxWidth && newWidth > maxWidth) {
                newWidth = maxWidth;
              }
              onWidthChange(Math.max(100, newWidth));
            }
          }}
          handleStyles={{
            right: {
              width: '6px',
              right: '-3px',
              cursor: 'col-resize',
            },
          }}
          handleClasses={{
            right: resizeEnabled ? 'hover:bg-blue-400 rounded' : '',
          }}
        >
        {/* Element wrapper with border and fill */}
        <div
          ref={wrapperRef}
          className={cn(
            'rounded transition-shadow overflow-hidden',
          )}
          style={{
            border: `${borderWidth}px solid ${borderColor}`,
            backgroundColor: fillColor === 'transparent' ? 'white' : fillColor,
            ...(isSelected ? { boxShadow: '0 0 0 2px white, 0 0 0 4px #3b82f6' } : {}),
          }}
          onMouseDown={handleWrapperMouseDown}
          onClick={handleWrapperClick}
        >
          {/* Block Format Bar - shown when focused inside content */}
          {!readOnly && isFocused && (
            <BlockFormatBar mode={mode} onFormat={applyFormat} />
          )}

          {/* Contenteditable element */}
          <div
            ref={contentEditableRef}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            data-placeholder={placeholder}
            className={cn(
              baseStyles,
              modeStyles[mode],
              className,
            )}
            style={{
              minHeight: effectiveMinHeight,
              cursor: cursorStyle,
            }}
            onInput={handlers.onInput}
            onKeyDown={handlers.onKeyDown}
            onMouseUp={handlers.onMouseUp}
            onMouseDown={handlers.onMouseDown}
            onClick={handlers.onClick}
            onPaste={handlers.onPaste}
            onFocus={handlers.onFocus}
            onBlur={handlers.onBlur}
          />
        </div>

        {/* Text Format Panel - shown when text is selected */}
        {!readOnly && showFormatPanel && selection.hasSelection && (
          <TextFormatPanel
            mode={mode}
            position={selection.position}
            onFormat={applyFormat}
            onOpenHyperlink={openHyperlinkMenu}
            onRemoveHyperlink={removeHyperlink}
            isHyperlinkSelected={selection.isHyperlinkSelected}
          />
        )}

        {/* Hyperlink Menu - shown when creating a link */}
        {!readOnly && showHyperlinkMenu && (
          <HyperlinkMenu
            availablePages={availablePages}
            selectedText={selection.selectedText}
            position={selection.position}
            onApply={applyHyperlink}
            onClose={closePanels}
          />
        )}

        </Resizable>
      </div>
    );
  }

  // For title and cell modes, simpler rendering
  return (
    <div className="relative">
      {/* Block Format Bar - shown when focused for cell mode */}
      {mode === 'cell' && !readOnly && isFocused && (
        <BlockFormatBar mode={mode} onFormat={applyFormat} />
      )}

      {/* Main contenteditable element */}
      <div
        ref={contentEditableRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={cn(
          baseStyles,
          modeStyles[mode],
          className,
        )}
        style={{
          minHeight: effectiveMinHeight,
          cursor: cursorStyle,
          ...(mode === 'title' ? {
            borderBottom: isFocused ? '1px solid #d1d5db' : '1px solid transparent',
          } : {}),
        }}
        onInput={handlers.onInput}
        onKeyDown={handlers.onKeyDown}
        onMouseUp={handlers.onMouseUp}
        onMouseDown={handlers.onMouseDown}
        onClick={handlers.onClick}
        onPaste={handlers.onPaste}
        onFocus={handlers.onFocus}
        onBlur={handlers.onBlur}
      />

      {/* Format Panel - shown when text is selected */}
      {!readOnly && showFormatPanel && selection.hasSelection && (
        <TextFormatPanel
          mode={mode}
          position={selection.position}
          onFormat={applyFormat}
          onOpenHyperlink={openHyperlinkMenu}
          onRemoveHyperlink={removeHyperlink}
          isHyperlinkSelected={selection.isHyperlinkSelected}
        />
      )}

      {/* Hyperlink Menu - shown when creating a link (not for title mode) */}
      {!readOnly && showHyperlinkMenu && mode !== 'title' && (
        <HyperlinkMenu
          availablePages={availablePages}
          selectedText={selection.selectedText}
          position={selection.position}
          onApply={applyHyperlink}
          onClose={closePanels}
        />
      )}
    </div>
  );
}

export default TextEl;
