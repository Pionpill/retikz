import type { FC } from 'react';

import type { ChartIconProps } from './types';

/** 坡度图图标 */
export const SlopeChartIcon: FC<ChartIconProps> = props => (
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
    <path d="M5 3v18M19 3v18" />
    <path d="M5 7l14 9M5 17L19 6" />
  </svg>
);
