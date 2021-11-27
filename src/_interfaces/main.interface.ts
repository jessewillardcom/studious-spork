export interface MultimediaPlaylists {
  images: Record<string, PlaylistProps>;
  videos: Record<string, PlaylistProps>;
}

export interface PlaylistProps {
  list: string[];
  timestamp: number;
  title: string;
}

export interface MultiVideoPlayer {
  list: string;
  width: number;
  height: number;
}

export interface SlideshowPlayer {
  list: string;
  width: number;
  height: number;
}
