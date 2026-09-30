import type { FC } from 'react';

import type { ChartIconProps } from './types';

/** 回归图图标 */
export const RegressionChartIcon: FC<ChartIconProps> = props => (
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
    <path d="M7 17 19 7" />
    <circle cx="9" cy="12" r=".5" fill="currentColor" />
    <circle cx="14" cy="15" r=".5" fill="currentColor" />
    <circle cx="17" cy="6" r=".5" fill="currentColor" />
  </svg>
);
