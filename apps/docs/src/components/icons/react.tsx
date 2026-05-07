import type { ComponentProps, FC } from 'react';

/** React 官方 logo（中心圆 + 三组 60° 错开的轨道椭圆） */
export const ReactIcon: FC<ComponentProps<'svg'>> = props => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="2.05" />
    <g fill="none" stroke="currentColor" strokeWidth="1">
      <ellipse cx="12" cy="12" rx="10" ry="4.5" />
      <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)" />
    </g>
  </svg>
);
