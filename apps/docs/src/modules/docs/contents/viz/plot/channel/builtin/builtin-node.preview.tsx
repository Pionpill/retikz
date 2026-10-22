import { BuiltinShape } from '@retikz/core';
import { Plot, PlotScale, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import { Grid } from '@retikz/standard-react/presentation';

import { nodeRows } from './builtin-node.data';

/** 图形参数 */
export type BuiltinNodePreviewValues = {
  /** 节点内边距 */
  padding: number;
  /** 矩形圆角半径 */
  cornerRadius: number;
  /** 旋转角度 */
  rotate: number;
  /** 最小尺寸 */
  minimumSize: number;
  /** 节点缩放比例 */
  scale: number;
  /** 阴影预设 */
  shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** 颜色混合模式 */
  blendMode: 'overlay' | 'normal' | 'multiply' | 'screen';
};

/** 绘制示例图形 */
export const BuiltinNodePreview = (
  values: BuiltinNodePreviewValues,
  dimensions?: { width: number; height: number },
) => (
  <Layout
    viewBox={{ x: 0, y: 16, width: 520, height: 248 }}
    style={
      dimensions
        ? { width: 'auto', height: 'auto', maxWidth: dimensions.width, maxHeight: dimensions.height }
        : undefined
    }
  >
    <Grid
      bounds={{ start: [12, 28], end: [508, 252] }}
      line={{ spacing: 20, style: { stroke: 'gray', strokeWidth: 1, dashPattern: [5, 4] } }}
    />
    <Plot
      data={nodeRows}
      model={[
        { name: 'x', type: 'continuous' },
        { name: 'y', type: 'continuous' },
      ]}
      width={520}
      height={280}
    >
      <PlotScale dimension="x" type="linear" domain={[0, 4]} domainPadding={0} />
      <PlotScale dimension="y" type="linear" domain={[8, 16]} domainPadding={0} />
      <PointMark
        encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }}
        properties={{
          shape: BuiltinShape.Rectangle,
          fill: '#dbeafe',
          stroke: '#1d4ed8',
          strokeWidth: 1.5,
          padding: values.padding,
          cornerRadius: values.cornerRadius,
          rotate: values.rotate,
          minimumSize: values.minimumSize,
          scale: values.scale,
          shadow: values.shadow,
          blendMode: values.blendMode,
        }}
      />
    </Plot>
  </Layout>
);
