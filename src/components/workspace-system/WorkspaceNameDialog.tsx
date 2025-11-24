import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X } from 'lucide-react';

interface WorkspaceNameDialogProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function WorkspaceNameDialog({ onConfirm, onCancel }: WorkspaceNameDialogProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  // Focus input when dialog mounts
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
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Workspace name is required');
      return;
    }
    onConfirm(trimmedName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Don't close on backdrop click since name is required
    e.preventDefault();
    e.stopPropagation();
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
          <h2 className="text-lg font-semibold">Name Your Workspace</h2>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label htmlFor="workspace-name" className="text-sm mb-2 block">
              Workspace Name <span className="text-red-500">*</span>
            </Label>
            <Input
              ref={inputRef}
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Enter workspace name..."
              className={`w-full ${error ? 'border-red-500' : ''}`}
            />
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              This name will be used to identify and save your workspace
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
            >
              Cancel
            </Button>
            <Button type="submit">
              Create Workspace
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
