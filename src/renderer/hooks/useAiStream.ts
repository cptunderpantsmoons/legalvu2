import { useEffect, useRef, useCallback } from 'react';
import { useContractStore } from '../stores/contract-store';
import type { Contract } from '../../shared/types';

export function useAiStream() {
  const store = useContractStore();
  const cleanupRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    const unsubChunk = window.electronAPI.onAiStreamChunk((chunk: string) => {
      store.appendStreamChunk(chunk);
    });
    const unsubDone = window.electronAPI.onAiStreamDone((contract: Contract) => {
      store.setStreamingActive(false);
      store.setSelected(contract);
    });
    const unsubError = window.electronAPI.onAiStreamError((error: string) => {
      store.setStreamingActive(false);
      store.setError(error);
    });

    cleanupRef.current = [unsubChunk, unsubDone, unsubError];

    return () => {
      cleanupRef.current.forEach((fn) => fn());
    };
  }, []);

  const startStream = useCallback(
    async (payload: { provider: 'openai' | 'anthropic'; model: string; input: import('../../shared/types').ContractPromptInput }) => {
      store.setStreamingActive(true);
      store.setStreamingContent('');
      store.setError(null);

      const result = await window.electronAPI.contractStreamStart(payload);
      if (result.error) {
        store.setStreamingActive(false);
        store.setError(result.error);
      }
      return result;
    },
    [],
  );

  const cancelStream = useCallback(async () => {
    await window.electronAPI.contractStreamCancel();
    store.setStreamingActive(false);
  }, []);

  return { startStream, cancelStream };
}
