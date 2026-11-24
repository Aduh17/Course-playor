import type { Course, SectionNode } from '../types';
import { idbGet, idbSet } from './idb';
import { basename, countLessons, dirname, isVideoFile, joinPath, naturalCompare, stripExt } from './utils';

const HANDLE_KEY = 'root-dir-handle';

export interface LibrarySource {
  mode: 'fsa' | 'files';
  rootName: string;
  needsPermission: boolean;
  requestPermission(): Promise<boolean>;
  scan(): Promise<Course[]>;
  getLessonFile(lessonId: string): Promise<File>;
  getSubtitleFile(lessonId: string): Promise<File | null>;
}

type PermissibleDirHandle = FileSystemDirectoryHandle & {
  queryPermission?: (d?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (d?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
};

export function supportsFsa(): boolean {
  const w = window as unknown as { showDirectoryPicker?: unknown };
  return typeof w.showDirectoryPicker === 'function';
}

async function* listEntries(dir: FileSystemDirectoryHandle): AsyncGenerator<[string, FileSystemHandle]> {
  const entriesFn = (dir as unknown as { entries?: () => AsyncIterableIterator<[string, FileSystemHandle]> })
    .entries;
  if (typeof entriesFn !== 'function') return;
  for await (const entry of entriesFn.call(dir)) {
    yield entry;
  }
}

async function scanDir(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  name: string,
): Promise<SectionNode> {
  const node: SectionNode = { id: prefix, name, lessons: [], children: [] };
  for await (const [entryName, handle] of listEntries(dir)) {
    if (handle.kind === 'file') {
      if (isVideoFile(entryName)) {
        node.lessons.push({ id: joinPath(prefix, entryName), name: stripExt(entryName) });
      }
    } else if (handle.kind === 'directory') {
      const childPrefix = joinPath(prefix, entryName);
      const child = await scanDir(handle as FileSystemDirectoryHandle, childPrefix, entryName);
      if (child.lessons.length > 0 || child.children.length > 0) {
        node.children.push(child);
      }
    }
  }
  node.lessons.sort((a, b) => naturalCompare(a.name, b.name));
  node.children.sort((a, b) => naturalCompare(a.name, b.name));
  return node;
}

async function getFileFrom(root: FileSystemDirectoryHandle, id: string): Promise<File> {
  const segments = id.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) throw new Error(`Invalid lesson id: ${id}`);
  let dir = root;
  for (let i = 0; i < segments.length - 1; i += 1) {
    dir = await dir.getDirectoryHandle(segments[i]);
  }
  const fileHandle = await dir.getFileHandle(segments[segments.length - 1]);
  return fileHandle.getFile();
}

function makeFsaSource(handle: FileSystemDirectoryHandle): LibrarySource {
  return {
    mode: 'fsa',
    rootName: handle.name,
    needsPermission: false,
    async requestPermission(): Promise<boolean> {
      const perm = handle as PermissibleDirHandle;
      if (perm.queryPermission) {
        const state = await perm.queryPermission({ mode: 'read' });
        if (state === 'granted') return true;
      }
      if (perm.requestPermission) {
        const state = await perm.requestPermission({ mode: 'read' });
        return state === 'granted';
      }
      return true;
    },
    async scan(): Promise<Course[]> {
      const rootNode = await scanDir(handle, '', handle.name);
      const courses: Course[] = rootNode.children.map((child) => ({
        id: child.name,
        name: child.name,
        root: child,
        totalLessons: countLessons(child),
      }));
      if (rootNode.lessons.length > 0) {
        courses.push({
          id: handle.name,
          name: handle.name,
          root: { id: '', name: handle.name, lessons: rootNode.lessons, children: [] },
          totalLessons: rootNode.lessons.length,
        });
      }
      courses.sort((a, b) => naturalCompare(a.name, b.name));
      return courses;
    },
    async getLessonFile(lessonId: string): Promise<File> {
      return getFileFrom(handle, lessonId);
    },
    async getSubtitleFile(lessonId: string): Promise<File | null> {
      try {
        const vttId = joinPath(dirname(lessonId), stripExt(basename(lessonId)) + '.vtt');
        return await getFileFrom(handle, vttId);
      } catch {
        return null;
      }
    },
  };
}

export async function pickFsaSource(): Promise<LibrarySource | null> {
  const picker = (
    window as unknown as {
      showDirectoryPicker?: (opts?: {
        mode?: 'read' | 'readwrite';
        id?: string;
      }) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;
  if (typeof picker !== 'function') return null;
  let handle: FileSystemDirectoryHandle;
  try {
    handle = await picker.call(window, { mode: 'read', id: 'vcp-root' });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return null;
    throw err;
  }
  await idbSet(HANDLE_KEY, handle);
  return makeFsaSource(handle);
}

export async function loadPersistedSource(): Promise<LibrarySource | null> {
  if (!supportsFsa()) return null;
  let handle: FileSystemDirectoryHandle | undefined;
  try {
    handle = await idbGet<FileSystemDirectoryHandle>(HANDLE_KEY);
  } catch {
    return null;
  }
  if (!handle) return null;
  const source = makeFsaSource(handle);
  const perm = handle as PermissibleDirHandle;
  if (perm.queryPermission) {
    try {
      source.needsPermission = (await perm.queryPermission({ mode: 'read' })) !== 'granted';
    } catch {
      void 0;
    }
  }
  return source;
}

export function makeFilesSource(fileList: File[]): LibrarySource {
  const videoFiles = new Map<string, File>();
  const allFiles = new Map<string, File>();
  let rootName = 'Videos';

  for (const file of fileList) {
    const rel = file.webkitRelativePath || file.name;
    const parts = rel.split('/');
    let id = rel;
    if (parts.length > 1) {
      rootName = parts[0];
      id = parts.slice(1).join('/');
    }
    allFiles.set(id, file);
    if (isVideoFile(file.name)) videoFiles.set(id, file);
  }

  const courses: Course[] = [];
  const courseByName = new Map<string, Course>();

  function sectionFor(node: SectionNode, segments: string[]): SectionNode {
    let current = node;
    for (const segment of segments) {
      const childId = joinPath(current.id, segment);
      let child = current.children.find((entry) => entry.id === childId);
      if (!child) {
        child = { id: childId, name: segment, lessons: [], children: [] };
        current.children.push(child);
      }
      current = child;
    }
    return current;
  }

  for (const id of videoFiles.keys()) {
    const parts = id.split('/');
    const looseRoot = parts.length === 1;
    const courseName = looseRoot ? rootName : parts[0];
    let course = courseByName.get(courseName);
    if (!course) {
      course = {
        id: courseName,
        name: courseName,
        root: {
          id: looseRoot ? '' : courseName,
          name: courseName,
          lessons: [],
          children: [],
        },
        totalLessons: 0,
      };
      courseByName.set(courseName, course);
      courses.push(course);
    }
    const section = sectionFor(course.root, looseRoot ? [] : parts.slice(1, -1));
    section.lessons.push({ id, name: stripExt(parts[parts.length - 1]) });
  }

  function sortNode(node: SectionNode): void {
    node.lessons.sort((a, b) => naturalCompare(a.name, b.name));
    node.children.sort((a, b) => naturalCompare(a.name, b.name));
    for (const child of node.children) {
      sortNode(child);
    }
  }

  for (const course of courses) {
    sortNode(course.root);
    course.totalLessons = countLessons(course.root);
  }
  courses.sort((a, b) => naturalCompare(a.name, b.name));

  return {
    mode: 'files',
    rootName,
    needsPermission: false,
    async requestPermission(): Promise<boolean> {
      return true;
    },
    async scan(): Promise<Course[]> {
      return courses;
    },
    async getLessonFile(lessonId: string): Promise<File> {
      const file = videoFiles.get(lessonId);
      if (!file) throw new Error('Video file not found: ' + lessonId);
      return file;
    },
    async getSubtitleFile(lessonId: string): Promise<File | null> {
      const i = lessonId.lastIndexOf('.');
      const vttId = i === -1 ? lessonId + '.vtt' : lessonId.slice(0, i) + '.vtt';
      return allFiles.get(vttId) ?? null;
    },
  };
}
