import type { IRScene } from '@retikz/core';

import { compileToScene, SceneSchema } from '@retikz/core';
import { normalizeScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { Node, Path, Scope, Step } from '../../../src/kernel';
import { createInputScene } from '../../../src/kernel/adapter/input-scene';
import { Draw, EdgeLabel } from '../../../src/sugar';

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

  it('把 Path 的 arrowPlacement 原样交给 Vanilla 并生成端点重叠 IR', () => {
    const props = {
      arrow: '->' as const,
      arrowPlacement: { end: { overlap: 0.5 } },
    };
    const input = createInputScene(
      <Path {...props}>
        <Step kind="move" to={[0, 0]} />
        <Step kind="line" to={[20, 0]} />
      </Path>,
    );

    expect(normalizeScene(input.scene).ir.children).toMatchObject([
      {
        type: 'path',
        marks: [{ pos: 1, endpointOverlap: 0.5, mark: { kind: 'arrow' } }],
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

  it('将 EdgeLabel interrupt 布尔值透传为经 Core schema 验证的 Vanilla IR', () => {
    const input = createInputScene(
      <Path>
        <Step kind="move" to={[0, 0]} />
        <Step kind="line" to={[10, 0]}>
          <EdgeLabel interrupt>force</EdgeLabel>
        </Step>
        <Step kind="line" to={[20, 0]}>
          <EdgeLabel interrupt={false}>continuous</EdgeLabel>
        </Step>
      </Path>,
    );

    expect(SceneSchema.parse(normalizeScene(input.scene).ir).children).toMatchObject([
      {
        type: 'path',
        children: [
          { kind: 'move' },
          { kind: 'line', label: { text: 'force', interrupt: true } },
          { kind: 'line', label: { text: 'continuous', interrupt: false } },
        ],
      },
    ]);
  });

  it('React EdgeLabel、Vanilla Input 与直接 JSON 编译为同一断线路径 Scene', () => {
    const direct: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          id: 'edge',
          stroke: '#13579b',
          label: { text: 'host', sloped: true },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0], label: { text: 'step', sloped: true } },
          ],
        },
      ],
    };
    const reactInput = createInputScene(
      <Path id="edge" stroke="#13579b" label={{ text: 'host', sloped: true }}>
        <Step kind="move" to={[0, 0]} />
        <Step kind="line" to={[100, 0]}>
          <EdgeLabel sloped>step</EdgeLabel>
        </Step>
      </Path>,
    );
    const measureText = () => ({ width: 20, height: 10 });
    const jsonScene = compileToScene(direct, { measureText }).scene;
    const vanillaScene = compileToScene(normalizeScene({ children: direct.children }).ir, { measureText }).scene;
    const reactScene = compileToScene(normalizeScene(reactInput.scene).ir, { measureText }).scene;

    expect(vanillaScene).toEqual(jsonScene);
    expect(reactScene).toEqual(jsonScene);
  });
});
