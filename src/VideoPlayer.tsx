/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable jsx-a11y/media-has-caption */
import React, { useEffect, useRef, useState } from 'react';
import { ipcRenderer } from 'electron';

interface VideoPlayerProps {
  playlist?: string;
  video?: string;
}
const SERVER = 'http://localhost:8080';

let hideMenuTimeout: NodeJS.Timeout;
let mouseMoveDebounce: NodeJS.Timeout;

export default function VideoPlayer({ playlist, video }: VideoPlayerProps) {
  const [menu, setMenu] = useState(false);
  const videoContainer = useRef<HTMLDivElement | never>(null);
  const videoPlayer = useRef<HTMLVideoElement | never>(null);
  const videoAttributes = {
    autoPlay: true,
    loop: false,
    muted: true,
  };

  // Single Video
  if (playlist === '') videoAttributes.loop = true;
  useEffect(() => {
    if (video !== '' && videoPlayer?.current !== null)
      videoPlayer.current.src = `${SERVER}${video}`;
  }, [video]);

  // Multi Video
  const [index, setIndex] = useState(-1);
  const [videoList, setVideoList] = useState([]);

  const nextVideo = () => {
    if (playlist !== '')
      setIndex(() => (index === videoList.length - 1 ? 0 : index + 1));
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

  const closeWindow = (event: Event) => {
    event.stopPropagation();
    const key = playlist || video;
    console.log('closeWindow[', key);
    ipcRenderer.send('closeWindow', key);
  };
  const hideVideoMenu = () => {
    setMenu(false);
  };
  const showVideoMenu = () => {
    setMenu(true);
  };

  useEffect(() => {
    window.addEventListener('blur', () => {
      console.log('blur');
    });
    document.body.addEventListener('mouseleave', () => {
      console.log('mouseleave');
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
          controls={menu}
          ref={videoPlayer}
          {...videoAttributes}
          onEnded={nextVideo}
        />
      </div>
    </>
  );
}

VideoPlayer.defaultProps = {
  playlist: '',
  video: '',
};
