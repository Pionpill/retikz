import type { IRClip } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';
import { CompoundClipDefinition } from '@retikz/standard/clip';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scopeClipControls } from './scope-clip.controls';

/** controls registry 未刷新时供 ComponentPreview 从 demo 模块直接解析的兜底定义 */
export const previewControls = scopeClipControls;

type ScopeClipValues = PreviewControlValuesFor<typeof scopeClipControls>;

const CLIP_BY_KIND: Record<ScopeClipValues['clipKind'], IRClip> = {
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

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Layout
      width={220}
      height={84}
      viewBox={{ x: -110, y: -60, width: 220, height: 120 }}
      clips={[CompoundClipDefinition]}
    >
      <Scope clip={CLIP_BY_KIND[values.clipKind]}>
        <Node
          id="grid"
          position={[0, 0]}
          shape="rectangle"
          minimumSize={{ width: 140, height: 100 }}
          stroke="none"
          fill={{ kind: 'pattern', shape: 'grid', color: 'darkorange', size: 12 }}
        />
      </Scope>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/**
 * Scope clip 类型 playground
 * @description 面板切换五种 Core 基础 clip 和一种 Standard 组合 clip，同一块网格内容只露出当前 Scope 局部裁剪区内的部分
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
