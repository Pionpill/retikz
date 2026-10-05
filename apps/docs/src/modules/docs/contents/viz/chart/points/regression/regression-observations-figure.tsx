import { RegressionChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewDimensions } from '@/modules/docs/preview';

import { regressionObservationsFigureData } from './regression-observations-figure.data';
import { regressionObservationsFigureI18n } from './regression-observations-figure.i18n';

/** 示例的语言参数 */
export type RegressionObservationsFigureProps = { lang?: Lang };

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (lang: Lang, dimensions?: PreviewDimensions) => {
  const text = regressionObservationsFigureI18n[lang];
  const bounds = dimensions ?? { width: 720, height: 440 };

  const chart = (
    <RegressionChart
      rows={regressionObservationsFigureData}
      layout={bounds}
      presentation={{ title: { text: text.title }, subtitle: { text: text.subtitle } }}

      recipe={{
        encodings: { x: 'x', y: 'y' },
        properties: { point: { size: 8, color: 'dodgerblue' }, trend: { stroke: 'darkorange', strokeWidth: 3 } },
      }}
    />
  );

  return chart;
};

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: (lang: Lang) => render(lang),
  datasetImports: {
    'chart.data': { name: 'regressionObservationsFigureData', from: './regression-observations-figure.data' },
  },
};

/** 随演示区域重新布局 */
const RegressionObservationsFigure: FC<RegressionObservationsFigureProps> = props => {
  const { lang = 'zh' } = props;
  return render(lang, usePreviewDimensions());
};
export default RegressionObservationsFigure;
