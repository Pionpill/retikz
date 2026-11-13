import { SlopeChart } from '@retikz/chart-react/line';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';

import { slopeFacetData } from './slope-basic.data';
import type { SlopeFacetValues } from './slope-facet.controls';

/** 每行独立连接两个阶段，点和标签复用图表能力 */
export const renderSlopeFacet = (values: SlopeFacetValues, dimensions?: PreviewDimensions) => (
  <SlopeChart
    rows={slopeFacetData}
    layout={{ ...(dimensions ?? { width: 640, height: 360 }), padding: 24 }}
    recipe={{
      encodings: { entity: 'entity', start: 'previous', end: 'current', ...(values.facet ? { row: 'region' } : {}) },
    }}
  />
);
