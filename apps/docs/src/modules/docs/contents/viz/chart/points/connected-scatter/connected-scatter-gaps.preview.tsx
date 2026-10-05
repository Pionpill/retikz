import { ConnectedScatterChart } from '@retikz/chart-react/point';

import type { Lang } from '@/i18n';

import { connectedScatterData } from './connected-scatter-basic.data';
import { connectedScatterGapsI18n } from './connected-scatter-gaps.i18n';

/** 图形参数 */
export type ConnectedScatterGapsPreviewValues = {
  size: number;
  connectNulls: boolean;
  bridgeWidth: number;
  bridgeOpacity: number;
  dashLength: number;
  strokeWidth: number;
};

/** 绘制示例图形 */
export const renderConnectedScatterGapsPreview = (
  lang: Lang,
  dimensions: { width: number; height: number } | undefined,
  values: ConnectedScatterGapsPreviewValues,
) => {
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
