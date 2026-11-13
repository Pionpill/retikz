import { LineChart } from '@retikz/chart-react/line';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';

import type { LineDemoValues } from './line-basic.controls';
import { lineData } from './line-basic.data';

/** 用相同的序列数据演示点、曲线与缺口连接 */
export const renderLineBasic = (values: LineDemoValues, dimensions?: PreviewDimensions) => {
  return (
    <LineChart
      rows={lineData}
      layout={{ ...(dimensions ?? { width: 640, height: 360 }), padding: 24 }}
      recipe={{
        encodings: { x: 'x', y: 'y', series: 'series' },
        properties: {
          point: values.point ? { size: values.pointSize } : false,
          path: {
            curve: values.curve,
            connectNulls: values.connectNulls,
            strokeWidth: values.strokeWidth,
          },
        },
      }}
    />
  );
};
