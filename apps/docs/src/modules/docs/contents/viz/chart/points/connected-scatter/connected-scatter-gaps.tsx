import { ConnectedScatterChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { connectedScatterData } from './connected-scatter-basic.data';
import { connectedScatterGapsI18n } from './connected-scatter-gaps.i18n';

/** 示例的语言参数 */
export type ConnectedScatterGapsProps = { lang?: Lang };

import { createPreviewControlContract } from './connected-scatter-gaps.controls';
import type { DemoValues } from './connected-scatter-gaps.controls';

const contract = createPreviewControlContract();

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (lang: Lang, dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) => {
  const text = connectedScatterGapsI18n[lang];
  const bounds = dimensions ?? { width: 720, height: 440 };

  const chart = (
    <ConnectedScatterChart
      rows={connectedScatterData}
      layout={{ ...bounds, padding: { right: 48 } }}
      presentation={{ title: { text: text.title }, subtitle: { text: text.subtitle } }}

      recipe={{
        encodings: { x: 'urbanization', y: 'lifeExpectancy', order: 'year', series: 'country' },
        properties: {
          point: { size: values.size },
          path: {
            connectNulls: values.connectNulls
              ? {
                  strokeWidth: values.bridgeWidth,
                  strokeOpacity: values.bridgeOpacity,
                  dashPattern: [values.dashLength, 4],
                }
              : false,
            strokeWidth: values.strokeWidth,
          },
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
  datasetImports: { 'chart.data': { name: 'connectedScatterData', from: './connected-scatter-basic.data' } },
};

/** 随演示区域重新布局 */
const ConnectedScatterGaps: FC<ConnectedScatterGapsProps> = props => {
  const { lang = 'zh' } = props;
  return render(lang, usePreviewDimensions(), usePreviewControls(contract.controls));
};
export default ConnectedScatterGaps;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './connected-scatter-gaps.controls';
export const previewControls = contract.controls;
