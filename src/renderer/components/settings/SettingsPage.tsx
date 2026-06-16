import React, { useState, useEffect } from 'react';
import type { AIProvider } from '../../../shared/types';
import { ImportWizard } from '../migration/ImportWizard';

export function SettingsPage() {
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [model, setModel] = useState('gpt-4');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const config = await window.electronAPI.settingsGetAiConfig();
    if (config) {
      setProvider(config.provider);
      setModel(config.model);
      setBaseUrl(config.baseUrl || '');
      setHasKey(config.hasKey);
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await window.electronAPI.settingsSetAiConfig({ provider, model, baseUrl });
      setMessage({ type: 'success', text: 'Configuration saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async () => {
    if (!apiKey) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await window.electronAPI.settingsSetAiKey({ apiKey });
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setApiKey('');
        setHasKey(true);
        setMessage({ type: 'success', text: 'API key stored securely.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Settings</h1>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">AI Configuration</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AIProvider)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4, claude-3-sonnet, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base URL <span className="text-gray-400">(optional — leave empty for default)</span>
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Override to use Azure OpenAI, AWS Bedrock, or a self-hosted endpoint.
            </p>
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Save Configuration
          </button>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">API Key</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {hasKey ? 'Update API Key' : 'Set API Key'}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? '•••••••••••• (key stored)' : 'Enter your API key'}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Stored encrypted via OS keychain. Never sent to the renderer after setting.
            </p>
          </div>
          <button
            onClick={handleSaveKey}
            disabled={loading || !apiKey}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {hasKey ? 'Update Key' : 'Store Key'}
          </button>
        </div>
      </section>

      {message && (
        <div
          className={`px-4 py-3 rounded ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="mt-6">
        <ImportWizard />
      </section>
    </div>
  );
}
