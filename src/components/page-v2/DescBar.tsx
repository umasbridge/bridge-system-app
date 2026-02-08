import { TextEl } from '@/components/elements/TextEl';

interface DescBarProps {
  description: string;
  descriptionHtml?: string;
  onChange?: (description: string, descriptionHtml?: string) => void;
  readOnly?: boolean;
  onFocus?: () => void;
}

/**
 * DescBar - Editable description for main system pages
 * Uses TextEl in default mode (full formatting)
 */
export function DescBar({
  description,
  descriptionHtml,
  onChange,
  readOnly = false,
  onFocus,
}: DescBarProps) {
  return (
    <div className="border-b border-gray-200 bg-gray-50 px-8 py-3">
      <TextEl
        mode="default"
        value={description}
        htmlValue={descriptionHtml}
        onChange={(text, html) => onChange?.(text, html)}
        placeholder="Add a description for this system..."
        readOnly={readOnly}
        minHeight={60}
        borderColor="transparent"
        borderWidth={0}
        fillColor="transparent"
        onFocus={onFocus}
      />
    </div>
  );
}
