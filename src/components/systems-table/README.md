# Systems Table Component

A comprehensive workspace for creating and managing interactive systems tables with rich text formatting, hyperlinks, and hierarchical structure.

## Features

- **Hierarchical Structure**: Create nested rows with parent-child relationships
- **Rich Text Formatting**: Bold, italic, underline, colors, fonts, and more
- **Workspace Hyperlinking**: Link to other workspaces with three modes:
  - Comment Box: Opens as popup overlay
  - Split View: Opens side-by-side display  
  - New Page: Opens in new tab/window
- **Drag and Drop**: Freely position tables on the canvas
- **Resizable Columns**: Adjust column widths as needed
- **Color Fill**: Apply background colors to cells
- **Gridlines**: Customizable gridline styling
- **Borders**: Customizable border styling
- **Undo/Redo**: Full undo support for deletions

## Usage

```tsx
import { SystemsTableWorkspace, WorkspaceProvider } from './components/systems-table';

function App() {
  return (
    <WorkspaceProvider>
      <SystemsTableWorkspace />
    </WorkspaceProvider>
  );
}
```

## Keyboard Shortcuts

- `+`: Add new row (sibling)
- `Shift + +`: Add child row
- `-`: Add parent sibling row (when applicable)
- `x`: Delete current row
- `Ctrl/Cmd + Z`: Undo delete

## Components

- `SystemsTableWorkspace`: Main workspace component
- `SystemsTable`: Individual table component
- `SystemsTableRow`: Single row with rich text cells
- `RichTextCell`: Editable cell with formatting support
- `WorkspaceManager`: Context provider for workspace functionality
- `SystemsTableFormatPanel`: Format panel for borders and gridlines
