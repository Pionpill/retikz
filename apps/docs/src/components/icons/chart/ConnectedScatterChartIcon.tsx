import type { FC } from 'react';

import type { ChartIconProps } from './types';

/** 连线散点图图标 */
export const ConnectedScatterChartIcon: FC<ChartIconProps> = props => (
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
    <path d="m7.5 16.5 4-5 5 2 2-8" />
    <circle cx="7.5" cy="16.5" r=".5" fill="currentColor" />
    <circle cx="11.5" cy="11.5" r=".5" fill="currentColor" />
    <circle cx="16.5" cy="13.5" r=".5" fill="currentColor" />
    <circle cx="18.5" cy="5.5" r=".5" fill="currentColor" />
  </svg>
);
