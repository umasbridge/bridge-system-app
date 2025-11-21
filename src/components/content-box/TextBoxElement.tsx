import { Trash2 } from 'lucide-react';
import { TextElement } from './types';

interface TextBoxElementProps {
  element: TextElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextElement>) => void;
  onDelete: () => void;
}

export function TextBoxElement({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete
}: TextBoxElementProps) {
  return (
    <div
      onClick={onSelect}
      className={`w-full border border-gray-300 bg-white p-2 rounded relative ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <textarea
        value={element.content}
        onChange={(e) => {
          onUpdate({ content: e.target.value });
        }}
        className="w-full bg-transparent resize-none outline-none min-h-[60px]"
        placeholder="Enter text..."
        onClick={(e) => e.stopPropagation()}
        rows={3}
      />
      
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 p-1 bg-white border border-gray-300 rounded-full hover:bg-red-100 text-red-600 shadow-lg"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
