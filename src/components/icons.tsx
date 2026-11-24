type IconProps = { size?: number };

export function IconPlay({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

export function IconPause({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="7" y="5" width="3.6" height="14" rx="1.1" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.1" />
    </svg>
  );
}

export function IconPrev({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="4.8" y="5.5" width="2.4" height="13" rx="1" />
      <path d="M18 5.5v13l-9-6.5z" />
    </svg>
  );
}

export function IconNext({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5.5v13l9-6.5z" />
      <rect x="16.8" y="5.5" width="2.4" height="13" rx="1" />
    </svg>
  );
}

export function IconSkipBack10({ size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.4 5.3 9 8l3.4 2.7" />
      <path d="M9 8h5.1a5.9 5.9 0 0 1 0 11.8H9.6" />
      <text x="12" y="16.6" fontSize={7} fontWeight={700} textAnchor="middle" fill="currentColor" stroke="none">
        10
      </text>
    </svg>
  );
}

export function IconSkipFwd10({ size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11.6 5.3 15 8l-3.4 2.7" />
      <path d="M15 8H9.9a5.9 5.9 0 0 0 0 11.8h4.5" />
      <text x="12" y="16.6" fontSize={7} fontWeight={700} textAnchor="middle" fill="currentColor" stroke="none">
        10
      </text>
    </svg>
  );
}

export function IconVolume({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 9h3.6l4.4-4v14l-4.4-4H3z" />
      <path
        d="M15 8.6a4.9 4.9 0 0 1 0 6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <path
        d="M17.6 6a8.6 8.6 0 0 1 0 12"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconVolumeOff({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 9h3.6l4.4-4v14l-4.4-4H3z" />
      <path
        d="M15 9.4l4.6 5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <path
        d="M19.6 9.4L15 14.6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconFullscreen({ size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9V4h5" />
      <path d="M20 9V4h-5" />
      <path d="M4 15v5h5" />
      <path d="M20 15v5h-5" />
    </svg>
  );
}

export function IconFullscreenExit({ size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 4v5H4" />
      <path d="M15 4v5h5" />
      <path d="M9 20v-5H4" />
      <path d="M15 20v-5h5" />
    </svg>
  );
}

export function IconPip({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth={1.8} />
      <rect x="11.6" y="11.2" width="6.9" height="5.6" rx="1" fill="currentColor" />
    </svg>
  );
}

export function IconCc({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth={1.8} />
      <path
        d="M10.6 10.1a2.5 2.5 0 1 0 0 3.8"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <path
        d="M16.1 10.1a2.5 2.5 0 1 0 0 3.8"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconFolder({ size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.1l2.1 2.6h8.8A1.5 1.5 0 0 1 21 10.1v6.4A1.5 1.5 0 0 1 19.5 18h-15A1.5 1.5 0 0 1 3 16.5z" />
    </svg>
  );
}
