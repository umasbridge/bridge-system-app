# Workspace System

A comprehensive workspace management system that allows creating multiple workspaces with various content elements.

## Features

- **Multiple Workspaces**: Create and manage multiple workspaces with tabs
- **Workspace Titles**: Each workspace has an editable title at the top
- **Sequential Element Insertion**: Elements are added sequentially with automatic spacing
- **Four Element Types**:
  - Systems Tables: Hierarchical tables with rich text
  - Text Boxes: Editable text content
  - Images: Upload and display images
  - Files: Upload and display file references
- **Full Element Capabilities**: All elements support:
  - Drag to reposition
  - Resize
  - Delete with undo
  - Selection and formatting

## Usage

```tsx
import { WorkspaceSystem } from './components/workspace-system';
import { WorkspaceProvider } from './components/systems-table/WorkspaceManager';

function App() {
  return (
    <WorkspaceProvider>
      <WorkspaceSystem />
    </WorkspaceProvider>
  );
}
```

## Element Spacing

Elements are automatically positioned with 40px (2 line spacing) between them when inserted.

## Components

- `WorkspaceSystem`: Main component with workspace tabs and navigation
- `WorkspaceEditor`: Individual workspace editor with title and element canvas
