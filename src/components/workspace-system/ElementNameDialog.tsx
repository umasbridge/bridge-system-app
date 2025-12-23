import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ChevronDown } from 'lucide-react';
import { elementOperations, WorkspaceElement } from '../../lib/supabase-db';

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
  const [hasDuplicateName, setHasDuplicateName] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Blur any active element and clear selection when dialog first mounts
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
  }, []); // Only run on mount

  // Focus input when in create mode or when an existing element is selected
  useEffect(() => {
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

  // Trap focus within the dialog - prevent focus from moving to elements behind
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const dialog = document.querySelector('[data-element-name-dialog]');
      if (dialog && e.target && !dialog.contains(e.target as Node)) {
        // Focus is trying to move outside the dialog - prevent it
        e.preventDefault();
        e.stopPropagation();
        // Bring focus back to the input if available, otherwise the dialog itself
        if (inputRef.current) {
          inputRef.current.focus();
        } else {
          (dialog as HTMLElement).focus();
        }
      }
    };

    // Use capture phase to intercept before focus actually moves
    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, []);

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

      // Group by name and keep one representative element per unique name
      const nameMap: { [name: string]: WorkspaceElement } = {};
      withNames.forEach(el => {
        const name = el.name!.trim();
        // Keep first element encountered for each name (they should have same content)
        if (!nameMap[name]) {
          nameMap[name] = el;
        }
      });

      const uniqueNamedElements = Object.values(nameMap);

      setExistingElements(uniqueNamedElements);
    };

    loadExistingElements();
  }, [elementType]);

  // Check for duplicate names when name changes (only in create mode)
  useEffect(() => {
    if (mode === 'create' && name.trim()) {
      const trimmedName = name.trim();
      const isDuplicate = existingElements.some(el => el.name?.trim() === trimmedName);
      setHasDuplicateName(isDuplicate);
    } else {
      setHasDuplicateName(false);
    }
  }, [name, existingElements, mode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      // If there's a duplicate name, create without a name (empty string)
      if (hasDuplicateName) {
        onConfirm('');
      } else {
        onConfirm(name.trim());
      }
    } else if (mode === 'existing' && selectedExistingElement && onInsertExisting) {
      // Create a copy with the new name (or use original name if no new name provided)
      const finalName = name.trim() || selectedExistingElement.name || '';
      const elementWithNewName = { ...selectedExistingElement, name: finalName };
      onInsertExisting(elementWithNewName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close dialog if clicking directly on the backdrop (not on the dialog content)
    const target = e.target as HTMLElement;
    const dialog = document.querySelector('[data-element-name-dialog]');

    // If the click is inside the dialog, don't do anything
    if (dialog?.contains(target)) {
      return;
    }

    // Native select dropdown options render outside the dialog in a browser overlay
    // Don't close if clicking on select/option elements
    if (target.tagName === 'SELECT' || target.tagName === 'OPTION') {
      return;
    }

    // Only close if clicking directly on the backdrop div itself (e.target === e.currentTarget)
    if (e.target !== e.currentTarget) {
      return;
    }

    // Clicking on the backdrop itself - close the dialog
    onCancel();
  };

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    // Only stop propagation if clicking on the backdrop itself (not dialog content)
    const target = e.target as HTMLElement;
    const dialog = document.querySelector('[data-element-name-dialog]');

    // Let events inside the dialog through
    if (dialog?.contains(target)) {
      return;
    }

    // Native select dropdown options render outside the dialog
    if (target.tagName === 'SELECT' || target.tagName === 'OPTION') {
      return;
    }

    // Only stop propagation if clicking directly on the backdrop div itself
    if (e.target !== e.currentTarget) {
      return;
    }

    e.stopPropagation();
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999 }}
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropMouseDown}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        ref={dialogRef}
        data-element-name-dialog
        tabIndex={-1}
        className="bg-white rounded-lg shadow-2xl w-[580px] max-h-[80vh] overflow-y-auto outline-none"
        style={{ position: 'relative' }}
        onKeyDown={handleKeyDown}
      >
        {/* Line 1: Title */}
        <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '48px', paddingBottom: '40px' }}>
          <h2 style={{ fontSize: '30px', fontWeight: '800', textAlign: 'center', color: '#111827' }}>
            Insert {elementType} Element
          </h2>
        </div>

        {/* Line 2: Mode Selection Buttons */}
        <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingBottom: '40px' }}>
          <div className="flex gap-4">
            <Button
              type="button"
              onClick={() => setMode('create')}
              className="flex-1 h-12 px-8 text-base font-medium"
              variant={mode === 'create' ? 'default' : 'outline'}
            >
              Create New
            </Button>
            {onInsertExisting && (
              <Button
                type="button"
                onClick={() => setMode('existing')}
                className="flex-1 h-12 px-8 text-base font-medium"
                variant={mode === 'existing' ? 'default' : 'outline'}
              >
                Add Existing
              </Button>
            )}
          </div>
        </div>

        {/* Lines 3-4: Form */}
        <div style={{ paddingLeft: '48px', paddingRight: '48px', paddingBottom: '40px' }}>
          <form onSubmit={handleSubmit}>
            {mode === 'existing' && existingElements.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <div className="space-y-2">
                  <Label htmlFor="existing-element" className="text-base font-semibold text-gray-800">
                    Select Element
                  </Label>
                  {/* Custom dropdown that renders inline (no portal issues) */}
                  <div ref={dropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="w-full h-12 rounded-md border-2 border-gray-300 bg-white px-4 py-2 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors flex items-center justify-between"
                    >
                      <span className={selectedExistingElement ? 'text-gray-900' : 'text-gray-500'}>
                        {selectedExistingElement?.name || 'Choose an element...'}
                      </span>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {dropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-[300px] overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg z-50">
                        {existingElements.map(element => (
                          <div
                            key={element.id}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedExistingElement(element);
                              setDropdownOpen(false);
                              // Focus the name input after a brief delay to let React render
                              setTimeout(() => {
                                inputRef.current?.focus();
                              }, 50);
                            }}
                            className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                              selectedExistingElement?.id === element.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                            }`}
                          >
                            {element.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {mode === 'existing' && existingElements.length === 0 && (
              <div className="text-center text-gray-500 bg-gray-50 rounded-md text-base" style={{ paddingTop: '40px', paddingBottom: '40px', marginBottom: '40px' }}>
                No existing {elementType.toLowerCase()} elements found
              </div>
            )}

            {/* Line 3-4: Name Label and Input - Only show in Create mode OR when element selected in Existing mode */}
            {(mode === 'create' || (mode === 'existing' && selectedExistingElement)) && (
              <div className="space-y-2">
                <Label htmlFor="element-name" className="text-base font-semibold text-gray-800">
                  {mode === 'existing' && selectedExistingElement ? 'New Name' : 'Name'}
                </Label>
                <Input
                  ref={inputRef}
                  id="element-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  onKeyUp={(e) => e.stopPropagation()}
                  onKeyPress={(e) => e.stopPropagation()}
                  onInput={(e) => e.stopPropagation()}
                  placeholder={mode === 'existing' && selectedExistingElement ? 'Enter a new name...' : 'Enter a name...'}
                  className={`w-full h-12 px-4 text-base border-2 transition-colors ${
                    hasDuplicateName
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
                {hasDuplicateName && (
                  <p className="text-sm text-red-600 mt-2">
                    Another element by this name exists. Input a new name to save, or click on "Done" to proceed without saving
                  </p>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Line 5: Footer */}
        <div className="bg-gray-50 border-t border-gray-200 rounded-b-lg" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '32px', paddingBottom: '32px' }}>
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              style={{ height: '48px', paddingLeft: '40px', paddingRight: '40px' }}
              className="text-base font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={mode === 'existing' && !selectedExistingElement}
              style={{ height: '48px', paddingLeft: '40px', paddingRight: '40px' }}
              className="text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
