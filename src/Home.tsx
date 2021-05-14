import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import { SERVER } from './constants';
import './App.global.css';

const QUERY_STRING = new URLSearchParams(window.location.search);
const USER_FOLDER = QUERY_STRING.get('home') ?? '';

const MultiMedia = () => {
  const [fileType, setFileType] = useState('');
  const filePicker = useRef<HTMLInputElement | never>(null);
  const imageContainer = useRef<HTMLDivElement | never>(null);
  const videoContainer = useRef<HTMLDivElement | never>(null);
  const [imageList, setImageList] = useState<string[] | never[]>([]);
  const [videoList, setVideoList] = useState<string[] | never[]>([]);

  const selectFiles = (type: string) => {
    if (filePicker?.current) {
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
    if (fileSet.length === 1) {
      const oneFile = fileSet[0];
      const urlPath = noLocalPath(oneFile?.path);
      if (urlPath) setVideoList([urlPath]);
    } else if (fileSet.length > 1) {
      const fileArray: File[] = Object.values(fileSet);
      const urlPaths: string[] = fileArray.map((file: File) =>
        noLocalPath(file.path)
      );
      if (fileType === 'image') setImageList(urlPaths);
      if (fileType === 'video') setVideoList(urlPaths);
    }
  };

  const postPlaylist = async (list: string[], endpoint: string) => {
    const request = {
      list,
      save: false,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageList]);

  // --[VIDEO FUNCTIONALITY]---------------------------------------

  const measureVideoNode = (passedVideoNode: HTMLVideoElement) => {
    const vericalPadding = 30;
    const videoWidth = passedVideoNode.offsetWidth;
    const videoHeight = passedVideoNode.offsetHeight + vericalPadding;
    return [videoWidth, videoHeight];
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoSingleListener = (event: any) => {
    const [videoWidth, videoHeight] = measureVideoNode(event.target);
    ipcRenderer.send('playVideoSingle', {
      width: videoWidth,
      height: videoHeight,
      video: `${videoList[0]}`,
    });
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
      videoElement.removeEventListener('canplay', videoSingleListener);
      videoElement.removeChild(videoElement.firstChild);
    } // Removes all child nodes then appends new video node
    return videoElement;
  };

  const replaceVideoNode = (passedVideoNode: HTMLVideoElement) => {
    const parentElement = removeVideoNodes();
    parentElement?.appendChild(passedVideoNode);
  };

  const playVideo = () => {
    const newVideoNode = document.createElement('video');
    newVideoNode.setAttribute('src', `${SERVER}${videoList[0]}`);
    newVideoNode.addEventListener('canplay', videoSingleListener);
    replaceVideoNode(newVideoNode);
  };

  const playVideos = () => {
    const newVideoNode = document.createElement('video');
    newVideoNode.setAttribute('src', `${SERVER}${videoList[0]}`);
    newVideoNode.addEventListener('canplay', videoMultiListener);
    replaceVideoNode(newVideoNode);
  };

  useEffect(() => {
    if (videoList.length === 1) playVideo();
    if (videoList.length > 1) playVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoList]);

  useEffect(() => {
    return () => {
      removeImageNodes();
      removeVideoNodes();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div id="headerContainer">
        <button type="button" onClick={() => selectFiles('video')}>
          Video Playlist
        </button>
        <span>&nbsp;&nbsp;</span>
        <button type="button" onClick={() => selectFiles('image')}>
          Image Playlist
        </button>
        <input
          multiple
          name="file"
          onChange={changeFiles}
          ref={filePicker}
          type="file"
        />
      </div>
      <div id="imageHidden" ref={imageContainer} />
      <div id="videoHidden" ref={videoContainer} />
      <div id="footerContainer" />
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
