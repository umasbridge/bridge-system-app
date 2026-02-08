import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SplitViewProps {
  leftContent: ReactNode;
  rightContent: ReactNode;
  rightTitle?: string;
  onCloseRight: () => void;
}

/**
 * SplitView - Side-by-side layout for comparing pages
 * Left side shows main content, right side shows linked page
 */
export function SplitView({
  leftContent,
  rightContent,
  rightTitle,
  onCloseRight,
}: SplitViewProps) {
  return (
    <div className="flex h-full w-full gap-4">
      {/* Left Panel - Main Page */}
      <div className="flex-1 min-w-0 overflow-auto">
        {leftContent}
      </div>

      {/* Divider */}
      <div className="w-px bg-gray-300" />

      {/* Right Panel - Split View Page */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
          <h3 className="font-medium text-sm truncate">{rightTitle || 'Split View'}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCloseRight}
            className="h-7 w-7"
            title="Close split view"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {rightContent}
        </div>
      </div>
    </div>
  );
}
