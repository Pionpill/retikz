import type { IRNodeTarget } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';

const targetOf = (values: NodeAnchorPositionPreviewValues, withOffset: boolean): IRNodeTarget => ({
  id: 'A',
  anchor: values.targetAnchor,
  ...(withOffset ? { offset: [values.offsetX, values.offsetY] } : {}),
});

/** 图形参数 */
export type NodeAnchorPositionPreviewValues = {
  targetRotate: number;
  targetMargin: number;
  selfAnchor:
    | 'center'
    | 'top'
    | 'top-right'
    | 'right'
    | 'bottom-right'
    | 'bottom'
    | 'bottom-left'
    | 'left'
    | 'top-left';
  selfScale: number;
  selfRotate: number;
  targetAnchor:
    | 'center'
    | 'top'
    | 'top-right'
    | 'right'
    | 'bottom-right'
    | 'bottom'
    | 'bottom-left'
    | 'left'
    | 'top-left';
  offsetX: number;
  offsetY: number;
};

/** 绘制示例图形 */
export const NodeAnchorPositionPreview = (values: NodeAnchorPositionPreviewValues) => {
  const target = targetOf(values, true);
  return (
    <Layout>
      <Node
        id="A"
        position={[-28, 0]}
        rotate={values.targetRotate}
        style={{ fill: 'none', stroke: 'gray', dashed: true }}
        layout={{ minimumSize: { width: 126, height: 76 }, padding: 0, margin: values.targetMargin }}
      >
        a
      </Node>

      <Draw
        way={[targetOf(values, false), target]}
        zIndex={-1}
        style={{ stroke: 'lightgray', dashPattern: [1, 4], lineCap: 'round' }}
      />

      <Node
        id="Q"
        position={{ kind: 'anchor', target, selfAnchor: values.selfAnchor }}
        scale={values.selfScale}
        rotate={values.selfRotate}
        style={{ fill: '#f97316', stroke: 'none', textColor: 'white' }}
        layout={{ minimumSize: { width: 54, height: 36 }, padding: { left: 10, right: 2, top: 4, bottom: 8 } }}
      >
        q
      </Node>

      <Node
        position={{ kind: 'anchor', target }}
        shape="circle"
        zIndex={1}
        style={{ fill: 'none', stroke: '#94a3b8', strokeWidth: 1 }}
        layout={{ minimumSize: 8, padding: 0 }}
      />
    </Layout>
  );
};
