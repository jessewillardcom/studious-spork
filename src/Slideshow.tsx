/* eslint-disable no-console */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { MouseEvent, useEffect, useRef, useState } from 'react';
import { ipcRenderer } from 'electron';
import { SERVER } from './constants';

let hideMenuTimeout: NodeJS.Timeout;
let mouseMoveDebounce: NodeJS.Timeout;

interface SlideshowProps {
  playlist: string;
}

export default function Slideshow({ playlist }: SlideshowProps) {
  const imageContainer = useRef<HTMLDivElement | never>(null);

  // Multi Video
  const [index, setIndex] = useState(-1);
  const [imageList, setImageList] = useState([]);

  const nextImage = () => {
    if (playlist !== '')
      setIndex(() => (index === imageList.length - 1 ? 0 : index + 1));
  };

  useEffect(() => {
    if (index > -1 && imageList.length === 0) {
      // videoPlayer.current.setAttribute('src', `${SERVER}${videoList[index]}`);
    }
  }, [index]);

  useEffect(() => {
    if (playlist !== '' && imageList.length === 0) {
      fetch(`${SERVER}/imagePlaylist/${playlist}`)
        .then((response) => response.json())
        .then((json) => {
          setImageList(json);
          nextImage();
          return json;
        })
        .catch(() => console.error);
    }
  }, [playlist]);

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
      <div id="imageContainer" ref={imageContainer} />
    </>
  );
}
