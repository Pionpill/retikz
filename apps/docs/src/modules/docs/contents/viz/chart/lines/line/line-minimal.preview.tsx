import { LineChart, LineEncodings } from '@retikz/chart-react/line';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';

import { lineData } from './line-basic.data';

/** 只声明数据、布局与必要映射的折线 */
export const renderLineMinimal = (dimensions?: PreviewDimensions) => (
  <LineChart rows={lineData} layout={dimensions ?? { width: 640, height: 320 }}>
    <LineEncodings x="x" y="y" series="series" />
  </LineChart>
);
