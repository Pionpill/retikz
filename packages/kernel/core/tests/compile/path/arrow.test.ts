import { describe, expect, it } from 'vitest';

import type { PathPrim, ScenePrimitive } from '../../../src/contract';
import type { IRScene } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { arrowMarks } from '../../helpers/arrow-marks';
import { line, move } from '../../helpers/path-command-factory';
import { findPathPrim } from './helpers';

describe('compile path: arrow 箭头', () => {
  it("arrow: '->' → PathPrim arrowEnd shape='stealth'，arrowStart 不写", () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: arrowMarks('->'),
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir).scene;
    const path = findPathPrim(scene.primitives);
    expect(path.arrowEnd?.shape).toBe('stealth');
    expect(path.arrowStart).toBeUndefined();
  });

  it("arrow: '<-' → arrowStart shape='stealth'", () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: arrowMarks('<-'),
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).scene.primitives);
    expect(path.arrowStart?.shape).toBe('stealth');
    expect(path.arrowEnd).toBeUndefined();
  });

  it("arrow: '<->' → 两端都 shape='stealth'", () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: arrowMarks('<->'),
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).scene.primitives);
    expect(path.arrowStart?.shape).toBe('stealth');
    expect(path.arrowEnd?.shape).toBe('stealth');
  });

  it("arrow: 'none' / 缺省 → 两端都不挂 marker", () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    const path = findPathPrim(compileToScene(ir).scene.primitives);
    expect(path.arrowStart).toBeUndefined();
    expect(path.arrowEnd).toBeUndefined();
  });

  it('多 sub-path + arrow → 拆成 GroupPrim：首段独占 arrowStart，末段独占 arrowEnd', () => {
    // A → B → C 多节点路径，'->'。期望产出 GroupPrim 内 2 个 PathPrim：
    //   首段 d="M ... L ..."（无 arrow）
    //   末段 d="M ... L ..."（arrowEnd shape='stealth'）
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [60, 0] },
        { type: 'node', id: 'C', position: [60, 60] },
        {
          type: 'path',
          marks: arrowMarks('->'),
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'line', to: { id: 'B' } },
            { type: 'step', kind: 'line', to: { id: 'C' } },
          ],
        },
      ],
    };
    const scene = compileToScene(ir).scene;
    const group = scene.primitives.find((p): p is Extract<ScenePrimitive, { type: 'group' }> => p.type === 'group');
    expect(group).toBeDefined();
    expect(group?.children).toHaveLength(2);
    const [first, last] = group!.children as Array<PathPrim>;
    expect(first.arrowStart).toBeUndefined();
    expect(first.arrowEnd).toBeUndefined();
    expect(last.arrowStart).toBeUndefined();
    expect(last.arrowEnd?.shape).toBe('stealth');
  });

  it('Core 内置 arrowDetail.shape 透传到 PathPrim 作为 arrowEnd / arrowStart 的 shape', () => {
    for (const shape of ['normal', 'stealth'] as const) {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            marks: arrowMarks('->', { shape }),
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ],
      };
      const path = findPathPrim(compileToScene(ir).scene.primitives);
      expect(path.arrowEnd?.shape).toBe(shape);
    }
  });

  it.each([
    ['normal', 94], // shrink = length × scale = 6
    ['stealth', 95.8], // shrink = 0.7 × length × scale = 4.2（V tip x=3，line 嵌进凹口）
  ] as const)(
    'Core 内置实心 shape %s 会缩短路径端点，避免线条透出 marker',
    (shape, expectedEndX) => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            marks: arrowMarks('->', { shape }),
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ],
      };
      expect(findPathPrim(compileToScene(ir).scene.primitives).commands).toEqual([
        move([0, 0]),
        line([expectedEndX, 0]),
      ]);
    },
  );

  it("arrowDetail 缺省时 shape 回退 'stealth'", () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: arrowMarks('->'),
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).scene.primitives).arrowEnd?.shape).toBe('stealth');
  });

  it('单 sub-path + arrow → 不拆 group，直接一个 PathPrim 挂 marker', () => {
    // 直接坐标，无 boundary clip 差异，单 sub-path
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: arrowMarks('->'),
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir).scene;
    expect(scene.primitives.find(p => p.type === 'group')).toBeUndefined();
    const path = findPathPrim(scene.primitives);
    expect(path.arrowEnd?.shape).toBe('stealth');
  });
});
