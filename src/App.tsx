import { useEffect, useState } from 'react';
import FolderPicker from './components/FolderPicker';
import Library from './components/Library';
import CourseView from './components/CourseView';
import { loadPersistedSource, makeFilesSource, pickFsaSource, supportsFsa } from './lib/fs';
import type { LibrarySource } from './lib/fs';
import { resetAllProgress } from './lib/progress';
import type { Course } from './types';

type Phase = 'boot' | 'pick' | 'reconnect' | 'scanning' | 'empty' | 'ready';
type View = { name: 'library' } | { name: 'course'; courseId: string };

export default function App() {
  const [phase, setPhase] = useState<Phase>('boot');
  const [source, setSource] = useState<LibrarySource | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [view, setView] = useState<View>({ name: 'library' });
  const [error, setError] = useState<string | null>(null);

  async function scan(src: LibrarySource): Promise<void> {
    setPhase('scanning');
    setError(null);

    try {
      const list = await src.scan();
      setCourses(list);
      setView((v) => (v.name === 'course' && list.some((c) => c.id === v.courseId) ? v : { name: 'library' }));
      setPhase(list.length > 0 ? 'ready' : 'empty');
    } catch (err) {
      setError(`Could not read the folder: ${(err as Error).message}`);
      setPhase('pick');
    }
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let stored: LibrarySource | null = null;

      try {
        stored = await loadPersistedSource();
      } catch {
        stored = null;
      }

      if (cancelled) return;
      if (!stored) {
        setPhase('pick');
        return;
      }

      setSource(stored);

      if (stored.needsPermission) {
        setPhase('reconnect');
        return;
      }

      await scan(stored);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePickFsa(): Promise<void> {
    setError(null);

    try {
      const src = await pickFsaSource();
      if (!src) return;
      setSource(src);
      await scan(src);
    } catch (err) {
      setError(`Folder access was denied: ${(err as Error).message}`);
      setPhase('pick');
    }
  }

  async function handleReconnect(): Promise<void> {
    if (!source) return;
    setError(null);

    const granted = await source.requestPermission();

    if (granted) {
      await scan(source);
    } else {
      setError('Permission was denied. Click "Reconnect" and allow access to continue.');
    }
  }

  function handleFilesPicked(files: File[]): void {
    const src = makeFilesSource(files);
    setSource(src);
    void scan(src);
  }

  function handleChangeFolder(): void {
    setError(null);

    if (supportsFsa()) {
      void handlePickFsa();
    } else {
      setSource(null);
      setCourses([]);
      setPhase('pick');
    }
  }

  function handleResetProgress(): void {
    if (window.confirm('Reset watch progress for all courses? This cannot be undone.')) {
      resetAllProgress();
    }
  }

  if (phase === 'boot' || phase === 'scanning') {
    return (
      <div className="boot-screen">
        <div className="spinner" />
        <p>{phase === 'boot' ? 'Loading your library…' : 'Scanning your video folder…'}</p>
      </div>
    );
  }

  if (phase === 'pick' || phase === 'reconnect') {
    return (
      <FolderPicker
        variant={phase === 'reconnect' ? 'reconnect' : 'onboarding'}
        rootName={source?.rootName}
        error={error}
        onPickFsa={handlePickFsa}
        onReconnect={handleReconnect}
        onFilesPicked={handleFilesPicked}
      />
    );
  }

  const activeCourse = view.name === 'course' ? courses.find((c) => c.id === view.courseId) : undefined;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-dot" />
          Course Player
        </div>
        {source && (
          <span className="folder-chip" title={source.rootName}>
            {source.rootName}
          </span>
        )}
        <div className="header-actions">
          {view.name === 'course' && (
            <button type="button" className="btn btn-ghost" onClick={() => setView({ name: 'library' })}>
              Courses
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={handleChangeFolder}>
            Change folder
          </button>
          <button type="button" className="btn btn-ghost danger" onClick={handleResetProgress}>
            Reset progress
          </button>
        </div>
      </header>
      {phase === 'empty' ? (
        <div className="empty-screen">
          <h2>No videos found</h2>
          <p>The folder "{source?.rootName}" doesn't contain any supported video files (mp4, webm, mov, mkv, m4v, ogv).</p>
          <button type="button" className="btn btn-primary" onClick={handleChangeFolder}>
            Choose another folder
          </button>
        </div>
      ) : activeCourse && source ? (
        <CourseView
          key={activeCourse.id}
          course={activeCourse}
          source={source}
          onBack={() => setView({ name: 'library' })}
        />
      ) : (
        <Library courses={courses} onOpenCourse={(courseId) => setView({ name: 'course', courseId })} />
      )}
    </div>
  );
}
