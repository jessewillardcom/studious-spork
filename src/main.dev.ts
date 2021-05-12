/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build:main`, this file is compiled to
 * `./src/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import fs from 'fs';
import path from 'path';
import { app, BrowserWindow, ipcMain, IpcMainEvent, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';;

// File server built in
const HOME_PATH = app.getPath('home');
var bodyParser = require('body-parser')
var express = require("express");
var server = express();
server.use('/', express.static(HOME_PATH));
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({
  extended: true
}));

//:TODO:: Save the playlist to database
server.post('/playlist', (request: any, response: any) => {
  console.log('POST /playlist', request.body);
  //:TODO:: Save unique playlist and return it to the client
  fs.writeFileSync(path.resolve(__dirname, 'playlist.json'), JSON.stringify(request.body) );
  response.json({ success: true});
});

server.listen(8080, '127.0.0.1', function(){
  console.log(">>> Web server started >>", HOME_PATH);
});
//:TODO:: Allow served folder to be changed
//server.close() //<---Shut down then restart server


export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
    },
  });

  mainWindow.loadURL(`file://${__dirname}/index.html?home=${HOME_PATH}`);

  let singleWindows: Record<string, BrowserWindow> = {};

  interface VideoSingle {
    width: number;
    height: number;
    video: string;
  }

  ipcMain.on('playVideoSingle', (_: IpcMainEvent, { width, height, video }: VideoSingle  ) => {
    if ( singleWindows[video] !== undefined ) singleWindows[video].close()
    singleWindows[video] = new BrowserWindow({ width, height, webPreferences: { devTools: false } });
    singleWindows[video].loadURL(`file://${__dirname}/videoSingle.html?url=${video}`);
    singleWindows[video].focus();
    singleWindows[video].on('close', function() {
      delete singleWindows[video];
    });
  });

  interface VideoMulti {
    width: number;
    height: number;
    videos: string[];
  }

  let count = 0;
  let multiWindows: BrowserWindow[] = [];

  ipcMain.on('playVideoMulti', (_: IpcMainEvent, { width, height, videos }: VideoMulti  ) => {
    console.log('playVideoMulti', width, height, videos);
    multiWindows[count] = new BrowserWindow({ width, height, webPreferences: { devTools: false } });
    const videolist = videos.map((url)=> url).join(':');
    multiWindows[count].loadURL(`file://${__dirname}/videoMulti.html?urls=${videolist}`);
    count++;
  });


  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(createWindow).catch(console.log);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
