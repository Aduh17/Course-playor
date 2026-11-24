import { useRef, type ChangeEvent } from 'react';
import { supportsFsa } from '../lib/fs';
import { IconFolder } from './icons';

export interface FolderPickerProps {
  variant: 'onboarding' | 'reconnect';
  rootName?: string;
  error?: string | null;
  onPickFsa: () => void;
  onReconnect: () => void;
  onFilesPicked: (files: File[]) => void;
}

const TREE = `Videos/  ← pick this folder
├─ Course A/
│  ├─ 01 Basics/
│  │  ├─ 1 Intro.mp4
│  │  └─ 2 Setup.mp4
│  └─ 02 Advanced/
│     └─ 1 Going deeper.mp4
└─ Course B/
   └─ Lesson 1.mp4`;

export default function FolderPicker({
  variant,
  rootName,
  error,
  onPickFsa,
  onReconnect,
  onFilesPicked,
}: FolderPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fsa = supportsFsa();

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFilesPicked(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  return (
    <div className="picker-screen">
      <div className="picker-card">
        <div className="picker-icon">
          <IconFolder size={30} />
        </div>
        {variant === 'onboarding' ? (
          <>
            <h1>Choose your video folder</h1>
            <p className="picker-sub">
              Each top-level folder becomes a course, nested folders become sections, and video files become
              lessons.
            </p>
            <pre className="picker-tree">{TREE}</pre>
            <div className="picker-actions">
              {fsa ? (
                <button type="button" className="btn btn-primary" onClick={onPickFsa}>
                  Select folder
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>
                  Select folder
                </button>
              )}
              <input
                ref={inputRef}
                type="file"
                multiple
                hidden
                {...({ webkitdirectory: '' } as Record<string, string>)}
                onChange={handleInputChange}
              />
            </div>
            {!fsa && (
              <p className="picker-note">
                Your browser doesn&apos;t support folder persistence &mdash; you&apos;ll need to select the
                folder again on every visit.
              </p>
            )}
          </>
        ) : (
          <>
            <h1>Reconnect your video folder</h1>
            <p className="picker-sub">
              Your browser needs permission again to read the folder. Reconnect to continue where you left
              off.
            </p>
            <div className="picker-actions">
              <button type="button" className="btn btn-primary" onClick={onReconnect}>
                Reconnect to &ldquo;{rootName ?? ''}&rdquo;
              </button>
              <button type="button" className="btn" onClick={onPickFsa}>
                Choose a different folder
              </button>
            </div>
          </>
        )}
        {error && <p className="picker-error">{error}</p>}
      </div>
    </div>
  );
}
