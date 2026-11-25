import { useEffect, useMemo } from 'react';
import type { Course } from '../types';
import type { LibrarySource } from '../lib/fs';
import { getContinueLesson, getCourseStats, useProgressStore } from '../lib/progress';
import { ensureLessonDurations, useDurationStore } from '../lib/durations';
import { flattenLessons, formatDuration } from '../lib/utils';
import { IconPlay } from './icons';

export interface LibraryProps {
  courses: Course[];
  source: LibrarySource;
  onOpenCourse: (courseId: string) => void;
}

export default function Library({ courses, source, onOpenCourse }: LibraryProps) {
  const progress = useProgressStore();
  const durations = useDurationStore();
  const lessonIds = useMemo(
    () => courses.flatMap((course) => flattenLessons(course.root).map((lesson) => lesson.id)),
    [courses],
  );

  useEffect(() => {
    ensureLessonDurations(source, lessonIds);
  }, [source, lessonIds]);

  return (
    <div className="library">
      <div className="library-head">
        <h2>Courses</h2>
        <span className="library-count">
          {courses.length} {courses.length === 1 ? 'course' : 'courses'}
        </span>
      </div>
      <div className="course-grid">
        {courses.map((course) => {
          const stats = getCourseStats(progress, course);
          const next = getContinueLesson(progress, course);
          const watchedPct = Math.round(stats.watchedRatio * 100);
          const totalDuration = flattenLessons(course.root).reduce(
            (sum, lesson) => sum + (durations[lesson.id] ?? 0),
            0,
          );
          const durationLabel = formatDuration(totalDuration);
          const label =
            stats.completed === 0 ? 'Start' : stats.completed >= stats.total ? 'Rewatch' : 'Continue';
          return (
            <article
              key={course.id}
              className="course-card"
              onClick={() => onOpenCourse(course.id)}
              role="button"
              tabIndex={0}
            >
              <div className="course-card-icon">
                <IconPlay size={20} />
              </div>
              <h3 className="course-card-title">{course.name}</h3>
              <div className="course-card-meta">
                {stats.completed} of {stats.total} lessons
                {durationLabel ? ` · ${durationLabel}` : ''}
              </div>
              <div className="course-card-progress">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${watchedPct}%` }} />
                </div>
                <span className="course-card-pct">
                  {watchedPct > 0 ? `${watchedPct}% watched` : 'Not started'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-primary course-card-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenCourse(course.id);
                }}
              >
                {label}
              </button>
              {stats.completed > 0 && stats.completed < stats.total && next && (
                <div className="course-card-next">Up next · {next.name}</div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
