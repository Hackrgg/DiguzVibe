'use strict';

const { app, BrowserWindow, session } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');
app.commandLine.appendSwitch('disable-web-security');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'DIGUZ Vibe Coder',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
    backgroundColor: '#f6efe3',
    show: false,
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': ['same-origin'],
        'Cross-Origin-Embedder-Policy': ['require-corp'],
      },
    });
  });

  win.once('ready-to-show', () => win.show());
  win.loadURL('http://localhost:5173');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
