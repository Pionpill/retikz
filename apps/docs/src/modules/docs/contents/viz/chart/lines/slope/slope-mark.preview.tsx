import { SlopeChart } from '@retikz/chart-react/line';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';

import { slopeData } from './slope-basic.data';
import type { SlopeMarkValues } from './slope-mark.controls';

/** 每行独立连接两个阶段，点和标签复用图表能力 */
export const renderSlopeMark = (values: SlopeMarkValues, dimensions?: PreviewDimensions) => (
  <SlopeChart
    rows={slopeData}
    layout={{ ...(dimensions ?? { width: 640, height: 360 }), padding: 24 }}
    recipe={{
      encodings: { entity: 'entity', start: 'previous', end: 'current' },
      properties: { path: { strokeWidth: 2 } },
      marks: [
        {
          kind: 'slope',
          override: values.override,
          properties: {
            path: { stroke: '#a855f7', strokeWidth: 2, dashPattern: [5, 4] },
            point: values.point,
            label: false,
          },
        },
      ],
    }}
  />
);
