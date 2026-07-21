import type { FC } from 'react';

import { Coordinate, Draw, Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinateOffsetChainFrame } from './coordinate-offset-chain.controls';
import { coordinateOffsetChainControls, previewControlContract } from './coordinate-offset-chain.en.controls';

export const previewControls = coordinateOffsetChainControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout
      width={coordinateOffsetChainFrame.width}
      height={coordinateOffsetChainFrame.height}
      viewBox={coordinateOffsetChainFrame.viewBox}
    >
      <Draw
        way={coordinateOffsetChainFrame.xAxis}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
        zIndex={-1}
      />
      <Draw
        way={coordinateOffsetChainFrame.yAxis}
        stroke="lightgray"
        dashPattern={[1, 4]}
        lineCap="round"
        zIndex={-1}
      />
      <Coordinate id="ca" position={[values.rootX, values.rootY]} />
      <Coordinate id="cb" position={{ of: 'ca', offset: [values.stepX, 0] }} />
      <Coordinate id="cc" position={{ of: 'cb', offset: [values.stepX, 0] }} />
      <Node id="A" position={{ of: 'ca', offset: [0, 0] }}>
        a
      </Node>
      <Node id="B" position={{ of: 'cb', offset: [0, 30] }}>
        b
      </Node>
      <Node id="C" position={{ of: 'cc', offset: [0, -30] }}>
        c
      </Node>
      <Draw way={['A', 'B']} arrow="->" stroke="gray" />
      <Draw way={['B', 'C']} arrow="->" stroke="gray" />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * Coordinate offset chain
 * @description ca → cb → cc are derived via `{ of, offset }`; fixed axes reveal how moving `ca` shifts the group relative to the world origin.
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
