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

  // NOTE:: This hides the menu and allows window to close
  const [menu, setMenu] = useState(false);
  const closeWindow = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    ipcRenderer.send('closeWindow', playlist);
  };
  const hideVideoMenu = () => {
    setMenu(false);
  };
  const showVideoMenu = () => {
    setMenu(true);
  };

  useEffect(() => {
    document.addEventListener('webkitfullscreenchange', (e) => {
      // document.fullscreenElement will point to the element that
      // is in fullscreen mode if there is one. If there isn't one,
      // the value of the property is null.
      if (document.fullscreenElement) {
        clearTimeout(hideMenuTimeout);
        clearTimeout(mouseMoveDebounce);
        hideVideoMenu();
      }
    });
  }, [videoPlayer]);

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

  const startFullscreen = () => {
    if (!document.fullscreenElement)
      videoContainer?.current?.requestFullscreen().catch(err => {});
    videoPlayer?.current?.play();
  };

  const keyControls = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.keyCode) {
      case 13: {
        // console.log('ENTER');
        startFullscreen();
        break;
      }
      default:
      // console.log(e.keyCode);
    }
  };

  const videoAttributes = {
    autoPlay: true,
    controls: true,
    muted: true,
  };

  return (
    <>
      <div
        id="videoContainer"
        ref={videoContainer}
        role="button"
        onKeyUp={keyControls}
        tabIndex={0}
      >
        <div id="popupWindowMenu" style={{ display: menu ? 'block' : 'none' }}>
          <button type="button" onClick={closeWindow} onKeyDown={() => false}>
            X
          </button>
        </div>
        <video
          id="videoPlayer"
          loop={loop}
          ref={videoPlayer}
          {...videoAttributes}
          onEnded={nextVideo}
          className={!menu ? 'hideControls' : ''}
        />
      </div>
    </>
  );
}
