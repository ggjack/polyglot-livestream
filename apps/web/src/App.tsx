import { useEffect, useMemo, useRef, useState } from "react";

type PreviewStatus = "idle" | "loading" | "live" | "error";
type SourceMode = "camera" | "file" | "screen" | "url";

export default function App() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDeviceId, setVideoDeviceId] = useState("");
  const [audioDeviceId, setAudioDeviceId] = useState("");
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [mode, setMode] = useState<SourceMode>("camera");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const videoInputs = useMemo(
    () => devices.filter((device) => device.kind === "videoinput"),
    [devices]
  );
  const audioInputs = useMemo(
    () => devices.filter((device) => device.kind === "audioinput"),
    [devices]
  );

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const refreshDevices = async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list);
      if (!videoDeviceId) {
        const firstVideo = list.find((device) => device.kind === "videoinput");
        if (firstVideo) {
          setVideoDeviceId(firstVideo.deviceId);
        }
      }
      if (!audioDeviceId) {
        const firstAudio = list.find((device) => device.kind === "audioinput");
        if (firstAudio) {
          setAudioDeviceId(firstAudio.deviceId);
        }
      }
    } catch (err) {
      setError("Unable to enumerate devices. Check browser permissions.");
    }
  };

  const startPreview = async () => {
    try {
      setError(null);
      setStatus("loading");
      stopTracks();

      if (mode === "camera") {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Media capture is not supported in this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoDeviceId
            ? { deviceId: { exact: videoDeviceId } }
            : true,
          audio: audioDeviceId
            ? { deviceId: { exact: audioDeviceId } }
            : true
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        if (audioRef.current) {
          audioRef.current.srcObject = stream;
        }
        await refreshDevices();
      }

      if (mode === "screen") {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error("Screen capture is not supported in this browser.");
        }
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        if (audioRef.current) {
          audioRef.current.srcObject = stream;
        }
      }

      if (mode === "file") {
        if (!fileUrl) {
          throw new Error("Select a local video file to preview.");
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = fileUrl;
          videoRef.current.muted = true;
          await videoRef.current.play();
        }
        if (audioRef.current) {
          audioRef.current.srcObject = null;
          audioRef.current.src = fileUrl;
        }
      }

      if (mode === "url") {
        if (!streamUrl.trim()) {
          throw new Error("Enter a URL or start a server-side ingest.");
        }
      }

      setStatus("live");
    } catch (err) {
      setStatus("error");
      const message =
        err instanceof Error ? err.message : "Unable to start preview.";
      setError(message);
    }
  };

  const stopPreview = () => {
    stopTracks();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    setStatus("idle");
  };

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError("Media device listing is not supported in this browser.");
      return;
    }

    refreshDevices();
    const handleDeviceChange = () => refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange
      );
      stopTracks();
    };
  }, []);

  useEffect(() => {
    if (status === "live" && mode === "camera") {
      startPreview();
    }
  }, [videoDeviceId, audioDeviceId, mode]);

  useEffect(() => {
    if (status === "live" && mode === "file") {
      startPreview();
    }
  }, [fileUrl, mode]);

  useEffect(() => {
    setError(null);
    stopPreview();
  }, [mode]);

  useEffect(() => {
    if (!fileUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Live intake</p>
          <h1>Stream capture control room</h1>
          <p className="subhead">
            Pick your camera and microphone, preview the feed, then hand off to
            the dubbing pipeline.
          </p>
        </div>
        <div className="hero-actions">
          <button className="primary" onClick={startPreview} type="button">
            Start preview
          </button>
          <button className="ghost" onClick={stopPreview} type="button">
            Stop
          </button>
          <button className="ghost" onClick={refreshDevices} type="button">
            Refresh devices
          </button>
        </div>
      </header>

      <section className="studio">
        <div className="panel">
          <div className="panel-header">
            <h2>Inputs</h2>
            <span className={`status-badge ${status}`}>
              {status === "idle" && "Idle"}
              {status === "loading" && "Connecting"}
              {status === "live" && "Live"}
              {status === "error" && "Error"}
            </span>
          </div>
          <div className="mode-row">
            {(["camera", "file", "screen", "url"] as SourceMode[]).map(
              (option) => (
                <button
                  key={option}
                  className={mode === option ? "primary" : "ghost"}
                  type="button"
                  onClick={() => setMode(option)}
                >
                  {option === "camera" && "Camera + Mic"}
                  {option === "file" && "Local File"}
                  {option === "screen" && "Screen Share"}
                  {option === "url" && "URL Ingest"}
                </button>
              )
            )}
          </div>
          <div className="device-row">
            <label>
              Video source
              <select
                value={videoDeviceId}
                onChange={(event) => setVideoDeviceId(event.target.value)}
                disabled={mode !== "camera"}
              >
                {videoInputs.length === 0 && (
                  <option value="">No cameras detected</option>
                )}
                {videoInputs.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Audio source
              <select
                value={audioDeviceId}
                onChange={(event) => setAudioDeviceId(event.target.value)}
                disabled={mode !== "camera"}
              >
                {audioInputs.length === 0 && (
                  <option value="">No microphones detected</option>
                )}
                {audioInputs.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {mode === "file" && (
            <div className="source-row">
              <label>
                Local video file
                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setFileUrl(URL.createObjectURL(file));
                      setStatus("idle");
                    }
                  }}
                />
              </label>
              {fileUrl && (
                <p className="hint">Loaded file preview. Click Start preview.</p>
              )}
            </div>
          )}
          {mode === "screen" && (
            <p className="hint">
              Screen share will ask which window or tab to capture.
            </p>
          )}
          {mode === "url" && (
            <div className="source-row">
              <label>
                Stream URL
                <input
                  type="text"
                  placeholder="https://..."
                  value={streamUrl}
                  onChange={(event) => setStreamUrl(event.target.value)}
                />
              </label>
              <p className="hint">
                Direct URL playback needs server-side ingest for YouTube or live
                feeds.
              </p>
            </div>
          )}
          {error && <p className="error">{error}</p>}
        </div>

        <div className="media-grid">
          <div className="media-tile">
            <h3>Video preview</h3>
            <div className="media-frame video">
              <video ref={videoRef} autoPlay playsInline muted />
            </div>
            {mode === "camera" && (
              <p className="hint">
                The camera preview is muted locally to avoid feedback.
              </p>
            )}
            {mode === "file" && (
              <p className="hint">Local files use the audio monitor below.</p>
            )}
            {mode === "screen" && (
              <p className="hint">Screen share audio may be limited by OS.</p>
            )}
            {mode === "url" && (
              <p className="hint">
                URL ingest requires a server-side relay for live streams.
              </p>
            )}
          </div>
          <div className="media-tile">
            <h3>Audio monitor</h3>
            <div className="media-frame audio">
              <audio ref={audioRef} autoPlay controls muted />
            </div>
            <p className="hint">
              Unmute to monitor the mic feed through your speakers.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
