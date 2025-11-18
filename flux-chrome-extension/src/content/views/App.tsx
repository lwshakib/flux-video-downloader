import { useEffect, useRef, useState } from "react";
import "./App.css";

interface VideoElement {
  element: HTMLVideoElement;
  id: string;
}

function DownloadVideoButton({ video }: { video: HTMLVideoElement }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      const rect = video.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.left,
      });
    };

    updatePosition();
    const scrollHandler = () => updatePosition();
    const resizeHandler = () => updatePosition();

    window.addEventListener("scroll", scrollHandler, true);
    window.addEventListener("resize", resizeHandler);

    // Also listen for video container changes
    const videoObserver = new MutationObserver(updatePosition);
    if (video.parentElement) {
      videoObserver.observe(video.parentElement, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    }

    return () => {
      window.removeEventListener("scroll", scrollHandler, true);
      window.removeEventListener("resize", resizeHandler);
      videoObserver.disconnect();
    };
  }, [video]);

  const handleDownload = async () => {
    try {
      const videoSrc = video.src || video.currentSrc;

      if (!videoSrc) {
        console.error("No video source found");
        return;
      }

      // Fetch the video
      const response = await fetch(videoSrc);
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading video:", error);
      // Fallback: try direct download
      const videoSrc = video.src || video.currentSrc;
      if (videoSrc) {
        const a = document.createElement("a");
        a.href = videoSrc;
        a.download = `video-${Date.now()}.mp4`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  return (
    <div
      ref={buttonRef}
      className="flux-download-button"
      style={{
        position: "fixed",
        top: `${position.top + 10}px`,
        left: `${position.left + 10}px`,
      }}
    >
      <button
        onClick={handleDownload}
        className="flux-download-btn"
        title="Download Video"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span className="flux-download-text">Download Video</span>
      </button>
    </div>
  );
}

function App() {
  const [videos, setVideos] = useState<VideoElement[]>([]);
  const videosRef = useRef<Set<HTMLVideoElement>>(new Set());

  useEffect(() => {
    const findVideos = () => {
      const videoElements = Array.from(document.querySelectorAll("video"));

      // Filter out videos we've already processed
      const newVideos = videoElements.filter(
        (video) => !videosRef.current.has(video)
      );

      // Remove videos that no longer exist in the DOM
      videosRef.current.forEach((video) => {
        if (!document.contains(video)) {
          videosRef.current.delete(video);
        }
      });

      // Add new videos
      newVideos.forEach((video) => {
        videosRef.current.add(video);
      });

      // Update state with all current videos
      const videoList: VideoElement[] = Array.from(videosRef.current).map(
        (video, index) => ({
          element: video,
          id: `flux-video-${video.src || index}-${video.offsetTop}`,
        })
      );

      setVideos(videoList);
    };

    // Initial find
    findVideos();

    // Watch for new videos added to the DOM
    const observer = new MutationObserver(() => {
      findVideos();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {videos.map((video) => (
        <DownloadVideoButton key={video.id} video={video.element} />
      ))}
    </>
  );
}

export default App;
