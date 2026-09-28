import { StripChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewDimensions } from '@/modules/docs/preview';

import { stripPlacementFigureData } from './strip-placement-figure.data';
import { stripPlacementFigureI18n } from './strip-placement-figure.i18n';

/** 示例的语言参数 */
export type StripPlacementFigureProps = { lang?: Lang };

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (lang: Lang, dimensions?: PreviewDimensions) => {
  const text = stripPlacementFigureI18n[lang];
  const bounds = dimensions ?? { width: 720, height: 440 };

  const chart = (
    <StripChart
      rows={stripPlacementFigureData}
      layout={bounds}
      presentation={{ title: { text: text.title }, subtitle: { text: text.subtitle } }}

      recipe={{
        encodings: {
          x: { field: 'group', scale: { operation: { type: 'point', name: 'group' } } },
          y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
        },
        properties: { size: 7, opacity: 0.6, jitter: { span: { kind: 'ratio', value: 0.5 }, seed: 7 } },
      }}
    />
  );
  return chart;
};

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: (lang: Lang) => render(lang),
  datasetImports: { 'chart.data': { name: 'stripPlacementFigureData', from: './strip-placement-figure.data' } },
};

/** 随演示区域重新布局 */
const StripPlacementFigure: FC<StripPlacementFigureProps> = props => {
  const { lang = 'zh' } = props;
  return render(lang, usePreviewDimensions());
};
export default StripPlacementFigure;
