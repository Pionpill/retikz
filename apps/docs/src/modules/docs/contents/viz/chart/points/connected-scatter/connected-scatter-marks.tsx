import { ConnectedScatterChart, ConnectedScatterMark } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { connectedScatterData } from './connected-scatter-basic.data';
import { createPreviewControlContract } from './connected-scatter-marks.controls';
import type { DemoValues } from './connected-scatter-marks.controls';

const contract = createPreviewControlContract();

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) => {
  const bounds = dimensions ?? { width: 720, height: 440 };

  const chart = (
    <ConnectedScatterChart
      coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
      rows={connectedScatterData}
      layout={{ ...bounds, padding: { right: 48 } }}

      recipe={{
        encodings: { x: 'urbanization', y: 'lifeExpectancy', order: 'year', series: 'country' },
        properties: { point: { size: values.size }, path: { strokeWidth: values.strokeWidth } },
      }}
    >
      <ConnectedScatterMark
        override
        properties={{
          point: { fillOpacity: values.fillOpacity, strokeWidth: values.strokeWidth },
          path: { ...(values.dashed ? { dashPattern: [6, 4] } : {}) },
        }}
      />
    </ConnectedScatterChart>
  );
  return chart;
};

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => render(),
  datasetImports: { 'chart.data': { name: 'connectedScatterData', from: './connected-scatter-basic.data' } },
};

/** 随演示区域重新布局 */
const ConnectedScatterMarks: FC = () => {
  return render(usePreviewDimensions(), usePreviewControls(contract.controls));
};
export default ConnectedScatterMarks;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './connected-scatter-marks.controls';
export const previewControls = contract.controls;
