import { TextEl } from '@/components/elements/TextEl';

interface TitleBarProps {
  title: string;
  titleHtml?: string;
  onChange?: (title: string, titleHtml?: string) => void;
  readOnly?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onFocus?: () => void;
  width?: number;
  maxWidth?: number;
  onWidthChange?: (w: number) => void;
  paddingLeft?: number;
  paddingRight?: number;
}

/**
 * TitleBar - Editable title for system pages
 * Uses TextEl in default mode (full element format support)
 */
export function TitleBar({
  title,
  titleHtml,
  onChange,
  readOnly = false,
  isSelected = false,
  onSelect,
  onFocus,
  width,
  maxWidth,
  onWidthChange,
  paddingLeft = 32,
  paddingRight = 20,
}: TitleBarProps) {
  return (
    <div style={{ marginTop: '14px', paddingBottom: '6px', paddingLeft: `${paddingLeft}px`, paddingRight: `${paddingRight}px`, background: 'white', flexShrink: 0, fontSize: '18px', fontWeight: 700, textAlign: 'center' }}>
      <TextEl
        mode="default"
        value={title}
        htmlValue={titleHtml}
        onChange={(text, html) => onChange?.(text, html)}
        onFocus={onFocus}
        placeholder="Untitled System"
        readOnly={readOnly}
        borderColor="transparent"
        borderWidth={0}
        fillColor="transparent"
        isSelected={isSelected}
        onSelect={onSelect}
        width={width}
        maxWidth={maxWidth}
        onWidthChange={onWidthChange}
      />
    </div>
  );
}
