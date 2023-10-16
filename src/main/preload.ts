// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels =
  | 'ipc-example'
  | 'wxlive-event'
  | 'wxlive-status'
  | 'wxlive-set-all-config'
  | 'wxlive-set-config'
  | 'electron-baidu-tongji-reply'
  | 'electron-baidu-tongji-message'
  | 'wxlive-debug';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    getConfig: (key: string) => ipcRenderer.invoke('wxlive-get-config', key),
    getForwardUrl: () => ipcRenderer.invoke('wxlive-get-forward-url'),
    openExternalLink: (url: string) => ipcRenderer.invoke('wxlive-open-external-link', url),
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
