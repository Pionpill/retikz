import type { CompileResult, PathCommand, ScenePrimitive } from '@retikz/core';
import { visitSceneContent } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  compileInspectionToScene,
  createDefaultInspectorRegistry,
  createInspectorRegistry,
  defineInspector,
  CLIP_INSPECTOR_KEY,
  PATH_INSPECTOR_KEY,
} from '../../src';

const inputOf = (primitives: Array<ScenePrimitive>): CompileResult => ({
  scene: { primitives, layout: { x: 0, y: 0, width: 100, height: 100 } },
  artifacts: [],
});
const registry = createDefaultInspectorRegistry();

describe('最终图元检查', () => {
  it('以圆弧开始的路径保留两个端点，闭合不重复标记起点', () => {
    const input = inputOf([
      {
        type: 'path',
        commands: [{ kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 90 }, { kind: 'close' }],
      },
    ]);
    const output = compileInspectionToScene(input, {
      registry,
      requests: [{ inspector: PATH_INSPECTOR_KEY, options: { controlPoints: false, vertices: true } }],
    });
    const vertices: Array<ReadonlyArray<number>> = [];
    for (const entry of output.inspection?.entries ?? [])
      visitSceneContent(entry.scene, primitive => {
        if (primitive.type === 'ellipse') vertices.push([primitive.cx, primitive.cy]);
      });
    expect(vertices).toEqual([
      [10, 0],
      [0, 10],
    ]);
  });
  it('圆弧后的曲线控制柄从真实圆弧终点开始', () => {
    const input = inputOf([
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [10, 0] },
          { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 90 },
          { kind: 'quad', control: [20, 20], to: [30, 0] },
        ],
      },
    ]);
    const output = compileInspectionToScene(input, { registry, requests: [{ inspector: PATH_INSPECTOR_KEY }] });
    const commands: Array<PathCommand> = [];
    for (const entry of output.inspection?.entries ?? [])
      visitSceneContent(entry.scene, primitive => {
        if (primitive.type === 'path') commands.push(...primitive.commands);
      });
    expect(commands).toContainEqual({ kind: 'move', to: [0, 10] });
    expect(commands).toContainEqual({ kind: 'line', to: [20, 20] });
  });
  it('同一裁剪资源在不同分组中分别放置，完整保留外缘和孔洞', () => {
    const input: CompileResult = {
      scene: {
        layout: { x: 0, y: 0, width: 100, height: 100 },
        primitives: [
          { type: 'group', transforms: [{ kind: 'translate', x: 10, y: 0 }], clipRef: 'shared', children: [] },
          { type: 'group', transforms: [{ kind: 'translate', x: 40, y: 0 }], clipRef: 'shared', children: [] },
        ],
        resources: [
          {
            kind: 'clip',
            id: 'shared',
            path: {
              commands: [
                { kind: 'move', to: [0, 0] },
                { kind: 'line', to: [20, 0] },
                { kind: 'line', to: [20, 20] },
                { kind: 'close' },
                { kind: 'move', to: [5, 5] },
                { kind: 'line', to: [10, 5] },
                { kind: 'line', to: [10, 10] },
                { kind: 'close' },
              ],
              fillRule: 'evenodd',
            },
          },
        ],
      },
      artifacts: [],
    };
    const before = structuredClone(input);
    const output = compileInspectionToScene(input, { registry, requests: [{ inspector: CLIP_INSPECTOR_KEY }] });
    expect(output.inspection?.entries.map(entry => entry.transform[4])).toEqual([10, 10, 40, 40]);
    expect(input).toEqual(before);
    for (const entry of output.inspection?.entries ?? [])
      expect(entry.scene.resources?.some(resource => resource.kind === 'clip')).not.toBe(true);
  });
  it('辅助输出清除公开身份、meta 和动画，保留独立资源闭包', () => {
    const definition = defineInspector({
      namespace: 'test',
      type: 'resource',
      subject: { kind: 'primitive', type: 'path' },
      inspect: () => [
        {
          coordinateSpace: 'scene',
          child: {
            type: 'node',
            id: 'aux-node',
            position: [0, 0],
            meta: { label: 'debug' },
            style: { fill: { kind: 'pattern', shape: 'grid', color: 'red', size: 10 } },
          },
        },
      ],
    });
    const input = inputOf([
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [10, 10] },
        ],
      },
    ]);
    const output = compileInspectionToScene(input, {
      registry: createInspectorRegistry([definition]),
      requests: [{ inspector: definition }],
    });
    expect(output.inspection?.entries[0].scene.resources?.length).toBeGreaterThan(0);
    for (const entry of output.inspection?.entries ?? [])
      visitSceneContent(entry.scene, primitive => {
        expect(primitive.id).toBeUndefined();
        expect(primitive.meta).toBeUndefined();
        expect(primitive.animations).toBeUndefined();
      });
  });
});
