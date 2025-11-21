# Embedded Box Module

## Overview
A simplified content editing module with rich text formatting and hyperlink capabilities, but WITHOUT the element-look-and-feel system. This module provides the same rich text editing features as Insert Text but displays content in a fixed container with a white background, border, shadow, and rounded corners.

## Features

### Core Functionality
- **Rich Text Editing**: Uses contenteditable div for full HTML formatting support
- **Text Selection Actions**: Format and Hyperlink buttons appear when text is selected
- **Image Pasting**: Paste images directly into content boxes (Cmd/Ctrl+V)
- **Auto-resizing**: Automatically adjusts box size to accommodate pasted images
- **Cursor Preservation**: Text is typed at cursor position, not forced to start
- **Fixed Container**: No dragging, resizing, or element-look-and-feel features
- **Visible Box Styling**: White background, border, shadow, and rounded corners

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

### Differences from Insert Text Module
- **No Hover Selection**: No select icon appears on hover
- **No Dragging**: Elements cannot be moved around
- **No Resizing**: No resize handles or border dragging
- **No Format Panel**: No border color/width or fill color customization
- **No Auto-delete Undo**: No undo delete functionality
- **Fixed Styling**: Elements have a consistent white background, rounded corners, shadow, and gray border

### Differences from Embedded Content Module
- **Visible Box**: Has white background, border, shadow, and rounded corners (Embedded Content has transparent background and no border)

## Components

### EmbeddedBoxElement.tsx
Main content element component with:
- Contenteditable div for rich text support
- Text selection detection and button positioning
- Format and Hyperlink panel management
- Image paste handling
- Cursor position preservation
- HTML content storage and rendering
- Fixed container styling with visible box (white bg, border, shadow)

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

### EmbeddedBoxWorkspace.tsx
Workspace component managing:
- Content element creation
- Element updates
- Simple canvas with toolbar
- No selection or deletion features

### types.ts
TypeScript definitions:
```typescript
export interface EmbeddedBoxElement {
  id: string;
  type: 'embedded-box';
  text: string;              // Plain text content
  htmlContent?: string;      // Rich text HTML
  imageSrc?: string | null;  // Pasted image
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}
```

## Usage

### Basic Usage
```tsx
import { EmbeddedBoxWorkspace } from './components/embedded-box';

function App() {
  return <EmbeddedBoxWorkspace />;
}
```

### Text Formatting Workflow
1. Create a content box (appears with white background, border, and shadow)
2. Click inside and type text
3. Select any portion of text
4. Click "Format" button that appears above selection
5. Choose formatting options (font, size, color, styles)
6. Click "Apply Format"
7. Formatting is applied to selected text as HTML

### Hyperlink Workflow
1. Select text in a content box
2. Click "Hyperlink" button that appears above selection
3. Choose from three options:
   - Comment Box
   - Split View
   - New Page
4. Option is applied to selected text

### Image Pasting
1. Copy an image to clipboard
2. Click inside a content box
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

### Container Styling
Content boxes have fixed styling:
- White background (`bg-white`)
- Rounded corners (`rounded-lg`)
- Medium shadow (`shadow-md`)
- Gray border (`border border-gray-200`)
- 12px padding (`p-3`)

### Styling Storage
Text formatting is stored as inline styles in HTML:
```html
<span style="color: #DC2626; font-weight: bold; font-size: 18px;">
  Formatted text
</span>
```

## Comparison with Other Modules

| Feature | Insert Text | Embedded Box | Embedded Content |
|---------|------------|--------------|------------------|
| Rich Text Editing | ✅ | ✅ | ✅ |
| Text Formatting | ✅ | ✅ | ✅ |
| Hyperlink Menu | ✅ | ✅ | ✅ |
| Image Pasting | ✅ | ✅ | ✅ |
| Hover Selection | ✅ | ❌ | ❌ |
| Drag to Move | ✅ | ❌ | ❌ |
| Resize Handles | ✅ | ❌ | ❌ |
| Format Panel (borders/fill) | ✅ | ❌ | ❌ |
| Auto-delete Undo | ✅ | ❌ | ❌ |
| Visible Box Styling | ❌ | ✅ | ❌ |

## Use Cases

1. **Static Content Areas**: Display formatted content without interactive manipulation
2. **Embedded Widgets**: Content boxes that shouldn't be moved or resized
3. **Form Fields**: Rich text input areas with formatting but no element controls
4. **Comments**: Formatted comment boxes in a fixed layout with visible boundaries
5. **Documentation**: Embedded documentation with rich formatting in a defined box

## Best Practices

1. **Static Layout**: Use when content position is fixed and shouldn't change
2. **Plain Text Pasting**: Text from clipboard pastes as plain text (no unwanted formatting)
3. **Image Handling**: Images paste into the box and resize it automatically
4. **Selection Visibility**: Selected text stays highlighted while formatting panels are open
5. **Simple Canvas**: No complex interaction - just click and type

## Dependencies
- `lucide-react`: Icons (Type, Link, Bold, Italic, etc.)
- `../ui/button`: Button component
- `../ui/label`: Label component

## Module Status
This module provides the same rich text capabilities as Insert Text but without the element-look-and-feel system, and displays content in a visible box with white background, border, and shadow.

## Version
Current version: v1.0.0
Created: October 2025
