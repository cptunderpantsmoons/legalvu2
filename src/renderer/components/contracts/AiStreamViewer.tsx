import React from 'react';

export function AiStreamViewer({ content, active }: { content: string; active: boolean }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-700">AI Draft</h2>
        {active && (
          <span className="flex items-center gap-2 text-sm text-blue-600">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Streaming...
          </span>
        )}
      </div>

      {content ? (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
          {content}
          {active && <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />}
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Waiting for AI response...</p>
      )}
    </div>
  );
}
