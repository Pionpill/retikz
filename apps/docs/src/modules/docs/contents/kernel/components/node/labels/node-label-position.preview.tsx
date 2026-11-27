import type { IRNodeLabel } from '@retikz/core';
import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type NodeLabelPositionPreviewValues = {
  positionMode: 'direction' | 'boundary' | 'angle' | 'center';
  positionAngle: number;
  side: 'right' | 'top' | 'bottom' | 'left';
  fraction: number;
  direction: 'right' | 'top' | 'bottom' | 'left';
};

/** 绘制示例图形 */
export const NodeLabelPositionPreview = (values: NodeLabelPositionPreviewValues) => {
  const position: IRNodeLabel['position'] =
    values.positionMode === 'center'
      ? 'center'
      : values.positionMode === 'angle'
        ? values.positionAngle
        : values.positionMode === 'boundary'
          ? { side: values.side, fraction: values.fraction }
          : values.direction;
  return (
    <Layout>
      <Node
        position={[0, 0]}
        label={{ text: 'label', position }}
        style={{ fill: 'lightgray', stroke: 'gray' }}
        layout={{ minimumSize: { width: 120, height: 76 } }}
      >
        q
      </Node>
    </Layout>
  );
};
