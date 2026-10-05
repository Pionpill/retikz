import type { IRPosition } from '@retikz/core';
import { createRibbonPathKindDefinition, defineRibbonCap } from '@retikz/extension';
import { Layout, Path, Step } from '@retikz/react';
import { number, strictObject } from 'zod';

const pointedCap = defineRibbonCap({
  name: 'pointed',
  paramsSchema: strictObject({ depth: number().nonnegative() }),
  resolve: context => {
    const position = (x: number, y: number): IRPosition => [
      context.center[0] + x * context.outward[0] + y * context.sectionAxis[0],
      context.center[1] + x * context.outward[1] + y * context.sectionAxis[1],
    ];
    const half = ((context.endpoint === 'end' ? 1 : -1) * context.width) / 2;

    return {
      extension: 0,
      commands: [
        { kind: 'move', to: position(0, half) },
        { kind: 'line', to: position(context.params.depth, 0) },
        { kind: 'line', to: position(0, -half) },
      ],
    };
  },
});

const ribbonDefinition = createRibbonPathKindDefinition({ caps: [pointedCap] });

/** 自定义端帽复用首尾端面基底 */
export const renderRibbonCustomCapPreview = (values: { depth: number }) => (
  <Layout viewBox={{ x: -230, y: -100, width: 460, height: 200 }} extensions={{ pathKinds: [ribbonDefinition] }}>
    <Path
      kind="ribbon"
      kindOptions={{
        width: { kind: 'fixed', value: 40 },
        start: { cap: { name: 'pointed', params: { depth: values.depth } } },
        end: { cap: { name: 'pointed', params: { depth: values.depth } } },
      }}
      style={{ fill: '#60a5fa', stroke: '#2563eb', strokeWidth: 1 }}
    >
      <Step kind="move" to={[-150, 0]} />
      <Step kind="line" to={[150, 0]} />
    </Path>
  </Layout>
);
