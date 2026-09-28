import type { FC } from 'react';

import type { ChartIconProps } from './types';

/** 范围点图图标 */
export const RangedDotChartIcon: FC<ChartIconProps> = props => (
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
    <path d="M7 9h12M9 15h9M7 7v4m12-4v4M9 13v4m9-4v4" />
    <circle cx="14" cy="9" r=".5" fill="currentColor" />
    <circle cx="12" cy="15" r=".5" fill="currentColor" />
  </svg>
);
