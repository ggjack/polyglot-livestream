import { useEffect, useMemo, useRef, useState } from "react";

type PreviewStatus = "idle" | "loading" | "live" | "error";

export default function App() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDeviceId, setVideoDeviceId] = useState("");
  const [audioDeviceId, setAudioDeviceId] = useState("");
  const [status, setStatus] = useState<PreviewStatus>("idle");
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
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Media capture is not supported in this browser.");
      setStatus("error");
      return;
    }

    try {
      setError(null);
      setStatus("loading");
      stopTracks();
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
      setStatus("live");
      await refreshDevices();
    } catch (err) {
      setStatus("error");
      setError("Camera or microphone access was denied.");
    }
  };

  const stopPreview = () => {
    stopTracks();
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
    if (status === "live") {
      startPreview();
    }
  }, [videoDeviceId, audioDeviceId]);

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
          <div className="device-row">
            <label>
              Video source
              <select
                value={videoDeviceId}
                onChange={(event) => setVideoDeviceId(event.target.value)}
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
          {error && <p className="error">{error}</p>}
        </div>

        <div className="media-grid">
          <div className="media-tile">
            <h3>Video preview</h3>
            <div className="media-frame video">
              <video ref={videoRef} autoPlay playsInline muted />
            </div>
            <p className="hint">
              The camera preview is muted locally to avoid feedback.
            </p>
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
