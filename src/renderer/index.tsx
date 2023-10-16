import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/electron/renderer';
import log from 'electron-log';
import App from './App';

Sentry.init({
  dsn: 'https://fcbeb5b02f692b5f81995d7f07dbd4d5@o4506054030721024.ingest.sentry.io/4506054034784256',
});
const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);
log.info('Log from the renderer process');
// calling IPC exposed from preload script
window.electron.ipcRenderer.once('ipc-example', (arg) => {
  log.info(arg);
});

const BAIDU_SITE_ID = '9cbc91a7ca7ce2180c60fb203a9b3bdf';
window.electron.ipcRenderer.on('electron-baidu-tongji-reply', (text) => {
  const textStr = text as string;
  log.info(`electron-baidu-tongji-reply, ${`${textStr.slice(0, 10)}...`}}`);

  const hm = document.createElement('script');
  hm.text = textStr;

  const head = document.getElementsByTagName('head')[0];
  log.info('append script to head', head);
  head.appendChild(hm);
});
window.electron.ipcRenderer.sendMessage('electron-baidu-tongji-message', BAIDU_SITE_ID);

window.electron.ipcRenderer.on('wxlive-debug', (action) => {
  if (action === 'crash') {
    process.crash();
  }
  if (action === 'undefined-function') {
    // eslint-disable-next-line no-undef
    undefinedFunction();
  }
});
