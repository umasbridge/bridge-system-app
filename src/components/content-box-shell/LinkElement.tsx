import { useState } from 'react';
import { Trash2, ExternalLink, Edit } from 'lucide-react';
import { LinkElement as LinkElementType } from './types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';

interface LinkElementProps {
  element: LinkElementType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<LinkElementType>) => void;
  onDelete: () => void;
}

export function LinkElement({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete
}: LinkElementProps) {
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [editUrl, setEditUrl] = useState(element.url);
  const [editText, setEditText] = useState(element.displayText);

  const handleLinkClick = () => {
    if (element.url) {
      window.open(element.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSaveLink = () => {
    onUpdate({
      url: editUrl,
      displayText: editText
    });
    setIsEditingLink(false);
  };

  return (
    <>
      <div
        onClick={onSelect}
        className={`w-full flex items-center gap-2 bg-white border border-gray-300 rounded px-3 py-2 relative ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
      >
        <a
          href={element.url}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleLinkClick();
          }}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 underline overflow-hidden text-ellipsis whitespace-nowrap flex-1"
          title={element.url}
        >
          <ExternalLink className="h-4 w-4 flex-shrink-0" />
          <span className="overflow-hidden text-ellipsis">
            {element.displayText || element.url}
          </span>
        </a>

        {isSelected && (
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingLink(true);
              }}
              className="p-1 hover:bg-gray-100 rounded"
              title="Edit Link"
            >
              <Edit className="h-4 w-4" />
            </button>
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

      <Dialog open={isEditingLink} onOpenChange={setIsEditingLink}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>URL</Label>
              <Input
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </div>
            <div>
              <Label>Display Text</Label>
              <Input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Click here"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditingLink(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveLink}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
