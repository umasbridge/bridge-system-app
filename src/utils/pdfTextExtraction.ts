/**
 * PDF Text Extraction Utility
 * Extracts text content from PDF files using pdf.js
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface PDFPage {
  pageNumber: number;
  text: string;
}

export interface PDFExtractedContent {
  pages: PDFPage[];
  fullText: string;
  metadata: {
    title?: string;
    author?: string;
    numPages: number;
  };
}

/**
 * Extract text content from a PDF file
 * @param file - The PDF file to extract text from
 * @returns Extracted text content with page-by-page breakdown
 */
export async function extractTextFromPDF(file: File): Promise<PDFExtractedContent> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: PDFPage[] = [];
  const textParts: string[] = [];

  // Extract text from each page
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Reconstruct text with proper spacing
    let pageText = '';
    let lastY: number | null = null;

    for (const item of textContent.items) {
      if ('str' in item) {
        const textItem = item as { str: string; transform: number[] };
        const currentY = textItem.transform[5]; // Y position

        // Add newline if Y position changed significantly (new line)
        if (lastY !== null && Math.abs(currentY - lastY) > 5) {
          pageText += '\n';
        } else if (pageText && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          // Add space between words on same line
          pageText += ' ';
        }

        pageText += textItem.str;
        lastY = currentY;
      }
    }

    pages.push({
      pageNumber: i,
      text: pageText.trim()
    });

    textParts.push(pageText.trim());
  }

  // Get metadata
  const metadata = await pdf.getMetadata().catch(() => null);

  return {
    pages,
    fullText: textParts.join('\n\n--- Page Break ---\n\n'),
    metadata: {
      title: metadata?.info?.Title as string | undefined,
      author: metadata?.info?.Author as string | undefined,
      numPages: pdf.numPages
    }
  };
}

/**
 * Check if a PDF has extractable text (not just scanned images)
 * @param file - The PDF file to check
 * @returns true if PDF has text content, false if it appears to be scanned
 */
export async function hasExtractableText(file: File): Promise<boolean> {
  try {
    const content = await extractTextFromPDF(file);
    // Check if we got meaningful text (more than just whitespace)
    const meaningfulText = content.fullText.replace(/\s+/g, '').length;
    return meaningfulText > 100; // At least 100 non-whitespace characters
  } catch {
    return false;
  }
}
