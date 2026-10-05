import { ConnectedScatterChart } from '@retikz/chart-react/point';

import type { Lang } from '@/i18n';

import { connectedScatterOrderFigureData } from './connected-scatter-order-figure.data';
import { connectedScatterOrderFigureI18n } from './connected-scatter-order-figure.i18n';

/** 绘制示例图形 */
export const renderConnectedScatterOrderFigurePreview = (
  lang: Lang,
  dimensions: { width: number; height: number } | undefined,
  ordered: boolean,
) => {
  const text = connectedScatterOrderFigureI18n[lang];
  const bounds = dimensions ?? { width: 720, height: 440 };

  const chart = (
    <ConnectedScatterChart
      rows={connectedScatterOrderFigureData}
      layout={bounds}
      presentation={{ title: { text: ordered ? text.title : text.inputTitle }, subtitle: { text: text.subtitle } }}

      recipe={{
        encodings: { x: 'x', y: 'y', order: ordered ? 'step' : 'inputOrder' },
        properties: { point: { size: 8 }, path: { strokeWidth: 3 } },
      }}
    />
  );

  return chart;
};
