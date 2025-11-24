import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X } from 'lucide-react';

interface ElementNameDialogProps {
  elementType: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function ElementNameDialog({ elementType, onConfirm, onCancel }: ElementNameDialogProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog mounts and blur any active element
  useEffect(() => {
    // Blur any currently focused element
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Clear any text selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }

    // Try focusing immediately
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    // Try again after a short delay
    const timer1 = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    // And once more with a longer delay for reliability
    const timer2 = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(name.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Create element without name when clicking backdrop
    onConfirm('');
  };

  const handleSkip = () => {
    // Create element without name
    onConfirm('');
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] pointer-events-auto"
      onClick={handleBackdropClick}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-96"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Name Element (Optional)</h2>
          <Button
            onClick={handleSkip}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label className="text-sm mb-2 block">
              Element Type: <span className="font-semibold">{elementType}</span>
            </Label>
            <Label htmlFor="element-name" className="text-sm mb-1 block">
              Name (for searching/referencing later)
            </Label>
            <Input
              ref={inputRef}
              id="element-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name..."
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              This name won't be visible on the workspace
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="submit">
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
