/* eslint-disable no-console */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { MouseEvent, useEffect, useRef, useState } from 'react';
import { ipcRenderer } from 'electron';
import { SERVER } from './constants';

let slideshowTimout: NodeJS.Timeout;
let hideMenuTimeout: NodeJS.Timeout;
let mouseMoveDebounce: NodeJS.Timeout;

interface SlideshowProps {
  playlist: string;
}

export default function Slideshow({ playlist }: SlideshowProps) {
  const [index, setIndex] = useState(-1);
  const [imageList, setImageList] = useState([]);
  const [imageTags, setImageTags] = useState<HTMLDivElement[]>([]);
  const imageContainer = useRef<HTMLDivElement | never>(null);

  const nextIndex = () => {
    return index === imageList.length - 1 ? 0 : index + 1;
  };

  const nextImage = () => {
    imageTags[index].classList.remove('show');
    imageTags[index].classList.add('hide');
    const fadeIn = nextIndex();
    imageTags[fadeIn].classList.add('show');
    imageTags[fadeIn].classList.remove('hide');
    setIndex(fadeIn);
  };

  // TODO:: Use arrow keys to adjust the playback
  // Up and down change the interval
  // Left and right stop the interval and advance the slideshow manually
  // Spacebar resumes the slide show after pausing manual advance mode
  useEffect(() => {
    clearInterval(slideshowTimout);
    slideshowTimout = setInterval(() => {
      nextImage();
    }, 2000);
  }, [index]);

  const loadAllImages = () => {
    setImageTags(
      imageList.map((imagePath, arrayIndex) => {
        const imageNode = document.createElement('div');
        imageNode.setAttribute(
          'style',
          `background-image: url("${SERVER}${imagePath}"); z-index: ${
            arrayIndex + 1
          }`
        );
        if (arrayIndex === 0) {
          imageNode.classList.add('show');
        } else {
          imageNode.classList.add('hide');
        }
        imageContainer?.current?.appendChild(imageNode);
        return imageNode;
      })
    );
  };

  useEffect(() => {
    if (playlist !== '' && imageList.length === 0) {
      fetch(`${SERVER}/imagePlaylist/${playlist}`)
        .then((response) => response.json())
        .then((json) => {
          console.log('fetched', json);
          setImageList(json);
          return json;
        })
        .catch(() => console.error);
    }
  }, [playlist]);

  useEffect(() => {
    if (imageList.length > 0) {
      loadAllImages();
    }
  }, [imageList]);

  useEffect(() => {
    if (imageTags.length > 0) {
      setIndex(0);
    }
  }, [imageTags]);

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
