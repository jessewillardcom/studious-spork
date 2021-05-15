/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build:main`, this file is compiled to
 * `./src/main.prod.js` using webpack. This gives us some performance wins.
 */

import fs from 'fs';
import path from 'path';
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { app, BrowserWindow, ipcMain, IpcMainEvent, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { EXPRESS_ADDRESS, EXPRESS_PORT } from './constants';
import {
  HttpPostPlaylist,
  MultimediaPlaylists,
  MultiVideoPlayer,
  SlideshowPlayer,
} from './main/main.interface';
import MenuBuilder from './menu';

// Create playlists directory if one doesn't already exist
// const PLAYLIST_ROOT = path.resolve(__dirname, 'playlists');
// if (!fs.existsSync(PLAYLIST_ROOT)) fs.mkdirSync(PLAYLIST_ROOT);

// const IMAGE_PLAYLIST = path.resolve(PLAYLIST_ROOT, 'images');
// if (!fs.existsSync(IMAGE_PLAYLIST)) fs.mkdirSync(IMAGE_PLAYLIST);

// const VIDEO_PLAYLIST = path.resolve(PLAYLIST_ROOT, 'videos');
// if (!fs.existsSync(VIDEO_PLAYLIST)) fs.mkdirSync(VIDEO_PLAYLIST);

// <-- Wait until boot up to load playlists
// Keep track of all the playlits in an array of timestamped files
// let savedImagePlaylists: string[];
// let savedVideoPlaylists: string[];
/*
const allSavedVideoPlaylists = (): string[] => {
  let playlistArray: string[] = [];
  try {
    playlistArray = fs.readdirSync(VIDEO_PLAYLIST);
  } catch (err) {
    console.error('getAllVideoPlaylists', err);
  }
  return playlistArray;
};
*/
// Serves files in the /User/ folder
const HOME = app.getPath('home');
const express = require('express');
const bodyParser = require('body-parser');

const server = express();
server.use('/', express.static(HOME));
server.use(bodyParser.json());
server.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// In memory, rather than persist every played list to disk
const playlistTable: MultimediaPlaylists = {
  images: {},
  videos: {},
};

const tracePlaylist = () => {
  Object.keys(playlistTable.images).forEach((timestamp) => {
    console.log(playlistTable.images[timestamp]);
  });
  Object.keys(playlistTable.videos).forEach((timestamp) => {
    console.log(playlistTable.videos[timestamp]);
  });
};

// const saveImagePlaylist = (passedKey: number) => {
//   const filename = `${passedKey}.json`;
//   fs.writeFileSync(
//     path.resolve(IMAGE_PLAYLIST, filename),
//     JSON.stringify(playlistTable.images[passedKey])
//   );
// };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
server.get('/imagePlaylist/:key', async (request: any, response: any) => {
  const { key } = request.params;
  // console.log('/imagePlaylist/:key', key);
  response.json(playlistTable.images[key].list);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
server.post('/imagePlaylist', async (request: any, response: any) => {
  // console.log('POST /imagePlaylist', request.body);
  const timestamp = Date.now();
  const { list, save, title }: HttpPostPlaylist = request.body;
  playlistTable.images[timestamp] = {
    list,
    title,
  };
  // if (save === true) saveImagePlaylist(timestamp);
  // savedImagePlaylists = allSavedVideoPlaylists();
  // tracePlaylist();
  response.json({
    saved: [],
    success: true,
    timestamp,
  });
});

// const saveVideoPlaylist = (passedKey: number) => {
//   const filename = `${passedKey}.json`;
//   fs.writeFileSync(
//     path.resolve(VIDEO_PLAYLIST, filename),
//     JSON.stringify(playlistTable.videos[passedKey])
//   );
// };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
server.get('/videoPlaylist/:key', async (request: any, response: any) => {
  const { key } = request.params;
  // console.log('/videoPlaylist/:key', key);
  response.json(playlistTable.videos[key].list);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
server.post('/videoPlaylist', async (request: any, response: any) => {
  const timestamp = Date.now();
  const { list, save, title }: HttpPostPlaylist = request.body;
  playlistTable.videos[timestamp] = {
    list,
    title,
  };
  // if (save === true) saveVideoPlaylist(timestamp);
  // savedVideoPlaylists = allSavedVideoPlaylists();
  // tracePlaylist();
  response.json({
    saved: [],
    success: true,
    timestamp,
  });
});

server.listen(EXPRESS_PORT, EXPRESS_ADDRESS, () => {
  console.log('>>> Web server started >>', HOME);
});
// :TODO:: Allow served folder to be changed
// server.close() //<---Shut down then restart server

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

const singleWindows: Record<string, BrowserWindow> = {};
let debounceImageEvent: NodeJS.Timeout;
let debounceVideoEvent: NodeJS.Timeout;

ipcMain.on('closeWindow', (_: IpcMainEvent, key: string) => {
  singleWindows[key].close();
});

ipcMain.on(
  'playSlideshow',
  (_: IpcMainEvent, { list, width, height }: SlideshowPlayer) => {
    if (singleWindows[list] !== undefined) singleWindows[list].close();
    clearTimeout(debounceImageEvent);
    debounceImageEvent = setTimeout(() => {
      singleWindows[list] = new BrowserWindow({
        width,
        height,
        frame: false,
        webPreferences: {
          devTools: false,
          nodeIntegration: true,
        },
      });
      singleWindows[list].loadURL(
        `file://${__dirname}/index.html?view=Slideshow&list=${list}`
      );
      singleWindows[list].focus();
      singleWindows[list].on('close', () => {
        delete singleWindows[list];
      });
    }, 100);
  }
);

ipcMain.on(
  'playVideoMulti',
  (_: IpcMainEvent, { list, width, height }: MultiVideoPlayer) => {
    if (singleWindows[list] !== undefined) singleWindows[list].close();
    clearTimeout(debounceVideoEvent);
    debounceVideoEvent = setTimeout(() => {
      singleWindows[list] = new BrowserWindow({
        width,
        height,
        frame: false,
        webPreferences: {
          devTools: false,
          nodeIntegration: true,
        },
      });
      singleWindows[list].loadURL(
        `file://${__dirname}/index.html?view=VideoMulti&list=${list}`
      );
      singleWindows[list].focus();
      singleWindows[list].on('close', () => {
        delete singleWindows[list];
      });
    }, 50);
  }
);

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

  mainWindow.loadURL(`file://${__dirname}/index.html?home=${HOME}`);

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
    Object.keys(singleWindows).forEach((value) => {
      delete singleWindows[value];
    });
    app.quit();
  }
});

app.whenReady().then(createWindow).catch(console.log);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
