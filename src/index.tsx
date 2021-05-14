import React from 'react';
import { render } from 'react-dom';
import VideoPlayer from './VideoPlayer';
import Slideshow from './Slideshow';
import Home from './Home';

const queryString = new URLSearchParams(window.location.search);
const playlist = queryString.get('list') ?? '';
const view = queryString.get('view');

switch (view) {
  case 'Slideshow': {
    render(<Slideshow playlist={playlist} />, document.getElementById('root'));
    break;
  }
  case 'VideoSingle': {
    const video = queryString.get('video') ?? '';
    const segments = video.split('/') ?? [''];
    document.title = decodeURIComponent(segments[segments.length - 1]);
    render(<VideoPlayer video={video} />, document.getElementById('root'));
    break;
  }
  case 'VideoMulti': {
    document.title = playlist;
    render(
      <VideoPlayer playlist={playlist} />,
      document.getElementById('root')
    );
    break;
  }
  default:
    document.title = 'Multimedia Player';
    render(<Home />, document.getElementById('root'));
}
