import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';
import { PathClipDefinition } from '@retikz/standard/clip';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathClipControls, previewControlContract } from './path-clip.controls';

export const previewControls = pathClipControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout width={360} height={220} viewBox={{ x: -125, y: -100, width: 250, height: 200 }} clips={[PathClipDefinition]}>
    <Node
      position={[0, 0]}
      shape="rectangle"
      minimumSize={{ width: 220, height: 170 }}
      fill="none"
      stroke="lightgray"
      strokeWidth={1}
      dashPattern={[6, 4]}
    />
    <Scope
      clip={{
        kind: 'path',
        fillRule: values.fillRule,
        commands: [
          { kind: 'move', to: [-82, -values.halfHeight] },
          { kind: 'line', to: [18, -values.halfHeight] },
          { kind: 'line', to: [values.tipX, 0] },
          { kind: 'line', to: [18, values.halfHeight] },
          { kind: 'line', to: [-82, values.halfHeight] },
          { kind: 'line', to: [values.notchX, 0] },
          { kind: 'close' },
          { kind: 'move', to: [-values.holeSize, 0] },
          { kind: 'line', to: [0, -values.holeSize] },
          { kind: 'line', to: [values.holeSize, 0] },
          { kind: 'line', to: [0, values.holeSize] },
          { kind: 'close' },
        ],
      }}
    >
      <Node
        position={[0, 0]}
        shape="rectangle"
        minimumSize={{ width: 220, height: 170 }}
        stroke="none"
        fill={{ kind: 'pattern', shape: 'grid', color: 'darkorange', size: 14 }}
      />
    </Scope>
  </Layout>
));

export const previewSource = controlledPreview.source;

/** 固定路径命令结构，并调整命令坐标与填充规则 */
const Demo: FC = controlledPreview.Component;

export default Demo;
