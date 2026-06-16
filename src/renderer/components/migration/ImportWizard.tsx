import React, { useState, useRef } from 'react';

interface ImportResult {
  ok: boolean;
  contractsImported?: number;
  filesImported?: number;
  usersCreated?: number;
  errors?: Array<{ row: number; message: string }>;
  skipped?: number;
  error?: string;
}

export function ImportWizard({ onComplete }: { onComplete?: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setImporting(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const importResult = await window.electronAPI.lawvuImport({ zipBase64: base64 });
      setImporting(false);
      setResult(importResult);
      if (importResult.ok && (importResult.contractsImported ?? 0) > 0) {
        onComplete?.();
      }
    };
    reader.onerror = () => {
      setImporting(false);
      setResult({ ok: false, error: 'Failed to read file' });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.zip') || file.name.endsWith('.ZIP'))) {
      handleFile(file);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-slate-700 mb-2">Lawvu Bulk Import</h2>
      <p className="text-sm text-gray-500 mb-4">
        Upload a Lawvu admin export (.zip) containing Contracts.txt, MatterFields.txt, and a Files/ directory.
        All contracts will be imported with full lifecycle tracking.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {importing ? (
          <div>
            <p className="text-blue-600 font-medium">Importing {fileName}...</p>
            <p className="text-sm text-gray-400 mt-1">Parsing contracts and linking files</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 font-medium">
              {fileName ? `Selected: ${fileName}` : 'Drop Lawvu export .zip here'}
            </p>
            <p className="text-sm text-gray-400 mt-1">or click to browse</p>
          </div>
        )}
      </div>

      {result && (
        <div className="mt-4">
          {result.ok ? (
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600 font-semibold">✓ Import complete</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Contracts:</span>{' '}
                  <span className="font-semibold text-gray-800">{result.contractsImported ?? 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Files:</span>{' '}
                  <span className="font-semibold text-gray-800">{result.filesImported ?? 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Users created:</span>{' '}
                  <span className="font-semibold text-gray-800">{result.usersCreated ?? 0}</span>
                </div>
              </div>
              {(result.skipped ?? 0) > 0 && (
                <p className="text-sm text-amber-600 mt-2">{result.skipped} row(s) skipped</p>
              )}
              {result.errors && result.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="text-sm text-red-500 cursor-pointer">
                    {result.errors.length} error(s) during import
                  </summary>
                  <div className="mt-2 max-h-40 overflow-auto">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-600">
                        Row {err.row}: {err.message}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-red-600 font-semibold">✗ Import failed</p>
              <p className="text-sm text-red-500 mt-1">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
