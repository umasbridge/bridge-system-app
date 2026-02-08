import { HyperlinkTarget, HyperlinkMode } from '@/types';

interface TableOfContentsProps {
  pages: Array<{ id: string; name: string }>;
  currentPageId?: string;
  onNavigate?: (target: HyperlinkTarget) => void;
}

export function TableOfContents({
  pages,
  currentPageId,
  onNavigate,
}: TableOfContentsProps) {
  const handleClick = (pageId: string, pageName: string, mode: HyperlinkMode) => {
    if (onNavigate) {
      onNavigate({ pageId, pageName, mode });
    }
  };

  // Filter out the current page from the list
  const otherPages = pages.filter(p => p.id !== currentPageId);

  if (otherPages.length === 0) return null;

  return (
    <div className="border border-gray-300 rounded bg-gray-50 p-3 w-48">
      <h3 className="font-semibold text-sm text-gray-700 mb-2 pb-1 border-b border-gray-200">
        Table of Contents
      </h3>
      <ul className="space-y-1">
        {otherPages.map(page => (
          <li key={page.id}>
            <button
              onClick={() => handleClick(page.id, page.name, 'split')}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline text-left w-full truncate"
              title={`Open ${page.name} in split view`}
            >
              {page.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
