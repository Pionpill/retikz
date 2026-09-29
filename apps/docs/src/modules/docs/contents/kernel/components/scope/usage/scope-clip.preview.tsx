import type { IRClip } from '@retikz/core';
import {
  CircleClipDefinition,
  CompoundClipDefinition,
  EllipseClipDefinition,
  PathClipDefinition,
  PolygonClipDefinition,
} from '@retikz/extension';
import { Layout, Node, Scope } from '@retikz/react';

const CLIP_BY_KIND: Record<ScopeClipPreviewValues['clipKind'], IRClip> = {
  rect: { kind: 'rect', x: -58, y: -40, width: 116, height: 80 },
  circle: { kind: 'circle', cx: 0, cy: 0, r: 52 },
  ellipse: { kind: 'ellipse', cx: 0, cy: 0, rx: 62, ry: 38 },
  polygon: {
    kind: 'polygon',
    points: [
      [-60, 0],
      [-34, -44],
      [34, -44],
      [60, 0],
      [34, 44],
      [-34, 44],
    ],
  },
  path: {
    kind: 'path',
    commands: [
      { kind: 'move', to: [0, -52] },
      { kind: 'line', to: [14, -17] },
      { kind: 'line', to: [58, -17] },
      { kind: 'line', to: [23, 7] },
      { kind: 'line', to: [36, 45] },
      { kind: 'line', to: [0, 23] },
      { kind: 'line', to: [-36, 45] },
      { kind: 'line', to: [-23, 7] },
      { kind: 'line', to: [-58, -17] },
      { kind: 'line', to: [-14, -17] },
      { kind: 'close' },
    ],
  },
  compound: {
    kind: 'compound',
    children: [
      { kind: 'circle', cx: -24, cy: 0, r: 38 },
      { kind: 'circle', cx: 24, cy: 0, r: 38 },
    ],
  },
};

/** 图形参数 */
export type ScopeClipPreviewValues = {
  clipKind: 'circle' | 'rect' | 'ellipse' | 'polygon' | 'path' | 'compound';
};

/** 绘制示例图形 */
export const ScopeClipPreview = (values: ScopeClipPreviewValues) => {
  return (
    <Layout
      extensions={{
        clips: [
          CircleClipDefinition,
          EllipseClipDefinition,
          PolygonClipDefinition,
          PathClipDefinition,
          CompoundClipDefinition,
        ],
      }}
    >
      <Scope clip={CLIP_BY_KIND[values.clipKind]}>
        <Node
          id="grid"
          position={[0, 0]}
          shape="rectangle"
          style={{ stroke: 'none', fill: { kind: 'pattern', shape: 'grid', color: 'darkorange', size: 12 } }}
          layout={{ minimumSize: { width: 140, height: 100 } }}
        />
      </Scope>
    </Layout>
  );
};
