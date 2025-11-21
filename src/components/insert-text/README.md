# Insert Text Module

## Overview
A complete text editing module with rich text formatting, hyperlink capabilities, and full element-look-and-feel integration. Supports both text typing and image pasting (Cmd/Ctrl+V) with automatic resizing.

## Features

### Core Functionality
- **Rich Text Editing**: Uses contenteditable div for full HTML formatting support
- **Text Selection Actions**: Format and Hyperlink buttons appear when text is selected
- **Image Pasting**: Paste images directly into text boxes (Cmd/Ctrl+V)
- **Auto-resizing**: Automatically adjusts box size to accommodate pasted images
- **Cursor Preservation**: Text is typed at cursor position, not forced to start
- **Element Integration**: Full element-look-and-feel with hover selection, dragging, and resizing

### Text Formatting (TextFormatPanel)
When text is selected, clicking "Format" opens a comprehensive formatting panel:

- **Font Family**: Arial, Times New Roman, Courier New, Georgia, Verdana, Comic Sans MS, Trebuchet MS, Impact
- **Font Size**: 10px to 48px
- **Text Styles**: Bold, Italic, Underline, Strikethrough (combinable)
- **Text Color**: Preset colors + custom color picker
- **Highlight**: Background color with transparency options
- **Live Preview**: Selected text remains visible while formatting
- **Apply Button**: Confirms and applies formatting to selected text

### Hyperlink Options (HyperlinkMenu)
When text is selected, clicking "Hyperlink" shows three options:

1. **Comment Box**: Link text to a comment
2. **Split View**: Open content in split view
3. **New Page**: Navigate to a new page
4. **Close Button**: X button in top-right for easy dismissal

### Element Look and Feel
- **Hover Selection**: Select icon appears above top-left corner when hovering (non-intrusive)
- **Drag to Move**: Click and drag selected elements
- **Border Resizing**: Drag borders to resize width/height
- **Corner Resizing**: Drag bottom-right corner to resize with aspect ratio
- **Selection Persistence**: Elements stay selected after resize operations
- **Format Panel**: Customize border color, width, and fill color
- **Auto-delete Undo**: 2-minute undo button appears at deletion location

## Components

### TextElement.tsx
Main text element component with:
- Contenteditable div for rich text support
- Text selection detection and button positioning
- Format and Hyperlink panel management
- Image paste handling
- Cursor position preservation
- HTML content storage and rendering

### TextFormatPanel.tsx
Comprehensive text formatting panel featuring:
- Font family dropdown (8 fonts)
- Font size dropdown (11 sizes)
- Style buttons (Bold, Italic, Underline, Strikethrough)
- Color picker with presets and custom input
- Highlight color with transparency
- Selected text preview
- Apply and close functionality

### HyperlinkMenu.tsx
Hyperlink options menu with:
- Comment Box option
- Split View option
- New Page option
- Selected text preview
- Close button in header

### InsertTextWorkspace.tsx
Workspace component managing:
- Text element creation and lifecycle
- Element selection and deselection
- Auto-delete undo system
- Canvas click handling
- Format panel integration

### types.ts
TypeScript definitions:
```typescript
export interface TextElement {
  id: string;
  type: 'text';
  text: string;              // Plain text content
  htmlContent?: string;      // Rich text HTML
  imageSrc?: string | null;  // Pasted image
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  borderColor: string;
  borderWidth: number;
  fillColor: string;
}
```

## Usage

### Basic Usage
```tsx
import { InsertTextWorkspace } from './components/insert-text';

function App() {
  return <InsertTextWorkspace />;
}
```

### Text Formatting Workflow
1. Create a text box (appears at center with default styling)
2. Click inside and type text
3. Select any portion of text
4. Click "Format" button that appears above selection
5. Choose formatting options (font, size, color, styles)
6. Click "Apply Format"
7. Formatting is applied to selected text as HTML

### Hyperlink Workflow
1. Select text in a text box
2. Click "Hyperlink" button that appears above selection
3. Choose from three options:
   - Comment Box
   - Split View
   - New Page
4. Option is applied to selected text

### Image Pasting
1. Copy an image to clipboard
2. Click inside a text box
3. Press Cmd/Ctrl+V
4. Image appears inside the box
5. Box auto-resizes to fit image + text

## Technical Details

### Rich Text Implementation
- Uses `contenteditable` div instead of textarea
- Stores both plain text (`text`) and HTML (`htmlContent`)
- Applies formatting by wrapping selection in `<span>` with inline styles
- Preserves cursor position using `isInternalUpdate` ref flag
- Prevents React re-renders that reset cursor position

### Selection Management
- Saves selection range before opening format/hyperlink panels
- Restores selection when applying formatting
- Uses `window.getSelection()` API for precise control
- Supports combined decorations (underline + strikethrough)

### Styling Storage
Text formatting is stored as inline styles in HTML:
```html
<span style="color: #DC2626; font-weight: bold; font-size: 18px;">
  Formatted text
</span>
```

## Integration Notes

### Element Look and Feel
This module uses the frozen `element-look-and-feel` module at `/components/element-look-and-feel/`:
- ResizableElement component for all interactions
- FormatPanel for border/fill customization
- Hover-based selection (icon appears above element)
- Auto-delete undo functionality

### Dependencies
- `lucide-react`: Icons (Type, Link, Bold, Italic, etc.)
- `../ui/button`: Button component
- `../ui/label`: Label component
- `../element-look-and-feel`: Core element system

## Best Practices

1. **Not Auto-selected**: Elements are NOT selected by default - users must hover and click
2. **No Wrapper Boxes**: Text elements render directly without container boxes
3. **Plain Text Pasting**: Text from clipboard pastes as plain text (no unwanted formatting)
4. **Image Handling**: Images paste into the box and resize it automatically
5. **Selection Visibility**: Selected text stays highlighted while formatting panels are open

## Frozen Module
This module is **frozen** and working correctly. The complete functionality includes:
- Rich text editing with contenteditable
- Text formatting (font, size, color, styles)
- Hyperlink options menu
- Image pasting capability
- Full element-look-and-feel integration
- Auto-delete undo system

All features are production-ready and should not be modified unless explicitly requested.

## Version
Current version: v2.0.0 (Rich Text Edition)
Last updated: October 2025
