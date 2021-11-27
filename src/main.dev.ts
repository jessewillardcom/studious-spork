/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint global-require: off, no-console: off */
/* eslint-disable promise/always-return */

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
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  IpcMainEvent,
  shell,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { EXPRESS_ADDRESS, EXPRESS_PORT } from './constants';
import {
  MultimediaPlaylists,
  MultiVideoPlayer,
  PlaylistProps,
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

const playlistDir = `${HOME}/playlists/`;
if (!fs.existsSync(playlistDir)) {
  fs.mkdirSync(playlistDir);
}
const imagesPlaylistDir = `${playlistDir}images/`;
if (!fs.existsSync(imagesPlaylistDir)) {
  fs.mkdirSync(imagesPlaylistDir);
}
const videosPlaylistDir = `${playlistDir}videos/`;
if (!fs.existsSync(videosPlaylistDir)) {
  fs.mkdirSync(videosPlaylistDir);
}
const recentPlaylists = (type: string) => {
  const listDirectory =
    type === 'images' ? imagesPlaylistDir : videosPlaylistDir;
  try {
    const files = fs.readdirSync(listDirectory);
    return files
      .map((fileName) => {
        return {
          name: fileName,
          time: fs.statSync(`${listDirectory}${fileName}`).mtime.getTime(),
        };
      })
      .sort((a, b) => {
        return b.time - a.time;
      })
      .map((file) => {
        return file.name;
      })
      .filter((file) => {
        return file.indexOf('.json') > -1;
      });
    throw Error('Files not found');
  } catch (error) {
    return [];
  }
};

console.log('---------------------------------------');

const RECENT_PLAYLISTS = 10;
const imageRecentLists = recentPlaylists('images')
  .filter((_, n) => n < RECENT_PLAYLISTS)
  .map((fileName, n) => {
    const fileContents: Buffer = fs.readFileSync(
      `${imagesPlaylistDir}${fileName}`
    );
    const { list, title } = JSON.parse(fileContents.toString());
    return {
      list,
      title,
    };
  });

imageRecentLists.forEach((recent) => {
  console.log(recent.title);
  console.log(recent.list);
});

const videoRecentLists = recentPlaylists('videos')
  .filter((_, n) => n < RECENT_PLAYLISTS)
  .map((fileName) => {
    const fileContents: Buffer = fs.readFileSync(
      `${videosPlaylistDir}${fileName}`
    );
    const { list, title } = JSON.parse(fileContents.toString());
    return {
      list,
      title,
    };
  });

videoRecentLists.forEach((recent) => {
  console.log(recent.title);
  console.log(recent.list);
});

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
server.get('/imagePlaylist/:key', async (request: any, response: any) => {
  const { key } = request.params;
  // console.log('/imagePlaylist/:key', key);
  response.json(playlistTable.images[key].list);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
server.post('/imagePlaylist', async (request: any, response: any) => {
  const timestamp = Date.now();
  const { list, title }: PlaylistProps = request.body;
  playlistTable.images[timestamp] = {
    list,
    timestamp,
    title,
  };
  response.json({
    saved: [],
    success: true,
    timestamp,
    title,
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
server.get('/videoPlaylist/:key', async (request: any, response: any) => {
  const { key } = request.params;
  response.json(playlistTable.videos[key].list);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
server.post('/videoPlaylist', async (request: any, response: any) => {
  const timestamp = Date.now();
  const { list, title }: PlaylistProps = request.body;
  playlistTable.videos[timestamp] = {
    list,
    timestamp,
    title,
  };
  response.json({
    saved: [],
    success: true,
    timestamp,
    title,
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

ipcMain.on('loadImagePlaylist', (_: IpcMainEvent, playlist: string) => {
  dialog
    .showOpenDialog(mainWindow!, {
      defaultPath: imagesPlaylistDir,
      filters: [{ name: 'json', extensions: ['json'] }],
      properties: ['openFile'],
      title: 'Select a playlist to open',
    })
    .then((file) => {
      console.log(file.filePaths);
    })
    .catch(() => {});
});

ipcMain.on('loadVideoPlaylist', (_: IpcMainEvent, playlist: string) => {
  dialog
    .showOpenDialog(mainWindow!, {
      defaultPath: videosPlaylistDir,
      filters: [{ name: 'json', extensions: ['json'] }],
      properties: ['openFile'],
      title: 'Select a playlist to open',
    })
    .then((file) => {
      console.log(file.filePaths);
    })
    .catch(() => {});
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

const savePlaylist = (directory: string, playlist: Record<string, string>) => {
  return dialog
    .showSaveDialog({
      title: 'Select the File Path to save',
      defaultPath: `${directory}/${playlist.title}.json`,
      buttonLabel: 'Save',
      filters: [
        {
          name: 'Playlists',
          extensions: ['json'],
        },
      ],
      properties: [],
    })
    .then((file) => {
      if (!file.canceled)
        fs.writeFileSync(String(file.filePath), JSON.stringify(playlist));
    })
    .catch((error) => {
      console.log(error.message);
    });
};

ipcMain.on(
  'saveImagePlaylist',
  (_: IpcMainEvent, playlist: Record<string, string>) => {
    savePlaylist(imagesPlaylistDir, playlist);
  }
);

ipcMain.on(
  'saveVideoPlaylist',
  (_: IpcMainEvent, playlist: Record<string, string>) => {
    savePlaylist(videosPlaylistDir, playlist);
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
