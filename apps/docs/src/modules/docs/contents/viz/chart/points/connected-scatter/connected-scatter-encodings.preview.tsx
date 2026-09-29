import { ConnectedScatterChart, ConnectedScatterEncodings } from '@retikz/chart-react/point';

import { connectedScatterData } from './connected-scatter-basic.data';

/** 图形参数 */
export type ConnectedScatterEncodingsPreviewValues = {
  coordinateSystem: 'cartesian2D' | 'polar2D';
};

/** 绘制示例图形 */
export const renderConnectedScatterEncodingsPreview = (
  values: ConnectedScatterEncodingsPreviewValues,
  dimensions?: { width: number; height: number },
) => {
  return (
    <ConnectedScatterChart
      coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
      rows={connectedScatterData}
      layout={dimensions}
    >
      <ConnectedScatterEncodings x="urbanization" y="lifeExpectancy" order="year" series="country" />
    </ConnectedScatterChart>
  );
};
