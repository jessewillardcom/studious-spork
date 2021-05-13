export interface CreateMediaPlayer {
  list: string;
  width: number;
  height: number;
}

export interface MultimediaPlaylists {
  images: Record<string, PlaylistAttributes>;
  videos: Record<string, PlaylistAttributes>;
}

export interface PlaylistAttributes {
  list: string[];
  title: string;
}

export interface PostedVideoPlaylist {
  list: string[];
  save: boolean;
  title: string;
}

export interface SingleVideoPlayer {
  width: number;
  height: number;
  video: string;
}
