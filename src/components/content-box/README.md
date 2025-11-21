# Content Box Module

A simple, reusable content box system for creating containers that can hold text, links, and files.

## Features

- **Draggable & Resizable**: Move and resize content boxes freely
- **Three Element Types**:
  - **Text Boxes**: Add and edit text content
  - **Links**: Insert clickable links with custom display text
  - **Files**: Upload and display images or PDF files
- **Layer Management**: Bring elements forward or send backward
- **Clean Interface**: Simple gray border with white background

## Components

### ContentBoxWorkspace
The main workspace component that manages multiple content boxes.

### ContentBox
Individual content box that contains elements and provides the action bar.

### TextBoxElement
Draggable, resizable text area for content.

### LinkElement
Clickable link element with edit functionality.

### FileElement
Image/PDF upload element with drag-to-position and resize capabilities.

## Usage

```tsx
import { ContentBoxWorkspace } from './components/content-box';

function App() {
  return <ContentBoxWorkspace />;
}
```

## Element Controls

Each content box has a bottom action bar with three buttons:
- **Add Text**: Creates a new text box element
- **Insert Link**: Creates a new link element
- **Upload File**: Creates a new file upload element

When selected, elements show additional controls:
- **Text**: Bring Forward, Send Backward, Delete
- **Link**: Edit, Delete
- **File**: Change Image, Delete

## Styling

Content boxes have:
- White background
- 2px gray border
- Blue outline when selected
- 16px padding around content

Elements have:
- Simple borders
- White backgrounds
- Blue ring when selected
