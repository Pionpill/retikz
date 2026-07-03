import type { BoundaryDefinition, IRPosition } from '@retikz/core';
import type { FC } from 'react';

import { defineBoundary } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';
import { z } from 'zod';

type Position = IRPosition;

const horizontalPorts: BoundaryDefinition = defineBoundary({
  name: 'horizontal-ports',
  paramsSchema: z.strictObject({}),
  boundaryPoint: (rect, toward) => {
    const terminal: Position = toward[0] < rect.x ? [rect.x - rect.width / 2, rect.y] : [rect.x + rect.width / 2, rect.y];
    return terminal;
  },
  anchor: (rect, name) => {
    if (name === 'center') return [rect.x, rect.y];
    if (name === 'left' || name === 'input') return [rect.x - rect.width / 2, rect.y];
    if (name === 'right' || name === 'output') return [rect.x + rect.width / 2, rect.y];
    return undefined;
  },
});

const Demo: FC = () => (
  <Layout width={430} height={190} boundaries={[horizontalPorts]}>
    <Node id="source" position={[-150, 0]} text="A" shape="circle" fill="lightgray" stroke="gray" />
    <Node
      id="controller"
      position={[0, 0]}
      text="IO"
      minimumSize={{ width: 92, height: 56 }}
      boundary="horizontal-ports"
      fill="white"
      stroke="dodgerblue"
      strokeWidth={2}
    />
    <Node id="sink" position={[145, 55]} text="B" shape="circle" fill="lightgray" stroke="gray" />
    <Draw way={['source', 'controller', 'sink']} arrow="->" stroke="darkorange" strokeWidth={2} />
  </Layout>
);

export default Demo;
