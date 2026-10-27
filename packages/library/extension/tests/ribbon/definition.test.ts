import type { IRScene, ScenePrimitive } from '@retikz/core';
import { compileToScene, visitSceneContent } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { ribbonPathDefinition } from '../../src/ribbon';

const line = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
];

const compile = (path: Record<string, unknown>) =>
  compileToScene({ version: 1, type: 'scene', children: [path] } as unknown as IRScene, {
    paths: [ribbonPathDefinition],
  }).scene;

describe('扩展功能区定义', () => {
  it('将主颜色映射到填充并保留明确的描边', () => {
    const scene = compile({
      type: 'path',
      kind: 'ribbon',
      kindOptions: { width: { kind: 'fixed', value: 4 }, sampling: { kind: 'fixed', samples: 2 } },
      children: line,
      style: { color: 'crimson', stroke: 'black' },
    });

    expect(scene.primitives.find(value => value.type === 'path')).toMatchObject({
      fill: 'crimson',
      stroke: 'black',
    });
  });

  it('在具体化中心线时忽略主体标记', () => {
    const scene = compile({
      type: 'path',
      kind: 'ribbon',
      kindOptions: { width: { kind: 'fixed', value: 4 }, sampling: { kind: 'fixed', samples: 2 } },
      marks: [{ pos: 0.5, shape: 'missing' }],
      children: line,
    });

    const contents: Array<ScenePrimitive> = [];
    visitSceneContent(scene, primitive => {
      if (primitive.type !== 'group') contents.push(primitive);
    });
    expect(contents).toHaveLength(1);
    expect(contents[0]).toMatchObject({ type: 'path' });
  });

  it('从两个显式边界路径发出边界带', () => {
    const scene = compile({
      type: 'path',
      kind: 'ribbon',
      kindOptions: { mode: 'boundary', upper: line, lower: line.map(step => ({ ...step, to: [step.to[0], -2] })) },
    });

    expect(scene.primitives.find(value => value.type === 'path')).toMatchObject({ fill: 'currentColor' });
  });
});
