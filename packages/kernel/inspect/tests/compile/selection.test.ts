import type { CompileResult } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { compileInspectionToScene, createInspectorRegistry, defineInspector } from '../../src';

const result: CompileResult = {
  scene: {
    layout: { x: 0, y: 0, width: 10, height: 10 },
    primitives: [
      {
        type: 'group',
        transforms: [
          { kind: 'translate', x: 10, y: 20 },
          { kind: 'scale', x: -2, y: 0 },
        ],
        children: [{ type: 'group', transforms: [{ kind: 'translate', x: 3, y: 4 }], children: [] }],
      },
    ],
  },
  artifacts: [],
};
describe('结果对象选择与空间', () => {
  it('目标字段顺序不影响对象选择', () => {
    const paths: Array<unknown> = [];
    const definition = defineInspector({
      namespace: 'test',
      type: 'order',
      subject: { kind: 'primitive', type: 'group' },
      inspect: (_subject, context) => {
        paths.push(context.target);
        return [];
      },
    });
    compileInspectionToScene(result, {
      registry: createInspectorRegistry([definition]),
      requests: [{ inspector: definition, target: { path: [0, 0], kind: 'primitive' } }],
    });
    expect(paths).toEqual([{ kind: 'primitive', path: [0, 0] }]);
  });
  it('按父先于子选择真实 group，并支持负缩放和奇异变换', () => {
    const transforms: Array<ReadonlyArray<number>> = [];
    const paths: Array<unknown> = [];
    const definition = defineInspector({
      namespace: 'test',
      type: 'group',
      subject: { kind: 'primitive', type: 'group' },
      inspect: (_subject, context) => {
        transforms.push(context.transform);
        paths.push(context.target);
        return [];
      },
    });
    compileInspectionToScene(result, {
      registry: createInspectorRegistry([definition]),
      requests: [{ inspector: definition }],
    });
    expect(paths).toEqual([
      { kind: 'primitive', path: [0] },
      { kind: 'primitive', path: [0, 0] },
    ]);
    expect(transforms).toEqual([
      [-2, 0, 0, 0, 10, 20],
      [-2, 0, 0, 0, 4, 20],
    ]);
  });
  it('显式不存在或种类不匹配的目标失败', () => {
    const definition = defineInspector({
      namespace: 'test',
      type: 'path',
      subject: { kind: 'primitive', type: 'path' },
      inspect: () => [],
    });
    for (const path of [[0], [4]])
      expect(() =>
        compileInspectionToScene(result, {
          registry: createInspectorRegistry([definition]),
          requests: [{ inspector: definition, target: { kind: 'primitive', path } }],
        }),
      ).toThrow();
  });
  it('local 和 scene 辅助片段应用不同放置矩阵', () => {
    const definition = defineInspector({
      namespace: 'test',
      type: 'spaces',
      subject: { kind: 'primitive', type: 'group' },
      inspect: () => [
        { coordinateSpace: 'local', child: { type: 'node', position: [0, 0] } },
        { coordinateSpace: 'scene', child: { type: 'node', position: [0, 0] } },
      ],
    });
    const output = compileInspectionToScene(result, {
      registry: createInspectorRegistry([definition]),
      requests: [{ inspector: definition, target: { kind: 'primitive', path: [0] } }],
    });
    expect(output.inspection?.entries.map(entry => entry.transform)).toEqual([
      [-2, 0, 0, 0, 10, 20],
      [1, 0, 0, 1, 0, 0],
    ]);
  });
});
