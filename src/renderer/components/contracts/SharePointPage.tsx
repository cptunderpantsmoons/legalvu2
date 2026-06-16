import React, { useState, useEffect } from 'react';

interface SpFileEntry {
  name: string;
  url?: string;
  isFolder: boolean;
  size?: string;
  modified?: string;
}

interface SpConnection {
  siteUrl: string;
  libraryPath: string;
  syncEnabled: boolean;
  hasCookies: boolean;
  lastError?: string;
  lastSyncAt?: number;
}

export function SharePointPage() {
  const [connection, setConnection] = useState<SpConnection | null>(null);
  const [siteUrl, setSiteUrl] = useState('');
  const [libraryPath, setLibraryPath] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [files, setFiles] = useState<SpFileEntry[]>([]);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConnection();
  }, []);

  const loadConnection = async () => {
    const conn = await window.electronAPI.spGetConnection();
    if (conn) {
      setConnection(conn);
      setSiteUrl(conn.siteUrl);
      setLibraryPath(conn.libraryPath);
      setSyncEnabled(conn.syncEnabled);
      if (conn.hasCookies && conn.siteUrl) {
        checkSession(conn.siteUrl);
      }
    }
  };

  const handleSaveConnection = async () => {
    setLoading(true);
    const result = await window.electronAPI.spSetConnection({ siteUrl, libraryPath, syncEnabled });
    setLoading(false);
    if (result.ok) {
      setMessage({ type: 'success', text: 'SharePoint connection saved.' });
      loadConnection();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save connection.' });
    }
  };

  const handleLogin = async () => {
    if (!siteUrl) {
      setMessage({ type: 'error', text: 'Enter a SharePoint site URL first.' });
      return;
    }
    setLoading(true);
    setMessage({ type: 'info', text: 'Opening browser for SharePoint login...' });
    const result = await window.electronAPI.spLogin(siteUrl);
    setLoading(false);
    if (result.success) {
      setMessage({ type: 'success', text: `Logged in. Captured ${result.cookiesCaptured} cookies.` });
      setSessionValid(true);
    } else {
      setMessage({ type: 'error', text: result.error || 'Login failed.' });
    }
  };

  const checkSession = async (url: string) => {
    const result = await window.electronAPI.spCheckSession(url);
    setSessionValid(result.valid);
  };

  const handleBrowse = async () => {
    if (!siteUrl || !libraryPath) {
      setMessage({ type: 'error', text: 'Enter both site URL and library path.' });
      return;
    }
    setLoading(true);
    setMessage({ type: 'info', text: 'Browsing SharePoint library...' });
    const result = await window.electronAPI.spBrowse({ siteUrl, libraryPath });
    setLoading(false);
    if (result.success && result.files) {
      setFiles(result.files);
      setMessage({ type: 'success', text: `Found ${result.files.length} items.` });
    } else if (result.error?.includes('Session expired')) {
      setMessage({ type: 'error', text: 'Session expired. Please log in again.' });
      setSessionValid(false);
      setFiles([]);
    } else {
      setMessage({ type: 'error', text: result.error || 'Browse failed.' });
      setFiles([]);
    }
  };

  const handleDownload = async (fileName: string) => {
    setLoading(true);
    setMessage({ type: 'info', text: `Downloading ${fileName}...` });
    const result = await window.electronAPI.spDownload({
      siteUrl,
      fileName,
      localDir: `${siteUrl.replace(/\/$/, '')}/downloads`,
    });
    setLoading(false);
    if (result.success) {
      setMessage({ type: 'success', text: `Downloaded to ${result.localPath}` });
    } else {
      setMessage({ type: 'error', text: result.error || 'Download failed.' });
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">SharePoint</h1>
      <p className="text-gray-500 mb-6">Browser-based SharePoint integration — no API keys required</p>

      {/* Connection Settings */}
      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Connection Settings</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SharePoint Site URL</label>
            <input
              type="url"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://tenant.sharepoint.com/sites/legal"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Library Path</label>
            <input
              type="text"
              value={libraryPath}
              onChange={(e) => setLibraryPath(e.target.value)}
              placeholder="/sites/legal/Shared Documents"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={syncEnabled}
              onChange={(e) => setSyncEnabled(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Enable automatic sync</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleSaveConnection}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              Save Connection
            </button>
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Authentication</h2>
        <div className="flex items-center gap-4 mb-4">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              sessionValid === true
                ? 'bg-green-100 text-green-800'
                : sessionValid === false
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                sessionValid === true ? 'bg-green-500' : sessionValid === false ? 'bg-red-500' : 'bg-gray-400'
              }`}
            />
            {sessionValid === true ? 'Authenticated' : sessionValid === false ? 'Session Expired' : 'Not Connected'}
          </span>
          {connection?.lastSyncAt && (
            <span className="text-xs text-gray-400">
              Last sync: {new Date(connection.lastSyncAt).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleLogin}
            disabled={loading || !siteUrl}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {loading ? 'Opening browser...' : 'Login to SharePoint'}
          </button>
          <button
            onClick={() => checkSession(siteUrl)}
            disabled={!siteUrl}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 text-sm"
          >
            Check Session
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Opens a browser window for you to log in with your SharePoint credentials. Cookies are captured and encrypted locally.
        </p>
      </section>

      {/* File Browser */}
      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-700">Library Browser</h2>
          <button
            onClick={handleBrowse}
            disabled={loading || !siteUrl || !libraryPath}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm"
          >
            {loading ? 'Browsing...' : 'Browse Files'}
          </button>
        </div>

        {files.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Name</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Size</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Modified</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.map((file, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-800">
                      {file.isFolder ? '📁 ' : '📄 '}
                      {file.name}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">{file.size || '—'}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{file.modified || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      {!file.isFolder && (
                        <button
                          onClick={() => handleDownload(file.name)}
                          disabled={loading}
                          className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                        >
                          Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            Click "Browse Files" to list documents from your SharePoint library.
          </p>
        )}
      </section>

      {message && (
        <div
          className={`px-4 py-3 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : message.type === 'error'
                ? 'bg-red-50 text-red-700'
                : 'bg-blue-50 text-blue-700'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
