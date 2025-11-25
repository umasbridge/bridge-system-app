import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X } from 'lucide-react';
import { elementOperations, WorkspaceElement } from '../../db/database';

interface ElementNameDialogProps {
  elementType: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  onInsertExisting?: (element: WorkspaceElement) => void;
  workspaceId?: string;
}

export function ElementNameDialog({ elementType, onConfirm, onCancel, onInsertExisting, workspaceId }: ElementNameDialogProps) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'create' | 'existing'>('create');
  const [existingElements, setExistingElements] = useState<WorkspaceElement[]>([]);
  const [selectedExistingElement, setSelectedExistingElement] = useState<WorkspaceElement | null>(null);
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

    // Only focus if in create mode or when an existing element is selected
    if (mode === 'create' || (mode === 'existing' && selectedExistingElement)) {
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
    }
  }, [mode, selectedExistingElement]);

  // Load existing elements of the same type from all workspaces (global library)
  useEffect(() => {
    const loadExistingElements = async () => {
      const allElements = await elementOperations.getAll();
      const typeMap: { [key: string]: string } = {
        'Systems Table': 'systems-table',
        'Text': 'text',
        'Image': 'image',
        'PDF': 'pdf'
      };

      const targetType = typeMap[elementType];

      // Filter elements of the right type that have names
      const withNames = allElements.filter(el =>
        el.type === targetType && el.name && el.name.trim() !== ''
      );

      // Keep only elements with unique names (filter out duplicates)
      const nameCount: { [name: string]: number } = {};
      withNames.forEach(el => {
        const name = el.name!.trim();
        nameCount[name] = (nameCount[name] || 0) + 1;
      });

      const uniqueNamedElements = withNames.filter(el => {
        const name = el.name!.trim();
        return nameCount[name] === 1;
      });

      setExistingElements(uniqueNamedElements);
    };

    loadExistingElements();
  }, [elementType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      onConfirm(name.trim());
    } else if (mode === 'existing' && selectedExistingElement && onInsertExisting) {
      // Create a copy with the new name
      const elementWithNewName = { ...selectedExistingElement, name: name.trim() };
      onInsertExisting(elementWithNewName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleBackdropClick}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-[600px] max-h-[70vh] overflow-y-auto"
        style={{ position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Title */}
        <h2 className="text-lg font-semibold text-center mb-12">Insert {elementType} Element</h2>

        {/* Mode Selection Buttons */}
        <div className="flex gap-4 mb-12">
          <Button
            type="button"
            onClick={() => setMode('create')}
            className="flex-1"
            variant={mode === 'create' ? 'default' : 'outline'}
          >
            Create New
          </Button>
          {onInsertExisting && (
            <Button
              type="button"
              onClick={() => setMode('existing')}
              className="flex-1"
              variant={mode === 'existing' ? 'default' : 'outline'}
            >
              Add Existing
            </Button>
          )}
        </div>

        {/* Content Area */}
        <form onSubmit={handleSubmit}>
          {mode === 'existing' && existingElements.length > 0 && (
            <div className="mb-10 flex items-center gap-3">
              <Label htmlFor="existing-element" className="text-sm whitespace-nowrap min-w-[80px]">
                Select:
              </Label>
              <select
                id="existing-element"
                value={selectedExistingElement?.id || ''}
                onChange={(e) => {
                  const element = existingElements.find(el => el.id === e.target.value);
                  setSelectedExistingElement(element || null);
                }}
                className="flex-1 h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose an element...</option>
                {existingElements.map(element => (
                  <option key={element.id} value={element.id}>
                    {element.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === 'existing' && existingElements.length === 0 && (
            <div className="mb-12 text-center text-gray-500 py-6">
              No existing {elementType.toLowerCase()} elements found
            </div>
          )}

          <div className="mb-12 flex items-center gap-3">
            <Label htmlFor="element-name" className="text-sm whitespace-nowrap min-w-[80px]">
              {mode === 'existing' && selectedExistingElement ? 'New Name:' : 'Name:'}
            </Label>
            <Input
              ref={inputRef}
              id="element-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === 'existing' && selectedExistingElement ? 'Enter a new name...' : 'Enter a name...'}
              className="flex-1"
              disabled={mode === 'existing' && !selectedExistingElement}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="submit" disabled={mode === 'existing' && !selectedExistingElement}>
              Done
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
