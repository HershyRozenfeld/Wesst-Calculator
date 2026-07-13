import { useEffect, useRef } from 'react';

const WATER_VIDEO_SOURCE = '/backgrounds/underwater-bubbles-hd.mp4';

export function WaterBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return undefined;
    const video: HTMLVideoElement = currentVideo;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function syncPlayback() {
      if (document.hidden || reducedMotion.matches) {
        video.pause();
        if (reducedMotion.matches && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          video.currentTime = 0;
        }
        return;
      }

      void video.play().catch(() => {
        // Muted autoplay can still be delayed until the WebView is ready.
      });
    }

    video.addEventListener('loadeddata', syncPlayback);
    document.addEventListener('visibilitychange', syncPlayback);
    reducedMotion.addEventListener('change', syncPlayback);
    syncPlayback();

    return () => {
      video.removeEventListener('loadeddata', syncPlayback);
      document.removeEventListener('visibilitychange', syncPlayback);
      reducedMotion.removeEventListener('change', syncPlayback);
    };
  }, []);

  return (
    <div className="water-backdrop" aria-hidden="true">
      <video
        ref={videoRef}
        className="water-backdrop__video"
        src={WATER_VIDEO_SOURCE}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
      />
      <span className="water-backdrop__wash" />
    </div>
  );
}
