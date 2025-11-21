# Content Box Shell

A clean, reusable content box component without action buttons. This is a frozen shell version of the content box system.

## Features

- Clean container for displaying text, links, and files
- No action bar buttons (removed for clean UI)
- A4 proportions (600px × 848px)
- Supports element selection and editing
- PDF support with page navigation
- Paste image support
- Integrated with element-look-and-feel system

## Components

- **ContentBox**: The main container component
- **ContentBoxWorkspace**: Workspace for managing multiple content boxes
- **TextBoxElement**: Text input component
- **LinkElement**: Link display and editing component
- **FileElement**: Image/PDF upload and display component

## Usage

```tsx
import { ContentBoxWorkspace } from './components/content-box-shell';

function App() {
  return <ContentBoxWorkspace />;
}
```

## Notes

This is a shell version saved on October 16, 2025. The action buttons have been removed to provide a clean base for future development.
