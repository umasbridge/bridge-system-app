# Bidding Table Module

A complete, reusable bidding table system with drag-and-drop functionality, resizable columns, and nested response tables.

## Features

- **2-column structure**: "Bid" (80px fixed width, resizable) and "Meaning" (600px default, resizable)
- **Editable text fields**: All cells are editable with auto-resizing text areas
- **Add rows**: Click `+` or press `+` key to add sibling rows
- **Add nested responses**: Click `++` or press `Shift + +` to add child rows
- **Add parent rows**: Click `-` or press `-` key (only for nested rows)
- **Delete rows**: Click `x` or press `x` key
- **Resizable columns**: Drag the right edge of either column to resize
- **Fill colors**: Click the palette icon to set background colors for bid cells
- **Color inheritance**: Sibling rows inherit the same fill color
- **Proper nesting**: Nested tables indent with aligned right margins
- **Draggable tables**: Each table can be moved around the workspace
- **Keyboard shortcuts**: Full keyboard support for all actions
- **Undo feature**: Undo any row additions or deletions with Ctrl+Z (Cmd+Z on Mac) or the Undo button (appears when hovering over table)

## File Structure

```
bidding-table/
├── index.tsx                      # Main export file
├── BiddingTableWorkspace.tsx      # Complete workspace with "Insert Bidding Table" button
├── DraggableBiddingTable.tsx      # Draggable wrapper for individual tables
├── BiddingTable.tsx               # Main table logic and state management
├── BiddingRow.tsx                 # Individual row component
├── AutoResizeTextarea.tsx         # Auto-resizing textarea component
├── ColorPicker.tsx                # Color picker for bid cells
└── README.md                      # This file
```

## Dependencies

Required packages:
- `react`
- `lucide-react` (for icons)
- `re-resizable` (for resizable columns)

Required components from your project:
- `Button` from `../ui/button`

## Usage

### Quick Start (Full Workspace)

```tsx
import { BiddingTableWorkspace } from './components/bidding-table';

function App() {
  return <BiddingTableWorkspace />;
}
```

This gives you the complete experience with the "Insert Bidding Table" button and multiple draggable tables.

### Standalone Table

```tsx
import { BiddingTable } from './components/bidding-table';

function MyComponent() {
  return (
    <div>
      <h1>My Bidding Table</h1>
      <BiddingTable />
    </div>
  );
}
```

### Custom Integration

```tsx
import { DraggableBiddingTable } from './components/bidding-table';

function CustomWorkspace() {
  const [tables, setTables] = useState([{ id: '1' }]);
  
  return (
    <div className="relative min-h-screen">
      {tables.map(table => (
        <DraggableBiddingTable key={table.id} id={table.id} />
      ))}
    </div>
  );
}
```

## How to Copy to Another Application

1. Copy the entire `bidding-table` folder to your new project's `components` directory
2. Ensure you have the required dependencies installed:
   ```bash
   npm install lucide-react re-resizable
   ```
3. Make sure you have the `Button` component from shadcn/ui (or update the import in `BiddingTableWorkspace.tsx`)
4. Import and use as shown in the usage examples above

## Customization

### Change Default Column Widths

In `BiddingTable.tsx`:
```tsx
const [levelWidths, setLevelWidths] = useState<{ [level: number]: number }>({
  0: 80  // Change this for default bid column width
});

const [meaningWidth, setMeaningWidth] = useState<number>(600); // Change this for default meaning column width
```

### Change Default Colors

In `ColorPicker.tsx`, modify the `COLORS` array:
```tsx
const COLORS = [
  '#FFFFFF', // White
  '#FFE5E5', // Light Red
  // Add or modify colors here
];
```

### Styling

All components use Tailwind CSS classes. Modify the className props in each component to customize the appearance.

## Keyboard Shortcuts

- `+` - Add sibling row
- `Shift + +` - Add child/response row
- `-` - Add parent level row (only for nested rows)
- `x` or `X` - Delete row
- `Ctrl + Z` (or `Cmd + Z` on Mac) - Undo last action (add/delete row)

## License

This module is part of your application and follows the same license.
