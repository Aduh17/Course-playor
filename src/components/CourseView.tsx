import { useEffect, useMemo, useRef, useState } from 'react';
import type { Course } from '../types';
import type { LibrarySource } from '../lib/fs';
import { flattenLessons } from '../lib/utils';
import {
  getContinueLesson,
  markLessonCompleted,
  recordWatch,
  useProgressStore,
} from '../lib/progress';
import LessonTree from './LessonTree';
import VideoPlayer from './VideoPlayer';

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
  const advanceTimerRef = useRef<number | undefined>(undefined);

  const activeIndex = activeId ? flat.findIndex((lesson) => lesson.id === activeId) : -1;
  const activeLesson = activeIndex >= 0 ? flat[activeIndex] : undefined;
  const activeProgress = activeId ? progress[activeId] : undefined;
  const completedCount = flat.filter((lesson) => progress[lesson.id]?.completed).length;
  const pct = flat.length > 0 ? (completedCount / flat.length) * 100 : 0;

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
    <div className="course-view">
      <aside className={`course-sidebar${sidebarOpen ? ' open' : ''}`}>
        <LessonTree course={course} activeId={activeId} progress={progress} onSelect={goTo} />
      </aside>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <main className="course-main">
        <div className="course-topbar">
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
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost lessons-toggle"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            Lessons
          </button>
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
