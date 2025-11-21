# Insert Image Module

A frozen, reusable module that provides on-demand image placeholder creation with multiple input methods. Click "Insert Image" to create placeholders that can be filled via upload, paste, or drag-and-drop.

## Features

- **Insert Image Button**: Creates empty image placeholders on demand
- **Multiple Input Methods**:
  - Click to upload from file system
  - Paste images (Cmd/Ctrl+V)
  - Drag and drop images into placeholder
- **Visual Feedback**: Hover and drag states for better UX
- **Element Integration**: Full integration with the element-look-and-feel system:
  - Hover-based selection (select icon in top-left corner)
  - Drag-to-move functionality
  - Resizable borders (height/width)
  - Aspect-ratio resizing (bottom-right corner)
  - Format Panel for customization
- **Formatting Options**:
  - Border color and width (including "No Border")
  - Fill color (including "No Fill")
  - Default styling: No border, no fill (transparent)
- **Undo Delete**: After deletion, an "Undo Delete" button appears at the deletion location for 2 minutes

## Usage

### Basic Implementation

```tsx
import { InsertImageWorkspace } from './components/insert-image';

function App() {
  return <InsertImageWorkspace />;
}
```

### Component Structure

- **InsertImageWorkspace**: Main workspace with "Insert Image" button and canvas
- **ImageElement**: Image element with placeholder and multiple input methods
- **types.ts**: TypeScript type definitions

## Dependencies

This component depends on:
- `/components/element-look-and-feel/` - For resizable element functionality and format panel
- `/components/ui/button.tsx` - For the insert image button
- `lucide-react` - For icons

## Placeholder Features

- **Click to Upload**: Click anywhere on the placeholder to open file picker
- **Paste Support**: Focus the placeholder and use Cmd/Ctrl+V to paste images from clipboard
- **Drag and Drop**: Drag image files directly onto the placeholder
- **Visual States**: 
  - Default: Dashed gray border, gray background
  - Hover: Darker border
  - Dragging: Blue border and background
  - Focus: Blue ring outline

## Image Features

- Supports all common image formats (PNG, JPG, GIF, WebP, etc.)
- Automatic aspect ratio calculation and preservation
- Default max width of 400px (maintains aspect ratio)
- Image replaces placeholder once loaded
- Object-cover rendering for consistent display

## Element Properties

All image elements include:
- `id`: Unique identifier
- `type`: 'image'
- `src`: Image data URL (null for empty placeholder)
- `width`: Element width
- `height`: Element height
- `position`: { x, y } coordinates in workspace
- `size`: { width, height } dimensions
- `zIndex`: Stacking order
- `borderColor`: Border color (or 'transparent')
- `borderWidth`: Border width in pixels
- `fillColor`: Background fill color (or 'transparent')

## Workspace Interactions

- **Insert**: Click "Insert Image" button to create new placeholder
- **Select**: Hover near top-left corner to reveal select icon
- **Move**: Click and drag selected element
- **Resize**: Drag element borders
- **Aspect Ratio**: Drag bottom-right corner
- **Format**: Click format button to open Format Panel
- **Delete**: Click delete button on selected element
- **Undo Delete**: After deleting, an "Undo Delete" button appears at the deletion location for 2 minutes
- **Deselect**: Click outside element boundaries

## Notes

- Images are stored as base64 data URLs
- Placeholders are created at 400x300px by default
- Images automatically resize to maintain aspect ratio (max 400px width)
- Each placeholder can accept one image
- Elements maintain selection after all interactions
- Format Panel opens as a slide-out panel from the right
- Deleted elements can be restored within 2 minutes via the "Undo Delete" button
- Only the most recently deleted element can be undone

## Module Status

**FROZEN** - This module is complete and should not be modified unless explicitly requested.
