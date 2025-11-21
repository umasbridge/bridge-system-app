import { useEffect, useRef, forwardRef } from 'react';
import { cn } from '../ui/utils';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  minHeight?: number;
  columnWidth?: number;
}

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ value, className, minHeight = 20, columnWidth, onChange, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const adjustHeight = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to minHeight to get the correct scrollHeight
      textarea.style.height = `${minHeight}px`;
      // Set height to the larger of minHeight or scrollHeight
      const newHeight = Math.max(minHeight, textarea.scrollHeight);
      textarea.style.height = `${newHeight}px`;
    };

    useEffect(() => {
      adjustHeight();
    }, [value, minHeight, columnWidth]); // Adjust when value, minHeight, or columnWidth changes

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <textarea
        ref={(element) => {
          textareaRef.current = element;
          if (typeof ref === 'function') {
            ref(element);
          } else if (ref) {
            ref.current = element;
          }
        }}
        value={value}
        onChange={handleChange}
        onInput={adjustHeight}
        className={cn(
          'w-full resize-none overflow-hidden border-transparent focus:border-gray-300 bg-transparent outline-none box-border',
          className
        )}
        style={{ minHeight: `${minHeight}px`, padding: '0', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.2', whiteSpace: 'pre-wrap' }}
        {...props}
      />
    );
  }
);

AutoResizeTextarea.displayName = 'AutoResizeTextarea';
