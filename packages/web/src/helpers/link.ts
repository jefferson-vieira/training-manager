export function isYouTubeUrl(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');

    return (
      host === 'youtube.com' ||
      host === 'youtu.be' ||
      host.endsWith('.youtube.com')
    );
  } catch {
    return false;
  }
}
