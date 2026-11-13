import { LineChart } from '@retikz/chart-react/line';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';

import { lineData } from './line-basic.data';
import type { LineGapsValues } from './line-gaps.controls';

/** 折线示例交互 */
export const renderLineGaps = (values: LineGapsValues, dimensions?: PreviewDimensions) => (
  <LineChart
    rows={lineData}
    layout={{ ...(dimensions ?? { width: 640, height: 360 }), padding: 24 }}
    recipe={{
      encodings: { x: 'x', y: 'y', series: 'series' },
      properties: { point: values.point, path: { connectNulls: values.connectNulls } },
    }}
  />
);
