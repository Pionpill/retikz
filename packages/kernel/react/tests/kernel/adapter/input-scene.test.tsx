import { normalizeScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { Node, Path, Scope, Step } from '../../../src/kernel';
import { createInputScene } from '../../../src/kernel/adapter/input-scene';
import { Draw } from '../../../src/sugar';

describe('React JSX Input 场景', () => {
  it('将 Kernel JSX 收集为 Vanilla Input，并由 Vanilla 解析字符串 target', () => {
    const input = createInputScene(
      <>
        <Node id="source" position={[0, 0]} />
        <Path id="edge">
          <Step kind="move" to="source.center" />
          <Step kind="line" to="target.bottom" />
        </Path>
      </>,
    );

    expect(normalizeScene(input.scene).ir.children).toMatchObject([
      { type: 'node', id: 'source' },
      {
        type: 'path',
        id: 'edge',
        children: [
          { type: 'step', kind: 'move', to: { id: 'source', anchor: 'center' } },
          { type: 'step', kind: 'line', to: { id: 'target', anchor: 'bottom' } },
        ],
      },
    ]);
  });

  it('将 Draw 的 way 原样交给 Vanilla Path normalizer', () => {
    const input = createInputScene(<Draw way={['source', 'target']} stroke="#2563eb" />);

    expect(normalizeScene(input.scene).ir.children).toEqual([
      {
        type: 'path',
        stroke: '#2563eb',
        children: [
          { type: 'step', kind: 'move', to: { id: 'source' } },
          { type: 'step', kind: 'line', to: { id: 'target' } },
        ],
      },
    ]);
  });

  it('保留 Path 与 Scope 的 runtime-only authoring，供 Vanilla compile driver 消费', () => {
    const scopeAuthoring = Object.freeze({ scope: true });
    const pathAuthoring = Object.freeze({ path: true });
    const input = createInputScene(
      <Scope authoring={scopeAuthoring}>
        <Path authoring={pathAuthoring}>
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[10, 0]} />
        </Path>
      </Scope>,
    );

    expect(input.scene.children).toMatchObject([
      {
        authoring: scopeAuthoring,
        children: [{ authoring: pathAuthoring }],
      },
    ]);
  });
});
