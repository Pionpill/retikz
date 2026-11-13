import { LineChart } from '@retikz/chart-react/line';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';

import { lineMappingRows } from './line-basic.data';
import type { LineMappingValues } from './line-mapping.controls';

/** 折线示例交互 */
export const renderLineMapping = (values: LineMappingValues, dimensions?: PreviewDimensions) => (
  <LineChart
    rows={lineMappingRows(values.shuffle)}
    layout={{ ...(dimensions ?? { width: 640, height: 360 }), padding: 24 }}
    recipe={{
      encodings: {
        x: 'x',
        y: 'y',
        ...(values.series ? { series: 'series' } : {}),
      },
    }}
  />
);
