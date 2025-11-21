# Upload File Component

A frozen, reusable module that provides file upload functionality with support for images and PDFs. Files are rendered as workspace elements with full formatting capabilities through the element-look-and-feel system.

## Features

- **File Upload**: Upload images (PNG, JPG, GIF, etc.) and PDF documents
- **PDF Navigation**: Multi-page PDF support with page-by-page navigation
- **Direct Rendering**: Files render directly in the workspace without wrapper boxes
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

## Usage

### Basic Implementation

```tsx
import { UploadFileWorkspace } from './components/upload-file';

function App() {
  return <UploadFileWorkspace />;
}
```

### Component Structure

- **UploadFileWorkspace**: Main workspace component with upload button and canvas
- **ImageElement**: Renders uploaded images with formatting
- **PdfElement**: Renders PDF pages with navigation controls
- **types.ts**: TypeScript type definitions

## Dependencies

This component depends on:
- `/components/element-look-and-feel/` - For resizable element functionality and format panel
- `/components/ui/button.tsx` - For the upload button
- `pdfjs-dist` - For PDF rendering
- `lucide-react` - For icons

## PDF Features

- Converts all PDF pages to images on upload
- Compact page navigation bar at the bottom of each PDF element
- Page counter shows current/total pages (e.g., "2/56")
- Navigation buttons for previous/next pages
- Maintains original PDF aspect ratio

## Image Features

- Supports all common image formats
- Click-to-upload placeholder state
- Paste support (Cmd/Ctrl+V)
- Automatic aspect ratio calculation
- Direct rendering with formatting options

## Element Properties

All elements include:
- `id`: Unique identifier
- `type`: 'image' or 'pdf'
- `position`: { x, y } coordinates in workspace
- `size`: { width, height } dimensions
- `zIndex`: Stacking order
- `borderColor`: Border color (or 'transparent')
- `borderWidth`: Border width in pixels
- `fillColor`: Background fill color (or 'transparent')

## Workspace Interactions

- **Select**: Hover near top-left corner to reveal select icon
- **Move**: Click and drag selected element
- **Resize**: Drag element borders
- **Aspect Ratio**: Drag bottom-right corner
- **Format**: Click format button to open Format Panel
- **Delete**: Click delete button on selected element
- **Deselect**: Click outside element boundaries

## Notes

- PDFs are processed client-side using PDF.js
- All pages are pre-rendered as images for smooth navigation
- Default element sizes: Images (400px max width), PDFs (560x400)
- Elements maintain selection after resize operations
- Format Panel opens as a slide-out panel from the right
