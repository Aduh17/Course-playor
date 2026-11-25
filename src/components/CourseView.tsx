import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { Course } from '../types';
import type { LibrarySource } from '../lib/fs';
import { flattenLessons } from '../lib/utils';
import { ensureLessonDurations } from '../lib/durations';
import {
  getContinueLesson,
  markLessonCompleted,
  recordWatch,
  useProgressStore,
} from '../lib/progress';
import { IconSidebar } from './icons';
import LessonTree from './LessonTree';
import VideoPlayer from './VideoPlayer';

const SIDEBAR_KEY = 'vcp:sidebar-width:v1';
const SIDEBAR_COLLAPSED_KEY = 'vcp:sidebar-collapsed:v1';
const MIN_SIDEBAR = 240;
const MAX_SIDEBAR = 480;
const DEFAULT_SIDEBAR = 320;

function clampSidebar(width: number): number {
  return Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, width));
}

function loadSidebarWidth(): number {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_KEY);
    const value = raw ? Number(raw) : NaN;
    if (Number.isFinite(value)) return clampSidebar(value);
  } catch {
    void 0;
  }
  return DEFAULT_SIDEBAR;
}

function loadSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export interface CourseViewProps {
  course: Course;
  source: LibrarySource;
  onBack: () => void;
}

export default function CourseView({ course, source, onBack }: CourseViewProps) {
  const progress = useProgressStore();
  const flat = useMemo(() => flattenLessons(course.root), [course]);
  const [activeId, setActiveId] = useState<string | null>(
    () => getContinueLesson(progress, course)?.id ?? flat[0]?.id ?? null,
  );
  const [nonce, setNonce] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(loadSidebarWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(loadSidebarCollapsed);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const advanceTimerRef = useRef<number | undefined>(undefined);

  const activeIndex = activeId ? flat.findIndex((lesson) => lesson.id === activeId) : -1;
  const activeLesson = activeIndex >= 0 ? flat[activeIndex] : undefined;
  const activeProgress = activeId ? progress[activeId] : undefined;
  const completedCount = flat.filter((lesson) => progress[lesson.id]?.completed).length;
  const watchedPct =
    flat.length > 0
      ? Math.round(
          (flat.reduce((sum, lesson) => sum + (progress[lesson.id]?.watchedRatio ?? 0), 0) /
            flat.length) *
            100,
        )
      : 0;

  useEffect(() => {
    ensureLessonDurations(source, flat.map((lesson) => lesson.id));
  }, [source, flat]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      void 0;
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setVideoUrl(null);
    setSubtitleUrl(null);
    const load = async () => {
      try {
        const file = await source.getLessonFile(activeId);
        const vtt = await source.getSubtitleFile(activeId);
        if (cancelled) return;
        setVideoUrl(URL.createObjectURL(file));
        setSubtitleUrl(vtt ? URL.createObjectURL(vtt) : null);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setLoadError(
          'Could not load this video. The file may have been moved, renamed, or deleted.',
        );
        setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeId, source]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (subtitleUrl) URL.revokeObjectURL(subtitleUrl);
    };
  }, [videoUrl, subtitleUrl]);

  useEffect(() => {
    return () => {
      window.clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const handleResizeStart = (event: PointerEvent<HTMLDivElement>) => {
    const aside = event.currentTarget.parentElement;
    const startWidth = aside?.getBoundingClientRect().width ?? sidebarWidth;
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = { startX: event.clientX, startWidth };
  };

  const handleResizeMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = resizeRef.current;
    if (!state) return;
    setSidebarWidth(clampSidebar(state.startWidth + (event.clientX - state.startX)));
  };

  const handleResizeEnd = () => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    try {
      window.localStorage.setItem(SIDEBAR_KEY, String(sidebarWidth));
    } catch {
      void 0;
    }
  };

  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 880px)').matches) {
      setSidebarOpen((open) => !open);
      return;
    }
    setSidebarCollapsed((collapsed) => !collapsed);
  };

  const goTo = (lessonId: string) => {
    window.clearTimeout(advanceTimerRef.current);
    setFinished(false);
    setSidebarOpen(false);
    if (lessonId === activeId) {
      setNonce((value) => value + 1);
    } else {
      setActiveId(lessonId);
    }
  };

  const goPrev = () => {
    if (activeIndex > 0) goTo(flat[activeIndex - 1].id);
  };

  const goNext = () => {
    if (activeIndex >= 0 && activeIndex < flat.length - 1) goTo(flat[activeIndex + 1].id);
  };

  const handleEnded = () => {
    if (!activeId) return;
    markLessonCompleted(activeId);
    if (activeIndex >= 0 && activeIndex < flat.length - 1) {
      advanceTimerRef.current = window.setTimeout(() => goTo(flat[activeIndex + 1].id), 1200);
    } else {
      setFinished(true);
    }
  };

  return (
    <div
      className={`course-view${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}
    >
      <aside className={`course-sidebar${sidebarOpen ? ' open' : ''}`}>
        <LessonTree course={course} activeId={activeId} progress={progress} onSelect={goTo} />
        <div
          className="sidebar-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize lesson list"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
        />
      </aside>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <main className="course-main">
        <div className="course-topbar">
          <button
            type="button"
            className="btn btn-ghost icon-btn lessons-toggle"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Show lessons' : 'Hide lessons'}
            aria-label={sidebarCollapsed ? 'Show lessons' : 'Hide lessons'}
            aria-expanded={!sidebarCollapsed}
          >
            <IconSidebar />
          </button>
          <button type="button" className="btn btn-ghost back-btn" onClick={onBack}>
            ← Courses
          </button>
          <div className="course-topbar-info">
            <h2 className="course-topbar-title">{course.name}</h2>
            <div className="course-topbar-meta">
              <span>
                {completedCount} / {flat.length} lessons
              </span>
              <div className="progress-track small">
                <div className="progress-fill" style={{ width: `${watchedPct}%` }} />
              </div>
              <span>{watchedPct}% watched</span>
            </div>
          </div>
        </div>
        <div className="course-player-area">
          {videoUrl && (
            <VideoPlayer
              key={`${activeId}_${nonce}`}
              src={videoUrl}
              subtitleUrl={subtitleUrl}
              title={activeLesson?.name ?? ''}
              startAt={!activeProgress?.completed ? (activeProgress?.position ?? 0) : 0}
              autoPlay
              onTick={(position, duration) => {
                if (activeId) recordWatch(activeId, position, duration);
              }}
              onEnded={handleEnded}
              onPrev={activeIndex > 0 ? goPrev : null}
              onNext={activeIndex >= 0 && activeIndex < flat.length - 1 ? goNext : null}
            />
          )}
          {loading && !loadError && (
            <div className="player-placeholder">
              <div className="spinner" />
              <span>Loading video…</span>
            </div>
          )}
          {loadError && (
            <div className="player-placeholder error">
              <span>{loadError}</span>
            </div>
          )}
          {finished && (
            <div className="player-placeholder finished">
              <h3>Course complete</h3>
              <p>You finished “{course.name}”.</p>
              <div className="placeholder-actions">
                <button type="button" className="btn btn-primary" onClick={onBack}>
                  Back to courses
                </button>
                {flat.length > 0 && (
                  <button type="button" className="btn" onClick={() => goTo(flat[0].id)}>
                    Watch again
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="course-bottombar">
          <div className="course-bottombar-title">
            <h3>{activeLesson?.name ?? '—'}</h3>
            <span className="course-bottombar-index">
              {activeIndex >= 0 ? `Lesson ${activeIndex + 1} of ${flat.length}` : ''}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
