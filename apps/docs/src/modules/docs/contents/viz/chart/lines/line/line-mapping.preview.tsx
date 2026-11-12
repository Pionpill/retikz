import { LineChart } from '@retikz/chart-react/line';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';

import { lineData } from './line-basic.data';
import type { LineMappingValues } from './line-mapping.controls';

/** 折线示例交互 */
export const renderLineMapping = (values: LineMappingValues, dimensions?: PreviewDimensions) => (
  <LineChart
    rows={values.shuffle ? [lineData[2], lineData[0], lineData[1], ...lineData.slice(3)] : lineData}
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
