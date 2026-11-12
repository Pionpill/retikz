import { LineChart } from '@retikz/chart-react/line';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';

import { lineData } from './line-basic.data';
import type { LineMarkValues } from './line-mark.controls';

/** 折线示例交互 */
export const renderLineMark = (values: LineMarkValues, dimensions?: PreviewDimensions) => (
  <LineChart
    rows={lineData}
    layout={{ ...(dimensions ?? { width: 640, height: 360 }), padding: 24 }}
    recipe={{
      encodings: { x: 'x', y: 'y', series: 'series' },
      marks: [
        {
          kind: 'line',
          override: values.override,
          properties: { point: values.point, path: { curve: 'step', stroke: '#a855f7' } },
        },
      ],
    }}
  />
);
