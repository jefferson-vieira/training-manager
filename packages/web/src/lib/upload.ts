import axios from 'axios';

interface UploadOptions {
  blob: Blob;
  contentType: string;
  onProgress: (percent: number) => void;
  url: string;
}

export function uploadWithProgress({
  blob,
  contentType,
  onProgress,
  url,
}: UploadOptions) {
  return axios.put(url, blob, {
    headers: {
      'Content-Type': contentType,
    },
    onUploadProgress: ({ progress }) => {
      if (progress === undefined) {
        return;
      }

      onProgress(Math.round(progress * 100));
    },
  });
}
