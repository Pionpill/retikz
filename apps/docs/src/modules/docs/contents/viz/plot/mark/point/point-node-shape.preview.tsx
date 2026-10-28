import { starShapeDefinition } from '@retikz/extension';
import { PlotAxis, PointMark, PathMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { shapePoints } from './point-api.data';
import { pointNodeShapeOf } from './point-node-shape.controls';

/** 图形参数 */
export type PointNodeShapePreviewValues = {
  /** 是否显示用于观察连接外边距的辅助连线 */
  showRelations: boolean;
  /** 圆角半径 */
  cornerRadius: number;
  /** 节点缩放 */
  scale: number;
  /** 内边距 */
  padding: number;
  /** 连接外边距 */
  margin: number;
  /** 连接边界 */
  boundary: 'shape' | 'circle';
  coordinate: 'cartesian2D' | 'polar2D';
  size: number;
  rotate: number;
  /** 沿坐标角色切向或法向旋转 */
  orientation: 'screen' | 'x-tangent' | 'x-normal' | 'y-tangent' | 'y-normal';
  shape: 'circle' | 'rectangle' | 'wide-rectangle' | 'diamond' | 'star' | 'polygon';
  starPoints: number;
  polygonSides: number;
};

/** 绘制示例图形 */
export const PointNodeShapePreview = (values: PointNodeShapePreviewValues) => (
  <Layout viewBox={{ x: -50, y: -70, width: 540, height: 408 }} extensions={{ shapes: [starShapeDefinition] }}>
    <Plot
      data={shapePoints}
      width={400}
      height={280}
      coordinate={values.coordinate === 'polar2D' ? 'polar2D' : undefined}
    >
      <PointMark
        id="shape-nodes"
        encodings={{ anchorId: 'label', color: 'region', position: { x: { field: 'x' }, y: { field: 'y' } } }}
        properties={{
          anchorId: { prefix: 'shape-demo' },
          size: values.shape === 'wide-rectangle' ? undefined : values.size,
          minimumSize: values.shape === 'wide-rectangle' ? { width: values.size * 2, height: values.size } : undefined,
          rotate: values.rotate,
          orientation:
            values.orientation === 'screen'
              ? { kind: 'screen' }
              : {
                  kind: 'coordinate',
                  role: values.orientation.startsWith('x') ? 'x' : 'y',
                  align: values.orientation.endsWith('tangent') ? 'tangent' : 'normal',
                },
          cornerRadius: values.cornerRadius,
          scale: values.scale,
          padding: values.padding,
          margin: values.margin,
          boundary: values.boundary === 'circle' ? { type: 'circle', params: { fit: 'bounds' } } : 'shape',
          shape: pointNodeShapeOf({
            shape: values.shape,
            size: values.size,
            starPoints: values.starPoints,
            polygonSides: values.polygonSides,
          }),
        }}
      />
      {values.showRelations && (
        <PathMark
          encodings={{
            from: { mark: 'shape-nodes', key: { field: 'label' } },
            to: { mark: 'shape-nodes', key: { field: 'nextLabel' } },
          }}
          properties={{
            color: '#94a3b8',
            strokeWidth: 1,
          }}
        />
      )}
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  </Layout>
);
