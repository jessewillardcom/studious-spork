export interface MultimediaPlaylists {
  images: Record<string, PlaylistAttributes>;
  videos: Record<string, PlaylistAttributes>;
}

export interface MultiVideoPlayer {
  list: string;
  width: number;
  height: number;
}

export interface PlaylistAttributes {
  list: string[];
  title: string;
}

export interface HttpPostPlaylist {
  list: string[];
  save: boolean;
  title: string;
}

export interface SingleVideoPlayer {
  width: number;
  height: number;
  video: string;
}

export interface SlideshowPlayer {
  list: string;
  width: number;
  height: number;
}
