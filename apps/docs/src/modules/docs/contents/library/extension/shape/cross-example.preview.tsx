import { CrossShapeDefinition } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type CrossExamplePreviewValues = {
  horizontalWidth: number;
  verticalWidth: number;
  topHeight: number;
  rightHeight: number;
  bottomHeight: number;
  leftHeight: number;
  fill: string;
};

/** 绘制示例图形 */
export const renderCrossExamplePreview = (values: CrossExamplePreviewValues) => (
  <Layout viewBox={{ x: -100, y: -80, width: 200, height: 160 }} extensions={{ shapes: [CrossShapeDefinition] }}>
    <Node
      position={[0, 0]}
      shape={{
        type: 'cross',
        params: {
          width: {
            default: values.horizontalWidth,
            horizontal: values.horizontalWidth,
            vertical: values.verticalWidth,
          },
          height: {
            default: values.topHeight,
            horizontal: values.topHeight,
            vertical: values.topHeight,
            top: values.topHeight,
            right: values.rightHeight,
            bottom: values.bottomHeight,
            left: values.leftHeight,
          },
        },
      }}
      style={{ fill: values.fill, stroke: '#2563eb', strokeWidth: 1.5 }}
    />
  </Layout>
);
