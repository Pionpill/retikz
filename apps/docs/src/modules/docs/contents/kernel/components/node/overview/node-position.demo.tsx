import type { NodeProps } from '@retikz/react';
import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodePositionControls, previewControlContract } from './node-position.controls';

export const previewControls = nodePositionControls;

type NodePositionValues = PreviewControlValuesFor<typeof nodePositionControls>;

/** 把面板值转换为当前选中的 Node position 输入 */
const positionOf = (values: NodePositionValues): NodeProps['position'] => {
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

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout viewBox={{ x: -280, y: -160, width: 560, height: 320 }}>
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
});

export const previewSource = controlledPreview.source;

/**
 * Node 定位 playground
 * @description A / B 是固定参照节点；面板把同一个 Q 切换为五种 position 输入，让用户直接观察定位结果
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
