import { contextBridge, ipcRenderer } from 'electron';

const api = {
  ping: () => ipcRenderer.invoke('ping'),
  generateContract: (payload: unknown) => ipcRenderer.invoke('contract:generate', payload),
  fetchContract: (id: string) => ipcRenderer.invoke('contract:fetch', id),
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
