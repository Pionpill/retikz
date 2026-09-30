import type { FC } from 'react';

import type { ChartIconProps } from './types';

/** 气泡图图标 */
export const BubbleChartIcon: FC<ChartIconProps> = props => (
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
    <circle cx="8" cy="15" r="1.5" />
    <circle cx="15" cy="11" r="3" />
    <circle cx="19" cy="5" r=".5" fill="currentColor" />
  </svg>
);
