import type { Course } from '../types';
import { getContinueLesson, getCourseStats, useProgressStore } from '../lib/progress';
import { IconPlay } from './icons';

export interface LibraryProps {
  courses: Course[];
  onOpenCourse: (courseId: string) => void;
}

export default function Library({ courses, onOpenCourse }: LibraryProps) {
  const progress = useProgressStore();

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
          const pct = Math.round(stats.ratio * 100);
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
                {stats.completed} of {stats.total} lessons{pct > 0 ? ` · ${pct}% complete` : ''}
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
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
