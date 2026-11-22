import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from 'react';
import { formatTime } from '../lib/utils';
import {
  IconCc,
  IconFullscreen,
  IconFullscreenExit,
  IconNext,
  IconPause,
  IconPip,
  IconPlay,
  IconPrev,
  IconSkipBack10,
  IconSkipFwd10,
  IconVolume,
  IconVolumeOff,
} from './icons';

export interface VideoPlayerProps {
  src: string;
  subtitleUrl: string | null;
  title: string;
  startAt: number;
  autoPlay: boolean;
  onTick: (position: number, duration: number) => void;
  onEnded: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}

interface Prefs {
  speed: number;
  volume: number;
  muted: boolean;
}

const PREFS_KEY = 'vcp:prefs:v1';
const DEFAULT_PREFS: Prefs = { speed: 1, volume: 1, muted: false };
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function loadPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      speed: typeof parsed.speed === 'number' ? parsed.speed : DEFAULT_PREFS.speed,
      volume: typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_PREFS.volume,
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_PREFS.muted,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs: Prefs): void {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    return;
  }
}

export default function VideoPlayer({
  src,
  subtitleUrl,
  title,
  startAt,
  autoPlay,
  onTick,
  onEnded,
  onPrev,
  onNext,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | undefined>(undefined);
  const clickTimerRef = useRef<number | undefined>(undefined);
  const lastTickRef = useRef(0);
  const draggingRef = useRef(false);
  const playingRef = useRef(false);
  const prefsRef = useRef<Prefs | null>(null);
  const initialPrefs: Prefs = prefsRef.current ?? loadPrefs();
  prefsRef.current = initialPrefs;

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(initialPrefs.volume);
  const [muted, setMuted] = useState(initialPrefs.muted);
  const [speed, setSpeed] = useState(initialPrefs.speed);
  const [ccAvailable, setCcAvailable] = useState(false);
  const [ccOn, setCcOn] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [scrubRatio, setScrubRatio] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  });

  const flush = useCallback(() => {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration) && v.duration > 0 && v.currentTime > 0) {
      onTickRef.current(v.currentTime, v.duration);
    }
    lastTickRef.current = performance.now();
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    window.clearTimeout(hideTimerRef.current);
    if (playingRef.current) {
      hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2800);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
    showControls();
  }, [showControls]);

  const seekTo = useCallback(
    (time: number) => {
      const v = videoRef.current;
      if (!v) return;
      const total = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : duration;
      const max = Math.max(0, total - 0.05);
      const next = Math.min(max, Math.max(0, time));
      v.currentTime = next;
      setCurrent(next);
    },
    [duration],
  );

  const skip = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      seekTo(v.currentTime + delta);
    },
    [seekTo],
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
      return;
    }
    if (shellRef.current) {
      void shellRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await v.requestPictureInPicture();
      }
    } catch {
      return;
    }
  }, []);

  const toggleCc = useCallback(() => {
    const v = videoRef.current;
    if (!v || v.textTracks.length === 0) return;
    const next = !ccOn;
    v.textTracks[0].mode = next ? 'showing' : 'hidden';
    setCcOn(next);
  }, [ccOn]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) flush();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [flush]);

  useEffect(() => {
    const v = videoRef.current;
    return () => {
      window.clearTimeout(hideTimerRef.current);
      window.clearTimeout(clickTimerRef.current);
      if (v && Number.isFinite(v.duration) && v.duration > 0 && v.currentTime > 0) {
        onTickRef.current(v.currentTime, v.duration);
      }
    };
  }, [src]);

  useEffect(() => {
    savePrefs({ speed, volume, muted });
  }, [speed, volume, muted]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }
      const key = event.key;
      if (key === ' ' || key === 'k' || key === 'K') {
        event.preventDefault();
        togglePlay();
        return;
      }
      if (key === 'ArrowLeft') {
        event.preventDefault();
        skip(-5);
        return;
      }
      if (key === 'ArrowRight') {
        event.preventDefault();
        skip(5);
        return;
      }
      if (key === 'j' || key === 'J') {
        skip(-10);
        return;
      }
      if (key === 'l' || key === 'L') {
        skip(10);
        return;
      }
      if (key === 'f' || key === 'F') {
        toggleFullscreen();
        return;
      }
      if (key === 'm' || key === 'M') {
        toggleMute();
        return;
      }
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        event.preventDefault();
        const step = key === 'ArrowUp' ? 0.05 : -0.05;
        setVolume((prev) => {
          const next = Math.round((prev + step) * 20) / 20;
          return Math.min(1, Math.max(0, next));
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, toggleFullscreen, toggleMute]);

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(Number.isFinite(v.duration) ? v.duration : 0);
    setError(null);
    v.volume = volume;
    v.muted = muted;
    v.playbackRate = speed;
    if (v.textTracks.length > 0) {
      v.textTracks[0].mode = ccOn ? 'showing' : 'hidden';
      setCcAvailable(true);
    } else {
      setCcAvailable(false);
    }
    if (startAt > 3 && startAt < v.duration - 5) {
      v.currentTime = startAt;
    }
    lastTickRef.current = performance.now();
    if (autoPlay) {
      void v.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime);
    try {
      if (v.buffered.length > 0) {
        setBufferedEnd(v.buffered.end(v.buffered.length - 1));
      }
    } catch {
      setBufferedEnd(0);
    }
    const now = performance.now();
    if (now - lastTickRef.current >= 5000 && Number.isFinite(v.duration) && v.duration > 0) {
      lastTickRef.current = now;
      onTickRef.current(v.currentTime, v.duration);
    }
  };

  const handlePlay = () => {
    playingRef.current = true;
    setPlaying(true);
    showControls();
  };

  const handlePause = () => {
    playingRef.current = false;
    setPlaying(false);
    flush();
    setControlsVisible(true);
    window.clearTimeout(hideTimerRef.current);
  };

  const handleEnded = () => {
    playingRef.current = false;
    setPlaying(false);
    flush();
    onEnded();
  };

  const handleVideoClick = () => {
    if (clickTimerRef.current !== undefined) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = undefined;
      toggleFullscreen();
      return;
    }
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = undefined;
      togglePlay();
    }, 240);
  };

  const ratioFromClientX = (clientX: number): number => {
    const el = seekRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const handleSeekPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    setScrubRatio(ratioFromClientX(event.clientX));
  };

  const handleSeekPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setScrubRatio(ratioFromClientX(event.clientX));
  };

  const handleSeekPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const ratio = ratioFromClientX(event.clientX);
    setScrubRatio(null);
    if (duration > 0) seekTo(ratio * duration);
    flush();
  };

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    setVolume(next);
    if (next > 0) setMuted(false);
  };

  const displayTime = scrubRatio !== null && duration > 0 ? scrubRatio * duration : current;
  const playedRatio =
    duration > 0 ? Math.min(1, Math.max(0, displayTime / duration)) : 0;
  const bufferedRatio =
    duration > 0 ? Math.min(1, Math.max(0, bufferedEnd / duration)) : 0;

  return (
    <div
      ref={shellRef}
      className={`player-shell${controlsVisible ? '' : ' hide-cursor'}${
        fullscreen ? ' is-fullscreen' : ''
      }`}
      onPointerMove={showControls}
      onPointerLeave={() => {
        if (playingRef.current) setControlsVisible(false);
      }}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        onClick={handleVideoClick}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={() =>
          setError(
            'Playback failed. The file may be missing or its format/codec is not supported by this browser.',
          )
        }
      >
        {subtitleUrl && (
          <track kind="captions" src={subtitleUrl} srcLang="en" label="Subtitles" default />
        )}
      </video>
      {controlsVisible && !error && (
        <div className="player-topline">
          <span className="player-topline-title">{title}</span>
        </div>
      )}
      {!playing && !error && (
        <button type="button" className="player-big-play" onClick={togglePlay} aria-label="Play">
          <IconPlay size={30} />
        </button>
      )}
      {error && (
        <div className="player-error">
          <p>{error}</p>
          <p className="player-error-file">{title}</p>
        </div>
      )}
      <div className={`player-controls${controlsVisible ? '' : ' hidden'}`}>
        <div
          ref={seekRef}
          className="seek-bar"
          onPointerDown={handleSeekPointerDown}
          onPointerMove={handleSeekPointerMove}
          onPointerUp={handleSeekPointerUp}
        >
          <div className="seek-buffered" style={{ width: `${bufferedRatio * 100}%` }} />
          <div className="seek-played" style={{ width: `${playedRatio * 100}%` }} />
          <div className="seek-thumb" style={{ left: `${playedRatio * 100}%` }} />
        </div>
        <div className="controls-row">
          <button
            type="button"
            className="ctl-btn"
            onClick={togglePlay}
            title={playing ? 'Pause (k)' : 'Play (k)'}
          >
            {playing ? <IconPause /> : <IconPlay />}
          </button>
          <button type="button" className="ctl-btn" onClick={() => skip(-10)} title="Back 10s (j)">
            <IconSkipBack10 />
          </button>
          <button type="button" className="ctl-btn" onClick={() => skip(10)} title="Forward 10s (l)">
            <IconSkipFwd10 />
          </button>
          <button
            type="button"
            className="ctl-btn"
            disabled={!onPrev}
            onClick={onPrev ?? undefined}
            title="Previous lesson"
          >
            <IconPrev />
          </button>
          <button
            type="button"
            className="ctl-btn"
            disabled={!onNext}
            onClick={onNext ?? undefined}
            title="Next lesson"
          >
            <IconNext />
          </button>
          <div className="ctl-volume">
            <button
              type="button"
              className="ctl-btn"
              onClick={toggleMute}
              title={muted || volume === 0 ? 'Unmute (m)' : 'Mute (m)'}
            >
              {muted || volume === 0 ? <IconVolumeOff /> : <IconVolume />}
            </button>
            <input
              className="volume-range"
              type="range"
              min={0}
              max={1}
              step={0.05}
              aria-label="Volume"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
            />
          </div>
          <span className="ctl-time">
            {formatTime(displayTime)} <span className="ctl-time-sep">/</span> {formatTime(duration)}
          </span>
          <div className="ctl-spacer" />
          {ccAvailable && (
            <button
              type="button"
              className={`ctl-btn${ccOn ? ' on' : ''}`}
              onClick={toggleCc}
              title="Subtitles"
            >
              <IconCc />
            </button>
          )}
          <div className="speed-menu-wrap">
            <button
              type="button"
              className={`ctl-btn speed-btn${speed !== 1 ? ' on' : ''}`}
              onClick={() => setSpeedMenuOpen((open) => !open)}
              title="Playback speed"
            >
              {speed}×
            </button>
            {speedMenuOpen && (
              <>
                <div className="menu-backdrop" onClick={() => setSpeedMenuOpen(false)} />
                <div className="speed-menu">
                  {SPEEDS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`speed-option${option === speed ? ' active' : ''}`}
                      onClick={() => {
                        setSpeed(option);
                        setSpeedMenuOpen(false);
                      }}
                    >
                      {option === 1 ? '1× (Normal)' : `${option}×`}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {document.pictureInPictureEnabled && (
            <button type="button" className="ctl-btn" onClick={togglePip} title="Picture in picture">
              <IconPip />
            </button>
          )}
          <button
            type="button"
            className="ctl-btn"
            onClick={toggleFullscreen}
            title="Fullscreen (f)"
          >
            {fullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
          </button>
        </div>
      </div>
    </div>
  );
}
