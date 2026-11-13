import { SlopeChart, SlopeEncodings } from '@retikz/chart-react/line';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';

import { slopeData } from './slope-basic.data';

/** 只声明数据、布局与必要映射的坡度图 */
export const renderSlopeMinimal = (dimensions?: PreviewDimensions) => (
  <SlopeChart rows={slopeData} layout={dimensions ?? { width: 640, height: 320 }}>
    <SlopeEncodings entity="entity" start="previous" end="current" />
  </SlopeChart>
);
