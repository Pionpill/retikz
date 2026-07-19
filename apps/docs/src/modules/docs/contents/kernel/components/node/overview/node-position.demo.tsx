import type { NodeProps } from '@retikz/react';
import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import type { PreviewControlValuesFor, PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { nodePositionControls } from './node-position.controls';

export const previewControls = nodePositionControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

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

/**
 * Node 定位 playground
 * @description A / B 是固定参照节点；面板把同一个 Q 切换为五种 position 输入，让用户直接观察定位结果
 */
const Demo: FC = () => {
  const values = usePreviewControls(nodePositionControls);

  return (
    <Layout width={400} height={229} viewBox={{ x: -280, y: -160, width: 560, height: 320 }}>
      <Draw
        way={[
          [-240, 0],
          [240, 0],
        ]}
        stroke="lightgray"
        arrow="->"
      />
      <Draw
        way={[
          [0, 130],
          [0, -130],
        ]}
        stroke="lightgray"
        arrow="->"
      />

      <Node id="A" position={[-130, 0]} shape="circle" padding={5} stroke="gray" dashed>
        a
      </Node>
      <Node id="B" position={[130, 0]} shape="circle" padding={5} stroke="gray" dashed>
        b
      </Node>
      <Draw way={['A', 'B']} stroke="lightgray" dashPattern={[4, 3]} />

      <Node id="Q" position={positionOf(values)} fill="#f97316" textColor="white" padding={8}>
        q
      </Node>
      <Draw way={['A', 'Q']} stroke="gray" dashPattern={[4, 3]} />
      <Draw way={['B', 'Q']} stroke="gray" dashPattern={[4, 3]} />
    </Layout>
  );
};

export default Demo;
