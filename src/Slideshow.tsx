/* eslint-disable no-console */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { MouseEvent, useEffect, useRef, useState } from 'react';
import { ipcRenderer } from 'electron';
import { SERVER } from './constants';

let slideshowTimout: NodeJS.Timeout;
let hideMenuTimeout: NodeJS.Timeout;
let hideModalTimeout: NodeJS.Timeout;
let mouseMoveDebounce: NodeJS.Timeout;

const MINIMUM_INTERVAL = 200;
const STEPPED_INTERVAL = 100;
const HIDE_MENU_TIMEOUT = 2500;
const HIDE_MODAL_TIMEOUT = 500;

interface SlideshowProps {
  playlist: string;
}

export default function Slideshow({ playlist }: SlideshowProps) {
  const imageContainer = useRef<HTMLDivElement | never>(null);

  const closeWindow = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    ipcRenderer.send('closeWindow', playlist);
  };

  // NOTE:: This hides the menu and allows window to close
  const [menu, setMenu] = useState(false);
  const hideImageMenu = () => {
    setMenu(false);
  };
  const showImageMenu = () => {
    setMenu(true);
  };

  const [modal, setModal] = useState(false);
  const hideImageModal = () => {
    setModal(false);
  };
  const showImageModal = () => {
    setModal(true);
  };

  const [index, setIndex] = useState(-1);
  const [timing, setTiming] = useState(2000);
  const [looping, setLooping] = useState(false);
  const [imageList, setImageList] = useState([]);
  const [imageTags, setImageTags] = useState<HTMLDivElement[]>([]);

  // NOTE:: This handles the advancing of the slides
  const prevIndex = () => {
    return index - 1 === -1 ? imageList.length - 1 : index - 1;
  };

  const prevImage = () => {
    imageTags[index].classList.remove('show');
    imageTags[index].classList.add('hide');
    const fadeIn = prevIndex();
    imageTags[fadeIn].classList.add('show');
    imageTags[fadeIn].classList.remove('hide');
    setIndex(fadeIn);
  };

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

  const slideshowPlaying = () => {
    slideshowTimout = setInterval(() => {
      nextImage();
    }, timing);
  };

  useEffect(() => {
    clearInterval(slideshowTimout);
    if (imageTags && index > -1 && looping) slideshowPlaying();
  }, [index, looping]);

  const startFullscreen = () => {
    if (!document.fullscreenElement)
      imageContainer?.current?.requestFullscreen().catch(err => {});
  };

  const togglePlayback = () => {
    setLooping(!looping);
  };

  const slidePrev = () => {
    setLooping(false);
    prevImage();
  };

  const slideNext = () => {
    setLooping(false);
    nextImage();
  };

  const descreaseSpeed = () => {
    clearInterval(slideshowTimout);
    setTiming(timing + STEPPED_INTERVAL);
    clearTimeout(hideModalTimeout);
    hideModalTimeout = setTimeout(() => {
      hideImageModal();
    }, HIDE_MODAL_TIMEOUT);
    slideshowPlaying();
    showImageModal();
  };

  const increaseSpeed = () => {
    if (timing > MINIMUM_INTERVAL) {
      clearInterval(slideshowTimout);
      setTiming(timing - STEPPED_INTERVAL);
      clearTimeout(hideModalTimeout);
      hideModalTimeout = setTimeout(() => {
        hideImageModal();
      }, HIDE_MODAL_TIMEOUT);
      slideshowPlaying();
      showImageModal();
    }
  };

  const keyControls = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.keyCode) {
      case 13: {
        // console.log('ENTER');
        startFullscreen();
        break;
      }
      case 32: {
        // console.log('SPACE');
        togglePlayback();
        break;
      }
      case 37: {
        // console.log('RIGHT');
        slidePrev();
        break;
      }
      case 38: {
        // console.log('UP');
        increaseSpeed();
        break;
      }
      case 39: {
        // console.log('LEFT');
        slideNext();
        break;
      }
      case 40: {
        // console.log('DOWN');
        descreaseSpeed();
        break;
      }
      default:
      // console.log(e.keyCode);
    }
  };

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
      setLooping(true);
    }
  }, [imageTags]);

  useEffect(() => {
    document.body.addEventListener('mouseleave', () => {
      clearTimeout(hideMenuTimeout);
      clearTimeout(mouseMoveDebounce);
      hideImageMenu();
    });

    window.addEventListener('mousemove', () => {
      imageContainer?.current?.focus();
      clearTimeout(hideMenuTimeout);
      hideMenuTimeout = setTimeout(() => {
        hideImageMenu();
      }, HIDE_MENU_TIMEOUT);

      clearTimeout(mouseMoveDebounce);
      mouseMoveDebounce = setTimeout(() => {
        showImageMenu();
      }, 10);
    });
  }, []);

  return (
    <>
      <div
        id="imageContainer"
        ref={imageContainer}
        role="button"
        onClick={() => false}
        onKeyUp={keyControls}
        tabIndex={0}
      >
        <div id="popupWindowMenu" style={{ display: menu ? 'block' : 'none' }} >
          <button type="button" onClick={closeWindow} onKeyDown={() => false}>
            X
          </button>
        </div>
        <div id="intervalTiming" style={{ display: modal ? 'flex' : 'none' }}>
          {!looping && <strong>Playback stopped</strong>}
          {looping && (
            <strong>Playback {(timing / 1000).toFixed(1)} sec</strong>
          )}
        </div>
      </div>
    </>
  );
}
