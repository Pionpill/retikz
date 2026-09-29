import { ConnectedScatterChart } from '@retikz/chart-react/point';

import { connectedScatterMinimalData } from './connected-scatter-minimal.data';

/** 绘制示例图形 */
export const renderConnectedScatterMinimalPreview = (dimensions?: { width: number; height: number }) => (
  <ConnectedScatterChart
    layout={dimensions}
    rows={connectedScatterMinimalData}
    recipe={{ encodings: { x: 'month', y: 'unemploymentRate', order: 'month' } }}
  />
);
