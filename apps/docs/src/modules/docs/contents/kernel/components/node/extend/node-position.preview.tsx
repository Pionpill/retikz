import type { NodeProps } from '@retikz/react';
import { Draw, Layout, Node } from '@retikz/react';

const positionOf = (values: NodePositionPreviewValues): NodeProps['position'] => {
  switch (values.positionKind) {
    case 'cartesian':
      return [values.x, values.y];
    case 'polar':
      return { origin: values.referent, angle: values.angle, radius: values.radius };
    case 'relative':
      return { direction: values.direction, of: values.referent, distance: values.distance };
    case 'offset':
      return { of: values.referent, offset: [values.offsetX, values.offsetY] };
    case 'between':
      return { between: [{ id: 'A' }, { id: 'B' }], fraction: values.fraction };
  }
};

/** 图形参数 */
export type NodePositionPreviewValues = {
  positionKind: 'relative' | 'cartesian' | 'polar' | 'offset' | 'between';
  referent: 'A' | 'B';
  x: number;
  y: number;
  angle: number;
  radius: number;
  direction: 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left' | 'top-left';
  distance: number;
  offsetX: number;
  offsetY: number;
  fraction: number;
};

/** 绘制示例图形 */
export const NodePositionPreview = (values: NodePositionPreviewValues) => {
  return (
    <Layout>
      <Draw
        way={[
          [-240, 0],
          [240, 0],
        ]}
        arrow="->"
        style={{ stroke: 'lightgray' }}
      />
      <Draw
        way={[
          [0, 130],
          [0, -130],
        ]}
        arrow="->"
        style={{ stroke: 'lightgray' }}
      />

      <Node id="A" position={[-130, 0]} shape="circle" style={{ stroke: 'gray', dashed: true }} layout={{ padding: 5 }}>
        a
      </Node>
      <Node id="B" position={[130, 0]} shape="circle" style={{ stroke: 'gray', dashed: true }} layout={{ padding: 5 }}>
        b
      </Node>
      <Draw way={['A', 'B']} style={{ stroke: 'lightgray', dashPattern: [4, 3] }} />

      <Node
        id="Q"
        position={positionOf(values)}
        style={{ fill: '#f97316', textColor: 'white' }}
        layout={{ padding: 8 }}
      >
        q
      </Node>
      <Draw way={['A', 'Q']} style={{ stroke: 'gray', dashPattern: [4, 3] }} />
      <Draw way={['B', 'Q']} style={{ stroke: 'gray', dashPattern: [4, 3] }} />
    </Layout>
  );
};
