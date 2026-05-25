import type { PatternDefinition } from '@retikz/react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 自定义 pattern motif：十字（cross）图案，与内置 lines / dots / grid 不同。
 * emit 在局部 tile 坐标系（0..size）产 MarkerPrimitive；color / lineWidth 来自 ctx（size 来自 spec.size ?? defaultSize）。
 */
const cross: PatternDefinition = {
  defaultSize: 12,
  emit: ({ size, color, lineWidth }) => {
    const lw = lineWidth ?? 1.5;
    const c = size / 2;
    return [
      { type: 'path', commands: [{ kind: 'move', to: [c, 2] }, { kind: 'line', to: [c, size - 2] }], stroke: color, strokeWidth: lw },
      { type: 'path', commands: [{ kind: 'move', to: [2, c] }, { kind: 'line', to: [size - 2, c] }], stroke: color, strokeWidth: lw },
    ];
  },
};

const Demo: FC = () => (
  <Layout width={200} height={120} patterns={{ cross }}>
    <Node
      id="a"
      position={[0, 0]}
      minimumWidth={140}
      minimumHeight={90}
      fill={{ type: 'pattern', shape: 'cross', color: 'darkorange' }}
      stroke="darkorange"
    />
  </Layout>
);

export default Demo;
