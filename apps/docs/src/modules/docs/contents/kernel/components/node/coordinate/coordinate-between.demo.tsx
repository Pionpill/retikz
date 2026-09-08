import type { FC } from 'react';

import { Coordinate, Draw, Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  coordinateBetweenControls,
  coordinateBetweenFrame,
  previewControlContract,
} from './coordinate-between.controls';

export const previewControls = coordinateBetweenControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout viewBox={coordinateBetweenFrame.viewBox}>
      <Node
        id="A"
        position={[-140, 0]}
        shape="circle"
        style={{ fill: 'dodgerblue', textColor: 'white' }}
        layout={{ minimumSize: 32 }}
      >
        a
      </Node>
      <Node
        id="B"
        position={[140, 0]}
        shape="circle"
        style={{ fill: 'green', textColor: 'white' }}
        layout={{ minimumSize: 32 }}
      >
        b
      </Node>
      <Draw way={['A', 'B']} zIndex={-1} style={{ stroke: 'lightgray' }} />
      <Coordinate id="Q" position={{ between: [{ id: 'A' }, { id: 'B' }], fraction: values.fraction }} />
      <Node
        id="marker"
        position={{ of: 'Q', offset: [0, 0] }}
        shape="circle"
        style={{ fill: 'darkorange', textColor: 'white' }}
        layout={{ minimumSize: 24 }}
      >
        q
      </Node>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * 比例定位 `{ between: [A, B], fraction }`
 * @description A、B 固定在 x 轴上，面板连续调整同一个 q 的 fraction；同样的输入可用于 Node.position / Coordinate / Step.to
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
