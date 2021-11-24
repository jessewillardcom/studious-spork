/* eslint-disable no-console */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable jsx-a11y/media-has-caption */
import React, { MouseEvent, useEffect, useRef, useState } from 'react';
import { ipcRenderer } from 'electron';
import { SERVER } from './constants';

let hideMenuTimeout: NodeJS.Timeout;
let hideModalTimeout: NodeJS.Timeout;
let mouseMoveDebounce: NodeJS.Timeout;

const videoAttributes = {
  autoPlay: true,
  controls: true,
  muted: true,
};

interface VideoPlayerProps {
  playlist: string;
}

export default function VideoPlayer({ playlist }: VideoPlayerProps) {
  const videoContainer = useRef<HTMLDivElement | never>(null);
  const videoPlayer = useRef<HTMLVideoElement | never>(null);

  const closeWindow = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    ipcRenderer.send('closeWindow', playlist);
  };

  // NOTE:: This hides the menu and allows window to close
  const [menu, setMenu] = useState(false);
  const hideVideoMenu = () => {
    setMenu(false);
  };
  const showVideoMenu = () => {
    setMenu(true);
  };

  const [modal, setModal] = useState(false);
  const hideVideoModal = () => {
    setModal(false);
  };
  const showVideoModal = () => {
    setModal(true);
  };
  useEffect(() => {
    document.addEventListener('webkitfullscreenchange', () => {
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

  // Multi Video
  const [loop, setLoop] = useState(false);
  const [index, setIndex] = useState(-1);
  const [looping, setLooping] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [videoList, setVideoList] = useState([]);

  // NOTE:: This handles the advancing of the slides
  const prevIndex = () => {
    return index - 1 === -1 ? videoList.length - 1 : index - 1;
  };

  const prevVideo = () => {
    if (playlist.length > 1) setIndex(prevIndex());
  };

  const nextIndex = () => {
    return index === videoList.length - 1 ? 0 : index + 1;
  };

  const nextVideo = () => {
    if (playlist.length > 1) setIndex(nextIndex());
  };

  useEffect(() => {
    if (index > -1 && videoPlayer?.current !== null && !looping) {
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

  const savePlaylist = () => {
    ipcRenderer.send('saveVideoPlaylist', playlist);
  };

  const startFullscreen = () => {
    if (!document.fullscreenElement)
      videoContainer?.current?.requestFullscreen().catch(() => {});
    videoPlayer?.current?.play();
  };

  const toggleLooping = () => {
    setLooping(!looping);
  };

  const togglePlaying = () => {
    if (playing) videoPlayer?.current?.pause();
    else videoPlayer?.current?.play();
    setPlaying(!playing);
  };

  useEffect(() => {
    clearTimeout(hideModalTimeout);
    hideModalTimeout = setTimeout(() => {
      hideVideoModal();
    }, 500);
    showVideoModal();
  }, [looping]);

  const keyControls = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.keyCode) {
      case 13: {
        // console.log('ENTER');
        startFullscreen();
        break;
      }
      case 32: {
        // console.log('SPACE');
        togglePlaying();
        break;
      }
      case 76: {
        // console.log('L');
        toggleLooping();
        break;
      }
      case 37: {
        // console.log('RIGHT');
        prevVideo();
        break;
      }
      case 39: {
        // console.log('LEFT');
        nextVideo();
        break;
      }
      default:
        console.log(e.keyCode);
    }
  };

  useEffect(() => {
    document.body.addEventListener('mouseleave', () => {
      clearTimeout(hideMenuTimeout);
      clearTimeout(mouseMoveDebounce);
      hideVideoMenu();
    });

    window.addEventListener('mousemove', () => {
      videoContainer?.current?.focus();
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
      <div
        id="videoContainer"
        ref={videoContainer}
        role="button"
        onKeyUp={keyControls}
        tabIndex={0}
      >
        <div id="popupWindowMenu" style={{ display: menu ? 'block' : 'none' }}>
          <button
            className="close"
            type="button"
            onClick={closeWindow}
            onKeyDown={() => false}
          >
            X
          </button>
          <button
            className="save"
            type="button"
            onClick={savePlaylist}
            onKeyDown={() => false}
          >
            SAVE
          </button>
        </div>
        <div id="videLooping" style={{ display: modal ? 'flex' : 'none' }}>
          {looping && <strong>Repeat stopped</strong>}
          {!looping && <strong>Looping active</strong>}
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
