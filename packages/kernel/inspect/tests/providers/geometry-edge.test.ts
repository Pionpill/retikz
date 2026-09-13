import type { IRScene, IRScopeDefaults, PathCommand, ScenePrimitive } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { CLIP_INSPECTOR, compileInspectionToScene, createDefaultInspectorRegistry,SCOPE_INSPECTOR } from '../../src';

/** 展开容器以检查实际几何命令 */
const leafPrimitives = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive => (primitive.type === 'group' ? leafPrimitives(primitive.children) : [primitive]));

describe('内置辅助几何边界', () => {
  it('Scope 层级标签与原点保持 12 单位纵向间距', () => {
    const locator = { sourcePath: 'children[0].scope', expansionPath: [] };
    const output = SCOPE_INSPECTOR.inspect(
      { envelope: null },
      {
        inspectorKey: { namespace: 'core', type: 'scope' },
        owner: { kind: 'scope' },
        occurrence: locator,
        provenance: { origin: locator, final: locator },
        transform: [1, 0, 0, 1, 0, 0],
        round: value => value,
        ancestors: [],
        options: { envelope: false, origin: false, axes: false, labels: true },
        warn: () => undefined,
        appearance: {
          colorScope: 0,
          scopeColor: '#123456',
          semanticColors: { error: 'red', warning: 'orange', success: 'green', guide: 'gray' },
        },
      },
    );
    expect(output).toMatchObject([
      { type: 'scope', children: [{ type: 'node', position: [6, -12], text: 'scope 1' }] },
    ]);
  });

  it.each([0, 20, 300])('Scope 坐标轴固定长度并携带箭头与轴名，不随包络尺寸改变（%s）', width => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'rotate', degrees: 90 }],
          children:
            width === 0
              ? []
              : [{ type: 'node', position: [0, 0], layout: { minimumSize: { width, height: width }, padding: 0 } }],
        },
      ],
    };
    const compile = (axes: boolean) =>
      compileInspectionToScene(ir, {
        registry: createDefaultInspectorRegistry(),
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: { namespace: 'core', type: 'scope' },
              target: { kind: 'scene' },
              options: { envelope: false, origin: false, labels: false, axes },
            },
          ],
        },
      });
    const result = compile(true);
    const primitives = leafPrimitives(result.inspection?.entries.flatMap(entry => entry.scene.primitives) ?? []);
    const paths = primitives.filter(item => item.type === 'path');
    expect(paths).toHaveLength(2);
    // 40 单位的轴由 Core 为 6 单位箭头缩短线身，保留其标准接触重叠
    expect(paths.map(path => path.commands.at(-1))).toEqual([
      { kind: 'line', to: [36.3, 0] },
      { kind: 'line', to: [0, 36.3] },
    ]);
    expect(paths.every(path => path.arrowEnd !== undefined)).toBe(true);
    expect(paths.map(path => path.dashPattern)).toEqual([
      [2, 2],
      [2, 2],
    ]);
    expect(primitives.filter(item => item.type === 'text').flatMap(item => item.lines.map(line => line.text))).toEqual([
      'x',
      'y',
    ]);
    expect(result.inspection?.entries.every(entry => Math.abs(entry.transform[1] - 1) < 1e-10)).toBe(true);
    expect(compile(false).inspection).toBeNull();
  });

  it.each([undefined, 0, 4])('圆弧起点按主图编译精度去重，保留相邻不同顶点（precision=%s）', precision => {
    for (const radiusY of [80, 50]) {
      const angle = (200 * Math.PI) / 180;
      const start: [number, number] = [80 * Math.cos(angle), radiusY * Math.sin(angle)];
      const result = compileInspectionToScene(
        {
          version: 1,
          type: 'scene',
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: start },
                {
                  type: 'step',
                  kind: 'arc',
                  center: [0, 0],
                  radius: { x: 80, y: radiusY },
                  startAngle: 200,
                  endAngle: 340,
                },
                { type: 'step', kind: 'line', to: [start[0] + 10 ** -(precision ?? 2), start[1]] },
              ],
            },
          ],
        },
        {
          compileOptions: { precision },
          registry: createDefaultInspectorRegistry(),
          selection: {
            rules: [
              {
                kind: 'request',
                inspector: { namespace: 'core', type: 'path' },
                target: { kind: 'scene' },
                options: { controlPoints: false, vertices: true, arcGeometry: true, labels: true },
              },
            ],
          },
        },
      );
      const primitives = leafPrimitives(result.inspection?.entries.flatMap(entry => entry.scene.primitives) ?? []);
      // 三个不同顶点与一个圆心；同起点的 move、arc 和半径标记共享一个点
      expect(primitives.filter(item => item.type === 'ellipse')).toHaveLength(4);
      // 去重后的顶点连续编号，不暴露命令的 start/end 后缀
      expect(
        primitives.filter(item => item.type === 'text').flatMap(item => item.lines.map(line => line.text)),
      ).toEqual(['V0', 'V1', 'V2', 'A1']);
      expect(result.diagnostics).toEqual([]);
    }
  });

  it('旋转椭圆轮廓保留精确曲线，不退化成采样折线', () => {
    const result = compileInspectionToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            shape: 'ellipse',
            rotate: 31,
            position: [13, 27],
            layout: { minimumSize: { width: 80, height: 40 }, padding: 0 },
          },
        ],
      },
      {
        registry: createDefaultInspectorRegistry(),
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: { namespace: 'core', type: 'node' },
              target: { kind: 'scene' },
              options: { outline: true, boundary: false, box: false, content: false },
            },
          ],
        },
      },
    );
    expect(result.diagnostics).toEqual([]);
    const curves = leafPrimitives(result.inspection?.entries.flatMap(entry => entry.scene.primitives) ?? [])
      .filter(item => item.type === 'path')
      .flatMap(item => item.commands)
      .filter(command => command.kind === 'ellipseArc');
    expect(curves).toHaveLength(1);
    expect(curves[0]).toMatchObject({ radiusX: 40, radiusY: 20, startAngle: 0, endAngle: 360 });
  });

  it('空Scope默认保留原点，不伪造固有包络', () => {
    const result = compileInspectionToScene(
      { version: 1, type: 'scene', children: [{ type: 'scope', children: [] }] },
      {
        registry: createDefaultInspectorRegistry(),
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: { namespace: 'core', type: 'scope' },
              target: { kind: 'scene' },
              options: true,
            },
          ],
        },
      },
    );
    expect(
      leafPrimitives(result.inspection?.entries.flatMap(entry => entry.scene.primitives) ?? []).map(item => item.type),
    ).toEqual(['ellipse']);
    expect(result.diagnostics).toEqual([]);
  });

  it.each([10, 5])('整圆或整椭圆的重合端点跨facet只绘制一次（半径y=%s）', radiusY => {
    const result = compileInspectionToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [10, 0] },
              {
                type: 'step',
                kind: 'arc',
                center: [0, 0],
                radius: { x: 10, y: radiusY },
                startAngle: 0,
                endAngle: 360,
              },
            ],
          },
        ],
      },
      {
        registry: createDefaultInspectorRegistry(),
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: { namespace: 'core', type: 'path' },
              target: { kind: 'scene' },
              options: { vertices: true, arcGeometry: true },
            },
          ],
        },
      },
    );
    const markers = leafPrimitives(result.inspection?.entries.flatMap(entry => entry.scene.primitives) ?? []).filter(
      item => item.type === 'ellipse',
    );
    expect(markers.filter(item => item.cx === 10 && item.cy === 0)).toHaveLength(1);
    expect(markers.filter(item => item.cx === 0 && item.cy === 0)).toHaveLength(1);
    expect(result.diagnostics).toEqual([]);
  });

  it('主图默认尺寸、旋转与视觉样式不污染未变换的辅助线、点和标签', () => {
    const compile = (defaults?: IRScopeDefaults) => {
      const scene: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'scope',
            defaults,
            children: [
              { type: 'coordinate', id: 'point', position: [10, 20] },
              {
                type: 'path',
                children: [
                  { type: 'step', kind: 'move', to: [0, 0] },
                  { type: 'step', kind: 'curve', control: [20, -20], to: [40, 0] },
                ],
              },
            ],
          },
        ],
      };
      return compileInspectionToScene(scene, {
        registry: createDefaultInspectorRegistry(),
        selection: {
          rules: ['coordinate', 'path'].map(type => ({
            kind: 'request',
            inspector: { namespace: 'core', type },
            target: { kind: 'scene' },
            options: { labels: true },
          })),
        },
      }).inspection;
    };
    expect(
      compile({
        node: {
          rotate: 70,
          layout: { width: 300, padding: 50 },
          style: { fill: '#ff00ff', opacity: 0.1, font: { size: 60 } },
        },
        path: { style: { fill: '#ff0000', strokeWidth: 20, dashPattern: [20, 10] } },
      }),
    ).toEqual(compile());
  });

  it.each([false, true])('旋转椭圆弧分段后保留原始封口边（隐式封口=%s）', implicit => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [0, 0] },
      { kind: 'ellipseArc', center: [10, 10], radiusX: 6, radiusY: 3, rotation: 90, startAngle: 0, endAngle: 90 },
      { kind: 'line', to: [20, 20] },
      ...(implicit ? [] : [{ kind: 'close' as const }]),
    ];
    const locator = { sourcePath: 'children[0].scope', expansionPath: [] };
    const output = CLIP_INSPECTOR.inspect(
      { path: { commands, fillRule: 'evenodd' } },
      {
        inspectorKey: { namespace: 'core', type: 'clip' },
        owner: { kind: 'clip' },
        occurrence: locator,
        provenance: { origin: locator, final: locator },
        transform: [1, 0, 0, 1, 0, 0],
        round: (value: number) => value,
        ancestors: [],
        options: { outline: true, labels: false },
        warn: () => undefined,
        appearance: {
          colorScope: 0,
          scopeColor: '#123456',
          semanticColors: { error: '#ff0000', warning: '#ff8800', success: '#00ff00', guide: '#888888' },
        },
      },
    );
    const scene = compileToScene({ version: 1, type: 'scene', children: Array.isArray(output) ? output : [output] });
    const paths = leafPrimitives(scene.scene.primitives).filter(primitive => primitive.type === 'path');
    const lines = paths.flatMap(primitive => primitive.commands.filter(command => command.kind === 'line'));
    expect(lines).toContainEqual({ kind: 'line', to: [0, 0] });
    expect(lines).toContainEqual({ kind: 'line', to: [10, 16] });
    expect(paths.at(-1)?.commands.at(-1)).toEqual({ kind: 'line', to: [0, 0] });
  });
});
