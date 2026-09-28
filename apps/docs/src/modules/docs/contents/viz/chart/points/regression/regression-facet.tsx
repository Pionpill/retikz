import { RegressionChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { irisRegressionData } from './regression-basic.data';
import { regressionFacetI18n } from './regression-facet.i18n';

/** 示例的语言参数 */
export type RegressionFacetProps = { lang?: Lang };

import { createPreviewControlContract } from './regression-facet.controls';
import type { DemoValues } from './regression-facet.controls';

const contract = createPreviewControlContract();

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (lang: Lang, dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) => {
  const text = regressionFacetI18n[lang];
  const bounds = dimensions ?? { width: 720, height: 568 };

  const chart = (
    <RegressionChart
      rows={irisRegressionData}
      layout={{ ...bounds, padding: { right: 48, bottom: 32 } }}
      presentation={{ title: { text: text.title }, subtitle: { text: text.subtitle } }}

      recipe={{
        encodings: {
          x: 'sepalLengthCm',
          y: 'petalLengthCm',
          series: 'species',
          row: 'species',
          facet: { header: { row: values.header }, spacing: { panelGap: values.panelGap } },
        },
        properties: { point: { size: values.size, opacity: 0.5 }, trend: { strokeWidth: values.strokeWidth } },
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
const RegressionFacet: FC<RegressionFacetProps> = props => {
  const { lang = 'zh' } = props;
  return render(lang, usePreviewDimensions(), usePreviewControls(contract.controls));
};
export default RegressionFacet;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './regression-facet.controls';
export const previewControls = contract.controls;
