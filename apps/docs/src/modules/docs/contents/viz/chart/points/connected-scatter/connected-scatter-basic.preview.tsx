import { ChartData } from '@retikz/chart-react';
import {
  ConnectedScatterChart,
  ConnectedScatterEncodings,
  ConnectedScatterProperties,
} from '@retikz/chart-react/point';

import { connectedScatterData } from './connected-scatter-basic.data';

/** 图形参数 */
export type ConnectedScatterBasicPreviewValues = {
  coordinateSystem: 'cartesian2D' | 'polar2D';
  colorMode: 'series' | 'mark' | 'muted';
  pointSize: number;
  pointOpacity: number;
  curve:
    | 'linear'
    | 'step'
    | 'stepBefore'
    | 'stepAfter'
    | 'basis'
    | 'cardinal'
    | 'catmullRom'
    | 'monotoneX'
    | 'monotoneY'
    | 'natural';
  lineOpacity: number;
  connectNulls: boolean;
  strokeWidth: number;
  lineStyle: 'solid' | 'dashed';
};

/** 绘制示例图形 */
export const renderConnectedScatterBasicPreview = (
  values: ConnectedScatterBasicPreviewValues,
  dimensions?: { width: number; height: number },
) => {
  const chart = (
    <ConnectedScatterChart
      coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
      layout={dimensions ? { ...dimensions, padding: { right: 48 } } : undefined}
    >
      <ChartData data={connectedScatterData} />
      <ConnectedScatterEncodings x="urbanization" y="lifeExpectancy" order="year" series="country" />
      <ConnectedScatterProperties
        colorMode={values.colorMode}
        point={{
          size: values.pointSize,
          opacity: values.pointOpacity,
        }}

        path={{
          curve: values.curve,
          ...(values.colorMode === 'muted' ? {} : { strokeOpacity: values.lineOpacity }),
          connectNulls: values.connectNulls,
          strokeWidth: values.strokeWidth,
          ...(values.lineStyle === 'dashed' ? { dashPattern: [8, 4] } : {}),
        }}
      />
    </ConnectedScatterChart>
  );
  return chart;
};
