import React from 'react';
import { render } from 'react-dom';
import VideoPlayer from './VideoPlayer';
import Slideshow from './Slideshow';
import Home from './Home';

const queryString = new URLSearchParams(window.location.search);
const list = queryString.get('list') ?? '';
const view = queryString.get('view');

switch (view) {
  case 'Slideshow': {
    render(<Slideshow playlist={list} />, document.getElementById('root'));
    break;
  }
  case 'VideoMulti': {
    render(<VideoPlayer playlist={list} />, document.getElementById('root'));
    break;
  }
  default:
    document.title = 'Multimedia Player';
    render(<Home />, document.getElementById('root'));
}
