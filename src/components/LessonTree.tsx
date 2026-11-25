import { useEffect, useRef, type CSSProperties } from 'react';
import type { Course, Lesson, ProgressMap, SectionNode } from '../types';
import { countLessons, flattenLessons, formatTime } from '../lib/utils';
import { useDurationStore } from '../lib/durations';

interface TreeLessonRowProps {
  lesson: Lesson;
  active: boolean;
  progress: ProgressMap;
  onSelect: (id: string) => void;
}

function TreeLessonRow({ lesson, active, progress, onSelect }: TreeLessonRowProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const durations = useDurationStore();
  const duration = durations[lesson.id];
  const entry = progress[lesson.id];
  const completed = Boolean(entry?.completed);
  const watched = entry?.watchedRatio ?? 0;
  const partial = !completed && watched > 0.01;

  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest' });
    }
  }, [active]);

  return (
    <button
      ref={ref}
      type="button"
      className={`tree-lesson${active ? ' active' : ''}`}
      onClick={() => onSelect(lesson.id)}
    >
      <span
        className={`tree-status${completed ? ' done' : partial ? ' partial' : ''}`}
        style={partial ? ({ '--ring': `${Math.round(watched * 100)}%` } as CSSProperties) : undefined}
      />
      <span className="tree-lesson-name">{lesson.name}</span>
      {duration ? <span className="tree-lesson-duration">{formatTime(duration)}</span> : null}
    </button>
  );
}

interface TreeNodeProps {
  node: SectionNode;
  activeId: string | null;
  progress: ProgressMap;
  onSelect: (id: string) => void;
}

function TreeNode({ node, activeId, progress, onSelect }: TreeNodeProps) {
  return (
    <div className="tree-node">
      {node.lessons.map((lesson) => (
        <TreeLessonRow
          key={lesson.id}
          lesson={lesson}
          active={lesson.id === activeId}
          progress={progress}
          onSelect={onSelect}
        />
      ))}
      {node.children.map((child) => {
        const done = flattenLessons(child).filter((lesson) => progress[lesson.id]?.completed).length;
        return (
          <div key={child.id} className="tree-section">
            <div className="tree-section-head">
              <span>{child.name}</span>
              <span className="tree-section-count">
                {done}/{countLessons(child)}
              </span>
            </div>
            <TreeNode node={child} activeId={activeId} progress={progress} onSelect={onSelect} />
          </div>
        );
      })}
    </div>
  );
}

export interface LessonTreeProps {
  course: Course;
  activeId: string | null;
  progress: ProgressMap;
  onSelect: (id: string) => void;
}

export default function LessonTree({ course, activeId, progress, onSelect }: LessonTreeProps) {
  return <TreeNode node={course.root} activeId={activeId} progress={progress} onSelect={onSelect} />;
}
