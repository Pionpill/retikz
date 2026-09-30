import type { FC } from 'react';

import type { ChartIconProps } from './types';

/** 条带图图标 */
export const StripChartIcon: FC<ChartIconProps> = props => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M9 19v2m8-2v2" />
    <circle cx="9" cy="7" r=".5" fill="currentColor" />
    <circle cx="9.5" cy="12" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="17" r=".5" fill="currentColor" />
    <circle cx="17" cy="7" r=".5" fill="currentColor" />
    <circle cx="16.5" cy="12" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="17" r=".5" fill="currentColor" />
  </svg>
);
