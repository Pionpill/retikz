import { SlopeChart } from '@retikz/chart-react/line';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';

import { slopeMappingRows } from './slope-basic.data';
import type { SlopeMappingValues } from './slope-mapping.controls';

/** 每行独立连接两个阶段，点和标签复用图表能力 */
export const renderSlopeMapping = (values: SlopeMappingValues, dimensions?: PreviewDimensions) => (
  <SlopeChart
    rows={slopeMappingRows(values.shuffle)}
    layout={{ ...(dimensions ?? { width: 640, height: 360 }), padding: 24 }}
    recipe={{
      encodings: {
        entity: 'entity',
        start: values.reverse ? 'current' : 'previous',
        end: values.reverse ? 'previous' : 'current',
      },
    }}
  />
);
