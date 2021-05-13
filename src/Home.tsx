import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import './App.global.css';

const QUERY_STRING = new URLSearchParams(window.location.search);
const USER_FOLDER = QUERY_STRING.get('home') ?? '';
const SERVED_PATH = 'http://localhost:8080';

const MultiMedia = () => {
  const filePicker = useRef<HTMLInputElement | never>(null);
  const videoContainer = useRef<HTMLDivElement | never>(null);
  const [videoList, setVideoList] = useState<string[] | never[]>([]);

  const selectFiles = () => {
    if (filePicker?.current) {
      setVideoList([]);
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
      setVideoList(urlPaths);
    }
  };

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

  const postPlaylist = async () => {
    const request = {
      list: videoList,
      save: false,
      title: '',
    };
    const response = await fetch(`${SERVED_PATH}/videoPlaylist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return response.json();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoMultiListener = async (event: any) => {
    const [videoWidth, videoHeight] = measureVideoNode(event.target);
    const { timestamp } = await postPlaylist();
    ipcRenderer.send('playVideoMulti', {
      list: timestamp,
      width: videoWidth,
      height: videoHeight,
    });
  };

  const replaceVideoNode = (passedVideoNode: HTMLVideoElement) => {
    const videoElement = videoContainer.current;
    while (videoElement?.firstChild) {
      videoElement.removeChild(videoElement.firstChild);
    } // Removes all child nodes then appends new video node
    videoElement?.appendChild(passedVideoNode);
  };

  const playVideo = () => {
    const newVideoNode = document.createElement('video');
    newVideoNode.setAttribute('src', `${SERVED_PATH}${videoList[0]}`);
    newVideoNode.addEventListener('canplay', videoSingleListener);
    replaceVideoNode(newVideoNode);
  };

  const playVideos = () => {
    const newVideoNode = document.createElement('video');
    newVideoNode.setAttribute('src', `${SERVED_PATH}${videoList[0]}`);
    newVideoNode.addEventListener('canplay', videoMultiListener);
    replaceVideoNode(newVideoNode);
  };

  useEffect(() => {
    if (videoList.length === 1) playVideo();
    if (videoList.length > 1) playVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoList]);

  return (
    <>
      <div id="headerContainer">
        <button type="button" onClick={selectFiles}>
          Video Playlist
        </button>
        <input
          multiple
          name="file"
          onChange={changeFiles}
          ref={filePicker}
          type="file"
        />
      </div>
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
