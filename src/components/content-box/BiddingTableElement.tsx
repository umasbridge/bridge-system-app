import { Trash2 } from 'lucide-react';
import { BiddingTable } from '../bidding-table/BiddingTable';
import { BiddingTableElement as BiddingTableElementType } from './types';

interface BiddingTableElementProps {
  element: BiddingTableElementType;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function BiddingTableElement({
  element,
  isSelected,
  onSelect,
  onDelete
}: BiddingTableElementProps) {
  return (
    <div
      onClick={onSelect}
      className={`w-full rounded relative ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
    >
      <BiddingTable breadcrumbMode={element.breadcrumbMode} />

      {isSelected && (
        <div className="absolute -top-2 -right-2 flex gap-1 bg-white border border-gray-300 rounded-full p-1 shadow-lg">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-red-100 text-red-600 rounded"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
