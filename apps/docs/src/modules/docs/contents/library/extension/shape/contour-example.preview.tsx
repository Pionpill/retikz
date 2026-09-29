import { ContourShapeDefinition } from '@retikz/extension';
import type { Position } from '@retikz/math';
import { Layout, Node } from '@retikz/react';

const presetPoints: Record<string, Array<Position>> = {
  tag: [
    [-76, -36],
    [18, -36],
    [72, 0],
    [18, 36],
    [-76, 36],
  ],
  shield: [
    [-64, -44],
    [64, -44],
    [48, 30],
    [0, 60],
    [-48, 30],
  ],
  notch: [
    [-76, -42],
    [76, -42],
    [76, 42],
    [-18, 42],
    [0, 0],
    [-18, -42],
  ],
};

/** 图形参数 */
export type ContourExamplePreviewValues = {
  preset: 'tag' | 'shield' | 'notch';
  cornerRadius: number;
};

/** 绘制示例图形 */
export const renderContourExamplePreview = (values: ContourExamplePreviewValues) => (
  <Layout viewBox={{ x: -110, y: -90, width: 220, height: 180 }} extensions={{ shapes: [ContourShapeDefinition] }}>
    <Node
      position={[0, 0]}
      shape={{ type: 'contour', params: { points: presetPoints[values.preset], cornerRadius: values.cornerRadius } }}
      style={{ fill: '#ffedd5', stroke: 'darkorange', strokeWidth: 1.5 }}
    />
  </Layout>
);
