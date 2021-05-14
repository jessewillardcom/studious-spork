/* eslint-disable no-console */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable jsx-a11y/media-has-caption */
import React, { MouseEvent, useEffect, useRef, useState } from 'react';
import { ipcRenderer } from 'electron';
import { SERVER } from './constants';

let hideMenuTimeout: NodeJS.Timeout;
let mouseMoveDebounce: NodeJS.Timeout;

interface VideoPlayerProps {
  playlist: string;
}

export default function VideoPlayer({ playlist }: VideoPlayerProps) {
  const videoContainer = useRef<HTMLDivElement | never>(null);
  const videoPlayer = useRef<HTMLVideoElement | never>(null);
  const videoAttributes = {
    autoPlay: true,
    muted: true,
  };

  // Multi Video
  const [loop, setLoop] = useState(false);
  const [index, setIndex] = useState(-1);
  const [videoList, setVideoList] = useState([]);

  const nextVideo = () => {
    if (playlist.length > 1) {
      setIndex(() => (index === videoList.length - 1 ? 0 : index + 1));
    }
  };

  useEffect(() => {
    if (index > -1 && videoPlayer?.current !== null) {
      videoPlayer.current.setAttribute('src', `${SERVER}${videoList[index]}`);
    }
  }, [index]);

  useEffect(() => {
    if (playlist !== '' && videoPlayer?.current !== null) {
      fetch(`${SERVER}/videoPlaylist/${playlist}`)
        .then((response) => response.json())
        .then((json) => {
          setVideoList(json);
          nextVideo();
          return json;
        })
        .catch(() => console.error);
    }
  }, [playlist]);

  useEffect(() => {
    if (videoList.length === 1) setLoop(true);
  }, [videoList]);

  // NOTE:: This hides the menu and allows window to close
  const [menu, setMenu] = useState(false);
  const closeWindow = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    console.log('closeWindow[', playlist);
    ipcRenderer.send('closeWindow', playlist);
  };
  const hideVideoMenu = () => {
    setMenu(false);
  };
  const showVideoMenu = () => {
    setMenu(true);
  };

  useEffect(() => {
    document.body.addEventListener('mouseleave', () => {
      clearTimeout(hideMenuTimeout);
      clearTimeout(mouseMoveDebounce);
      hideVideoMenu();
    });

    window.addEventListener('mousemove', () => {
      clearTimeout(hideMenuTimeout);
      hideMenuTimeout = setTimeout(() => {
        hideVideoMenu();
      }, 2500);

      clearTimeout(mouseMoveDebounce);
      mouseMoveDebounce = setTimeout(() => {
        showVideoMenu();
      }, 10);
    });
  }, []);

  return (
    <>
      <div id="popupWindowMenu" style={{ display: menu ? 'flex' : 'none' }}>
        <button type="button" onClick={closeWindow} onKeyDown={() => false}>
          X
        </button>
      </div>
      <div id="videoContainer" ref={videoContainer}>
        <video
          id="videoPlayer"
          loop={loop}
          controls={menu}
          ref={videoPlayer}
          {...videoAttributes}
          onEnded={nextVideo}
        />
      </div>
    </>
  );
}
