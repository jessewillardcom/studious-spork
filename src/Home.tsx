/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable react/no-array-index-key */
/* eslint-disable promise/always-return */
/* eslint-disable react-hooks/exhaustive-deps */
import { ipcRenderer } from 'electron';
import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { PlaylistProps } from './_interfaces/main.interface';
import { SERVER } from './constants';
import './App.global.css';

const QUERY_STRING = new URLSearchParams(window.location.search);
const USER_FOLDER = QUERY_STRING.get('home') ?? '';

const MultiMedia = () => {
  const [fileType, setFileType] = useState('');
  const filePicker = useRef<HTMLInputElement | never>(null);

  const imageContainer = useRef<HTMLDivElement | never>(null);
  const [imageList, setImageList] = useState<string[] | never[]>([]);
  const [imagePlaylists, setImagePlaylists] = useState<
    Record<string, PlaylistProps>
  >({});

  const videoContainer = useRef<HTMLDivElement | never>(null);
  const [videoList, setVideoList] = useState<string[] | never[]>([]);
  const [videoPlaylists, setVideoPlaylists] = useState<
    Record<string, PlaylistProps>
  >({});

  const selectFiles = (type: string) => {
    if (filePicker?.current) {
      setImageList([]);
      setVideoList([]);
      setFileType(type);
      filePicker.current.value = '';
      filePicker.current.click();
    }
  };

  const noLocalPath = (localPath: string) => {
    return localPath?.split(USER_FOLDER)[1];
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const changeFiles = (event: any) => {
    const fileSet = event?.target?.files;
    if (fileSet.length > 0) {
      const fileArray: File[] = Object.values(fileSet);
      const urlPaths: string[] = fileArray.map((file: File) =>
        noLocalPath(file.path)
      );
      if (fileType === 'image') setImageList(urlPaths);
      if (fileType === 'video') setVideoList(urlPaths);
    }
  };

  const loadImagePlaylist = () => {
    ipcRenderer.send('loadImagePlaylist');
  };

  const loadVideoPlaylist = () => {
    ipcRenderer.send('loadVideoPlaylist');
  };

  const postPlaylist = async (playlist: string[], endpoint: string) => {
    const request = {
      playlist,
      title: '',
    };
    const response = await fetch(`${SERVER}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return response.json();
  };

  const measureImageNode = (passedVideoNode: HTMLImageElement) => {
    const vericalPadding = 30;
    const videoWidth = passedVideoNode.offsetWidth;
    const videoHeight = passedVideoNode.offsetHeight + vericalPadding;
    return [videoWidth, videoHeight];
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slideshowListener = async (event: any) => {
    const [videoWidth, videoHeight] = measureImageNode(event.target);
    const { timestamp } = await postPlaylist(imageList, '/imagePlaylist');
    ipcRenderer.send('playSlideshow', {
      list: timestamp,
      width: videoWidth,
      height: videoHeight,
    });
  };

  const removeImageNodes = () => {
    const imageElement = imageContainer.current;
    while (imageElement?.firstChild) {
      imageElement.removeEventListener('load', slideshowListener);
      imageElement.removeChild(imageElement.firstChild);
    } // Removes all child nodes then appends new video node
    return imageElement;
  };

  const replaceImageNode = (passedImageNode: HTMLImageElement) => {
    const parentElement = removeImageNodes();
    parentElement?.appendChild(passedImageNode);
  };

  const playImages = () => {
    const newImageNode = document.createElement('img');
    newImageNode.setAttribute('src', `${SERVER}${imageList[0]}`);
    newImageNode.addEventListener('load', slideshowListener);
    replaceImageNode(newImageNode);
  };

  useEffect(() => {
    if (imageList.length > 0) playImages();
  }, [imageList]);

  // --[VIDEO FUNCTIONALITY]---------------------------------------

  const measureVideoNode = (passedVideoNode: HTMLVideoElement) => {
    const vericalPadding = 30;
    const videoWidth = passedVideoNode.offsetWidth;
    const videoHeight = passedVideoNode.offsetHeight + vericalPadding;
    return [videoWidth, videoHeight];
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoMultiListener = async (event: any) => {
    const [videoWidth, videoHeight] = measureVideoNode(event.target);
    const { timestamp } = await postPlaylist(videoList, '/videoPlaylist');
    ipcRenderer.send('playVideoMulti', {
      list: timestamp,
      width: videoWidth,
      height: videoHeight,
    });
  };

  const removeVideoNodes = () => {
    const videoElement = videoContainer.current;
    while (videoElement?.firstChild) {
      videoElement.removeEventListener('canplay', videoMultiListener);
      videoElement.removeChild(videoElement.firstChild);
    } // Removes all child nodes then appends new video node
    return videoElement;
  };

  const replaceVideoNode = (passedVideoNode: HTMLVideoElement) => {
    const parentElement = removeVideoNodes();
    parentElement?.appendChild(passedVideoNode);
  };

  const playVideos = () => {
    const newVideoNode = document.createElement('video');
    newVideoNode.setAttribute('src', `${SERVER}${videoList[0]}`);
    newVideoNode.addEventListener('canplay', videoMultiListener);
    replaceVideoNode(newVideoNode);
  };

  useEffect(() => {
    if (videoList.length > 0) playVideos();
  }, [videoList]);

  // Select image and videos from an existing playlist

  const playSelectedImages = (timestamp: string) => {
    if (timestamp) {
      ipcRenderer.send('playSlideshow', {
        list: timestamp,
        width: 640,
        height: 480,
      });
    }
  };

  const playSelectedVideos = (timestamp: string) => {
    if (timestamp) {
      ipcRenderer.send('playVideoMulti', {
        list: timestamp,
        width: 640,
        height: 480,
      });
    }
  };

  useEffect(() => {
    fetch(`${SERVER}/recentPlaylists`)
      .then((response) => response.json())
      .then(({ images, videos }) => {
        setImagePlaylists(images);
        setVideoPlaylists(videos);
      })
      .catch(() => {});
    return () => {
      removeImageNodes();
      removeVideoNodes();
    };
  }, []);

  return (
    <>
      <div id="headerContainer">
        <div className="column">
          <button type="button" onClick={() => selectFiles('video')}>
            New Video Playlist
          </button>
          <button
            type="button"
            onClick={loadVideoPlaylist}
            onKeyPress={() => false}
          >
            Open Video Playlist
          </button>
          {Object.keys(videoPlaylists).map((key, n) => (
            <a
              key={`videos_${n}`}
              onClick={() => playSelectedVideos(key)}
              onKeyPress={() => {}}
            >
              {videoPlaylists[key].title}
            </a>
          ))}
        </div>
        <div className="column">
          <button type="button" onClick={() => selectFiles('image')}>
            New Image Playlist
          </button>
          <button
            type="button"
            onClick={loadImagePlaylist}
            onKeyPress={() => false}
          >
            Open Image Playlist
          </button>
          {Object.keys(imagePlaylists).map((key, n) => (
            <a
              key={`videos_${n}`}
              onClick={() => playSelectedImages(key)}
              onKeyPress={() => {}}
            >
              {imagePlaylists[key].title}
            </a>
          ))}
        </div>
      </div>
      <div id="imageHidden" className="hidden" ref={imageContainer} />
      <div id="videoHidden" className="hidden" ref={videoContainer} />
      <div id="footerContainer">
        <input
          multiple
          name="file"
          onChange={changeFiles}
          ref={filePicker}
          type="file"
        />
      </div>
    </>
  );
};
// https://electron-react-boilerplate.js.org/
export default function Home() {
  return (
    <Router>
      <Switch>
        <Route path="/" component={MultiMedia} />
      </Switch>
    </Router>
  );
}
