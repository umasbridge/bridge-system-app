/**
 * Upload System Doc Dialog
 * Uploads PDF, extracts text, parses with Claude, creates full system hierarchy
 */

import { useState, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { extractTextFromPDF, hasExtractableText } from '../../utils/pdfTextExtraction';
import { parseSystemDocument, validateParsedSystem, countParsedElements, type ParseProgress } from '../../utils/claudeSystemParser';
import { importParsedSystem } from '../../utils/systemDocImport';

interface UploadSystemDocDialogProps {
  onClose: () => void;
  onImportComplete: (workspaceId: string) => void;
}

type Stage = 'upload' | 'processing' | 'complete' | 'error';

const STAGE_MESSAGES: Record<string, string> = {
  uploading: 'Uploading PDF...',
  extracting: 'Extracting text from PDF...',
  analyzing: 'Analyzing structure with AI...',
  creating: 'Creating workspaces...',
  building: 'Building tables...',
  generating: 'Generating practice rules...',
  complete: 'Import complete!',
  error: 'Import failed'
};

export function UploadSystemDocDialog({ onClose, onImportComplete }: UploadSystemDocDialogProps) {
  const [stage, setStage] = useState<Stage>('upload');
  const [systemName, setSystemName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ParseProgress>({
    stage: 'uploading',
    progress: 0,
    message: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    chapters: number;
    tables: number;
    textBoxes: number;
    bids: number;
  } | null>(null);
  const [resultWorkspaceId, setResultWorkspaceId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.includes('pdf')) {
      setError('Please select a PDF file');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Auto-populate system name from filename (remove .pdf extension)
    const name = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
    setSystemName(name);
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropAreaRef.current?.classList.add('border-blue-500', 'bg-blue-50');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropAreaRef.current?.classList.remove('border-blue-500', 'bg-blue-50');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropAreaRef.current?.classList.remove('border-blue-500', 'bg-blue-50');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Progress callback
  const handleProgress = useCallback((p: ParseProgress) => {
    setProgress(p);
    if (p.stage === 'error') {
      setStage('error');
      setError(p.message);
    }
  }, []);

  // Main import process
  const handleImport = async () => {
    if (!selectedFile || !systemName.trim()) return;

    setStage('processing');
    setError(null);

    try {
      // Step 1: Check if PDF has extractable text
      handleProgress({ stage: 'uploading', progress: 5, message: 'Checking PDF...' });

      const hasText = await hasExtractableText(selectedFile);
      if (!hasText) {
        throw new Error('This PDF appears to be a scanned image without extractable text. Please use a PDF with text content.');
      }

      // Step 2: Extract text from PDF
      handleProgress({ stage: 'extracting', progress: 15, message: 'Extracting text from PDF...' });

      const extracted = await extractTextFromPDF(selectedFile);

      if (!extracted.fullText || extracted.fullText.length < 100) {
        throw new Error('Could not extract enough text from this PDF. The document may be scanned or have very little content.');
      }

      handleProgress({ stage: 'extracting', progress: 30, message: `Extracted ${extracted.metadata.numPages} pages` });

      // Step 3: Parse with Claude API
      handleProgress({ stage: 'analyzing', progress: 35, message: 'Analyzing structure with AI...' });

      const parsed = await parseSystemDocument(
        extracted.fullText,
        systemName.trim(),
        handleProgress
      );

      // Validate parsed result
      const validation = validateParsedSystem(parsed);
      if (!validation.valid) {
        throw new Error(`Document parsing failed: ${validation.errors.join(', ')}`);
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        console.warn('Parse warnings:', validation.warnings);
      }

      // Step 4: Import into database
      handleProgress({ stage: 'creating', progress: 72, message: 'Creating workspaces...' });

      const result = await importParsedSystem(parsed, handleProgress);

      // Count elements for summary
      const counts = countParsedElements(parsed);

      setImportResult({
        chapters: counts.chapters,
        tables: counts.tables,
        textBoxes: counts.textBoxes,
        bids: counts.totalBids
      });
      setResultWorkspaceId(result.systemWorkspaceId);
      setStage('complete');

    } catch (err) {
      console.error('Import failed:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
      setStage('error');
    }
  };

  // Handle completion
  const handleComplete = () => {
    if (resultWorkspaceId) {
      onImportComplete(resultWorkspaceId);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-lg shadow-2xl flex flex-col"
        style={{ width: '600px', minHeight: '400px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">Upload System Document</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload a PDF of your bidding system and we'll create the full structure
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {stage === 'upload' && (
            <div className="space-y-6">
              {/* File Drop Area */}
              <div
                ref={dropAreaRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors duration-200
                  ${selectedFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleInputChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-12 h-12 text-green-600" />
                    <p className="text-lg font-medium text-green-700">{selectedFile.name}</p>
                    <p className="text-sm text-green-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Click to change file</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-12 h-12 text-gray-400" />
                    <p className="text-lg text-gray-600">Drop your PDF here</p>
                    <p className="text-sm text-gray-400">or click to browse</p>
                  </div>
                )}
              </div>

              {/* System Name Input */}
              <div className="space-y-2">
                <Label htmlFor="system-name" className="text-sm font-medium">
                  System Name
                </Label>
                <Input
                  id="system-name"
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  placeholder="e.g., 2/1 Game Force, Standard American"
                  className="h-10"
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}

          {stage === 'processing' && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {STAGE_MESSAGES[progress.stage] || progress.message}
              </p>
              <p className="text-sm text-gray-500 mb-4">{progress.message}</p>

              {/* Progress Bar */}
              <div className="w-full max-w-md bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">{progress.progress}%</p>
            </div>
          )}

          {stage === 'complete' && importResult && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Import Successful!</h3>
              <p className="text-gray-600 mb-6">Your bidding system has been created</p>

              <div className="bg-gray-50 rounded-lg p-4 w-full max-w-sm">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{importResult.chapters}</p>
                    <p className="text-sm text-gray-500">Chapters</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{importResult.tables}</p>
                    <p className="text-sm text-gray-500">Tables</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{importResult.textBoxes}</p>
                    <p className="text-sm text-gray-500">Text Boxes</p>
                  </div>
                </div>
                <div className="text-center mt-4 pt-4 border-t border-gray-200">
                  <p className="text-2xl font-bold text-green-600">{importResult.bids}</p>
                  <p className="text-sm text-gray-500">Bidding Sequences</p>
                </div>
              </div>
            </div>
          )}

          {stage === 'error' && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Import Failed</h3>
              <p className="text-red-600 text-center max-w-md">{error}</p>
              <Button
                onClick={() => {
                  setStage('upload');
                  setError(null);
                  setProgress({ stage: 'uploading', progress: 0, message: '' });
                }}
                variant="outline"
                className="mt-6"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          {stage === 'upload' && (
            <>
              <Button onClick={onClose} variant="outline" className="px-8">
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!selectedFile || !systemName.trim()}
                style={{
                  backgroundColor: (!selectedFile || !systemName.trim()) ? '#9ca3af' : '#16a34a',
                  color: 'white',
                  opacity: 1
                }}
                className="px-8 hover:bg-green-700"
              >
                Import System
              </Button>
            </>
          )}

          {stage === 'processing' && (
            <Button onClick={onClose} variant="outline" className="px-8" disabled>
              Processing...
            </Button>
          )}

          {stage === 'complete' && (
            <Button
              onClick={handleComplete}
              className="px-8 bg-blue-600 hover:bg-blue-700"
            >
              Open System
            </Button>
          )}

          {stage === 'error' && (
            <Button onClick={onClose} variant="outline" className="px-8">
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
