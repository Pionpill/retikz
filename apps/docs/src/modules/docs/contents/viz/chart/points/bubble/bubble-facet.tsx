import { BubbleChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { gapminderBubbleData } from './bubble-basic.data';
import { bubbleFacetI18n } from './bubble-facet.i18n';

/** 示例的语言参数 */
export type BubbleFacetProps = { lang?: Lang };

import { createPreviewControlContract } from './bubble-facet.controls';
import type { DemoValues } from './bubble-facet.controls';

const contract = createPreviewControlContract();

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (lang: Lang, dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) => {
  const text = bubbleFacetI18n[lang];
  const bounds = dimensions ?? { width: 720, height: 568 };

  const chart = (
    <BubbleChart
      rows={gapminderBubbleData}
      layout={{ ...bounds, padding: { right: 48, bottom: 32 } }}
      presentation={{ title: { text: text.title }, subtitle: { text: text.subtitle } }}

      recipe={{
        encodings: {
          x: { field: 'gdpPerCapita', scale: { operation: { type: 'log', name: 'income' } } },
          y: 'lifeExpectancy',
          size: 'population',
          color: 'continent',
          row: 'continent',
          facet: { header: { row: values.header }, spacing: { panelGap: values.panelGap } },
        },
        properties: { fillOpacity: values.fillOpacity },
      }}
    />
  );
  return chart;
};

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: (lang: Lang = 'zh') => render(lang),
  datasetImports: { 'chart.data': { name: 'gapminderBubbleData', from: './bubble-basic.data' } },
};

/** 随演示区域重新布局 */
const BubbleFacet: FC<BubbleFacetProps> = props => {
  const { lang = 'zh' } = props;
  return render(lang, usePreviewDimensions(), usePreviewControls(contract.controls));
};
export default BubbleFacet;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './bubble-facet.controls';
export const previewControls = contract.controls;
