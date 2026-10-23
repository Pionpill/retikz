import { BuiltinShape } from '@retikz/core';
import { Plot, PlotScale, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { labelRows } from './builtin-label.data';

/** 标签的交互参数 */
export type BuiltinLabelPreviewValues = {
  /** 是否生成标签 */
  showLabel: boolean;
  /** 标签相对节点的方位 */
  labelPosition: 'top' | 'right' | 'bottom' | 'left';
  /** 标签距节点边界的距离 */
  labelDistance: number;
  /** 是否绘制引线 */
  labelPin: boolean;
  /** 标签文字颜色 */
  labelTextColor: string;
};

/** 固定节点主体，只改变外侧标签 */
export const BuiltinLabelPreview = (
  values: BuiltinLabelPreviewValues,
  dimensions?: { width: number; height: number },
) => (
  <Layout
    viewBox={{ x: 0, y: 28, width: 520, height: 184 }}
    style={
      dimensions
        ? { width: 'auto', height: 'auto', maxWidth: dimensions.width, maxHeight: dimensions.height }
        : undefined
    }
  >
    <Plot data={labelRows} width={520} height={240}>
      <PlotScale dimension="x" type="linear" domain={[0, 4]} domainPadding={0} />
      <PlotScale dimension="y" type="linear" domain={[8, 16]} domainPadding={0} />
      <PointMark
        encodings={{
          ...(values.showLabel ? { label: { text: 'tag' } } : {}),
          position: { x: { field: 'x' }, y: { field: 'y' } },
        }}
        properties={{
          shape: BuiltinShape.Rectangle,
          fill: '#dbeafe',
          stroke: '#1d4ed8',
          strokeWidth: 1.5,
          minimumSize: 36,
          cornerRadius: 8,
          label: values.showLabel
            ? {
                position: values.labelPosition,
                distance: values.labelDistance,
                pin: values.labelPin,
                textColor: values.labelTextColor,
              }
            : undefined,
        }}
      />
    </Plot>
  </Layout>
);
