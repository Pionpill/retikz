import { BubbleChart, BubbleMark } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { gapminderBubbleData } from './bubble-basic.data';
import { createPreviewControlContract } from './bubble-marks.controls';
import type { DemoValues } from './bubble-marks.controls';

const contract = createPreviewControlContract();

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) => {
  const bounds = dimensions ?? { width: 720, height: 440 };

  const chart = (
    <BubbleChart
      rows={gapminderBubbleData}
      layout={{ ...bounds, padding: { right: 48 } }}

      recipe={{
        encodings: {
          x: 'gdpPerCapita',
          y: 'lifeExpectancy',
          size: 'population',
          color: 'continent',
        },
        properties: { fillOpacity: 0.55 },
      }}
    >
      <BubbleMark
        override={values.override}
        properties={{ fillOpacity: values.fillOpacity, strokeWidth: values.strokeWidth }}
      />
    </BubbleChart>
  );
  return chart;
};

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => render(),
  datasetImports: { 'chart.data': { name: 'gapminderBubbleData', from: './bubble-basic.data' } },
};

/** 随演示区域重新布局 */
const BubbleMarks: FC = () => {
  return render(usePreviewDimensions(), usePreviewControls(contract.controls));
};
export default BubbleMarks;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './bubble-marks.controls';
export const previewControls = contract.controls;
