import { RegressionChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { irisRegressionData } from './regression-basic.data';
import { regressionCompareI18n } from './regression-compare.i18n';

/** 示例的语言参数 */
export type RegressionCompareProps = { lang?: Lang };

import { createPreviewControlContract } from './regression-compare.controls';
import type { DemoValues } from './regression-compare.controls';

const contract = createPreviewControlContract();

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (lang: Lang, dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) => {
  const text = regressionCompareI18n[lang];
  const bounds = dimensions ?? { width: 720, height: 440 };

  const chart = (
    <RegressionChart
      rows={irisRegressionData}
      layout={bounds}
      presentation={{ title: { text: text.title }, subtitle: { text: text.subtitle } }}

      recipe={{
        encodings: { x: 'sepalLengthCm', y: 'petalLengthCm' },
        properties: {
          sampleCount: values.sampleCount,
          point: { size: values.size, opacity: values.opacity },
          trend: { curve: values.curve, stroke: values.linearColor, strokeWidth: values.strokeWidth },
          extraMethods: [
            {
              method: { kind: 'polynomial', order: values.order },
              trend: { stroke: values.polynomialColor, dashPattern: values.dashed ? [6, 4] : [] },
            },
          ],
        },
      }}
    />
  );
  return chart;
};

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: (lang: Lang = 'zh') => render(lang),
  datasetImports: { 'chart.data': { name: 'irisRegressionData', from: './regression-basic.data' } },
};

/** 随演示区域重新布局 */
const RegressionCompare: FC<RegressionCompareProps> = props => {
  const { lang = 'zh' } = props;
  return render(lang, usePreviewDimensions(), usePreviewControls(contract.controls));
};
export default RegressionCompare;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './regression-compare.controls';
export const previewControls = contract.controls;
