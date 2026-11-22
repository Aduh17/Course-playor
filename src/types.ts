export interface Lesson {
  id: string;
  name: string;
}

export interface SectionNode {
  id: string;
  name: string;
  lessons: Lesson[];
  children: SectionNode[];
}

export interface Course {
  id: string;
  name: string;
  root: SectionNode;
  totalLessons: number;
}

export interface LessonProgress {
  position: number;
  duration: number;
  furthest: number;
  watchedRatio: number;
  completed: boolean;
  lastWatchedAt: number;
}

export type ProgressMap = Record<string, LessonProgress>;
