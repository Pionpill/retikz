import type { IRScene, ScenePrimitive } from '@retikz/core';

import { BUILTIN_SHAPES, compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { compileInspectionToScene, createDefaultInspectorRegistry } from '../../src';
import { getResolvedInspectorRegistry } from '../../src/providers';

const registry = createDefaultInspectorRegistry();
const nodeScene: IRScene = { version: 1, type: 'scene', children: [{ type: 'node', position: [0, 0], text: 'A' }] };

/** 读取辅助路径的实际顶点，不把容器层级作为断言目标 */
const pathVertices = (primitives: ReadonlyArray<ScenePrimitive>): Array<readonly [number, number]> =>
  primitives.flatMap(primitive => {
    if (primitive.type === 'group') return pathVertices(primitive.children);
    if (primitive.type !== 'path') return [];
    return primitive.commands.flatMap(command =>
      command.kind === 'move' || command.kind === 'line' ? [command.to] : [],
    );
  });

describe('内置几何检查', () => {
  it('五种内置均注册，但空selection不产生辅助结果', () => {
    expect(
      getResolvedInspectorRegistry(registry)
        .definitions.map(definition => definition.type)
        .sort(),
    ).toEqual(['clip', 'coordinate', 'node', 'path', 'scope']);
    const result = compileInspectionToScene(nodeScene, { registry, selection: { rules: [] } });
    expect(result.inspection).toBeNull();
    expect(result.diagnostics).toEqual([]);
    expect(result.primary).toEqual(compileToScene(nodeScene));
  });

  it.each([0, -2, 2])('Scene AABB使用正向变换，不依赖缩放%s的逆矩阵', scale => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [
            { kind: 'translate', x: 100, y: 200 },
            { kind: 'scale', x: scale, y: 3 },
          ],
          children: [
            {
              type: 'node',
              position: [0, 0],
              rotate: 30,
              layout: { minimumSize: { width: 40, height: 20 }, padding: 0 },
            },
          ],
        },
      ],
    };
    const result = compileInspectionToScene(ir, {
      registry,
      selection: {
        rules: [
          {
            kind: 'request',
            target: { kind: 'scene' },
            inspector: { namespace: 'core', type: 'node' },
            options: {
              outline: false,
              boundary: false,
              box: false,
              content: false,
              baselines: false,
              keyPoints: false,
              labels: false,
            },
          },
        ],
      },
    });
    expect(result.inspection?.entries.length).toBeGreaterThan(0);
    expect(result.inspection?.entries.every(entry => JSON.stringify(entry.transform) === '[1,0,0,1,0,0]')).toBe(true);
    const vertices = pathVertices(result.inspection?.entries.flatMap(entry => entry.scene.primitives) ?? []);
    const xs = vertices.map(point => point[0]);
    const ys = vertices.map(point => point[1]);
    const halfWidth = Math.abs(scale) * (20 * Math.cos(Math.PI / 6) + 10 * Math.sin(Math.PI / 6));
    const halfHeight = 3 * (20 * Math.sin(Math.PI / 6) + 10 * Math.cos(Math.PI / 6));
    expect(Math.min(...xs)).toBeCloseTo(100 - halfWidth, 2);
    expect(Math.max(...xs)).toBeCloseTo(100 + halfWidth, 2);
    expect(Math.min(...ys)).toBeCloseTo(200 - halfHeight, 2);
    expect(Math.max(...ys)).toBeCloseTo(200 + halfHeight, 2);
    expect(result.primary).toEqual(compileToScene(ir));
    expect(result.diagnostics).toEqual([]);
  });

  it('嵌套 Scope 中局部外框与场景 AABB 在同一次请求中使用各自坐标空间', () => {
    const scene: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [
            { kind: 'translate', x: 100, y: 200 },
            { kind: 'rotate', degrees: 90 },
          ],
          children: [
            {
              type: 'scope',
              transforms: [{ kind: 'scale', x: 2, y: 3 }],
              children: [
                { type: 'node', position: [0, 0], layout: { minimumSize: { width: 40, height: 20 }, padding: 0 } },
              ],
            },
          ],
        },
      ],
    };
    const result = compileInspectionToScene(scene, {
      registry,
      selection: {
        rules: [
          {
            kind: 'request',
            target: { kind: 'scene' },
            inspector: { namespace: 'core', type: 'node' },
            options: {
              outline: false,
              boundary: false,
              content: false,
              baselines: false,
              keyPoints: false,
              labels: false,
            },
          },
        ],
      },
    });
    expect(result.inspection?.entries).toHaveLength(2);
    const [local, world] = result.inspection?.entries ?? [];
    expect(local.transform[1]).toBeCloseTo(2);
    expect(local.transform[2]).toBeCloseTo(-3);
    expect(world.transform).toEqual([1, 0, 0, 1, 0, 0]);
    const vertices = pathVertices(world.scene.primitives);
    expect(vertices).toEqual([
      [70, 160],
      [130, 160],
      [130, 240],
      [70, 240],
    ]);
    expect(result.primary).toEqual(compileToScene(scene));
    expect(result.diagnostics).toEqual([]);
  });

  it('Node 默认开启所有显示项，逐项关闭且全部关闭时没有辅助输出', () => {
    const fields = ['outline', 'boundary', 'box', 'bounds', 'content', 'baselines', 'keyPoints', 'labels'] as const;
    const compile = (options: Record<string, boolean> | true) =>
      compileInspectionToScene(nodeScene, {
        registry,
        selection: {
          rules: [
            { kind: 'request', target: { kind: 'scene' }, inspector: { namespace: 'core', type: 'node' }, options },
          ],
        },
      });
    const all = compile(true);
    expect(all.inspection?.entries.length).toBeGreaterThan(0);
    for (const field of fields) {
      expect(compile({ [field]: false }).inspection?.entries.length ?? 0).toBeLessThan(
        all.inspection?.entries.length ?? 0,
      );
    }
    expect(compile(Object.fromEntries(fields.map(field => [field, false]))).inspection).toBeNull();
    expect(all.primary).toEqual(compileToScene(nodeScene));
  });

  it('仅对启用的缺失几何facet报告UnsupportedGeometry，并继续绘制外框', () => {
    const { outline, keyPoints, ...shape } = BUILTIN_SHAPES.rectangle;
    void outline;
    void keyPoints;
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], shape: 'custom', text: 'A' }],
    };
    const compile = (options: { boundary: boolean; outline: boolean; keyPoints: boolean }) =>
      compileInspectionToScene(ir, {
        registry,
        compileOptions: { shapes: [{ ...shape, name: 'custom' }] },
        selection: {
          rules: [
            {
              kind: 'request',
              target: { kind: 'scene' },
              inspector: { namespace: 'core', type: 'node' },
              options,
            },
          ],
        },
      });
    const enabled = compile({ boundary: true, outline: true, keyPoints: true });
    expect(enabled.inspection?.entries.length).toBeGreaterThan(0);
    expect(enabled.diagnostics).toHaveLength(3);
    expect(
      enabled.diagnostics.every(
        diagnostic => diagnostic.cause.code === 'UnsupportedGeometry' && diagnostic.origin.stage === 'inspect',
      ),
    ).toBe(true);
    expect(compile({ boundary: false, outline: false, keyPoints: false }).diagnostics).toEqual([]);
  });
});
