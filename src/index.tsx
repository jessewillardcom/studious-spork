import React from 'react';
import { render } from 'react-dom';
import VideoPlayer from './VideoPlayer';
import Home from './Home';

const queryString = new URLSearchParams(window.location.search);
const view = queryString.get('view');

switch (view) {
  case 'VideoSingle': {
    const video = queryString.get('video') ?? '';
    const segments = video.split('/') ?? [''];
    document.title = decodeURIComponent(segments[segments.length - 1]);
    render(<VideoPlayer video={video} />, document.getElementById('root'));
    break;
  }
  case 'VideoMulti': {
    const playlist = queryString.get('list') ?? '';
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
