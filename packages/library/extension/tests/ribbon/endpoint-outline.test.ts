import type { AnyPathDefinition, IRPathBase, IRPosition } from '@retikz/core';
import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import {
  createRibbonPathDefinition,
  createRibbonProviderContribution,
  defineRibbonCap,
  ribbonPathDefinition,
  RibbonPathOptionsSchema,
} from '../../src/ribbon';

const compile = (kindOptions: IRPathBase['kindOptions'], definition: AnyPathDefinition = ribbonPathDefinition) => {
  const scene = compileToScene(
    {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          kind: 'ribbon',
          kindOptions,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 100] },
          ],
        },
      ],
    },
    { paths: [definition], padding: 0 },
  ).scene;
  const path = scene.primitives.find(primitive => primitive.type === 'path');
  if (path?.type !== 'path') throw new Error('Expected ribbon path');

  return path;
};

describe('功能区端点轮廓契约', () => {
  it('将反转的截面向量视为同一轴', () => {
    expect(compile({ width: { kind: 'fixed', value: 20 }, start: { direction: [1, 0] } }).commands).toEqual(
      compile({ width: { kind: 'fixed', value: 20 }, start: { direction: [-1, 0] } }).commands,
    );
  });

  it.each(['butt', 'square', 'round'])('零宽度 %s 端帽退化时不产生无效几何', name => {
    const path = compile({ width: { kind: 'fixed', value: 0 }, start: { cap: { name } }, end: { cap: { name } } });

    expect(JSON.stringify(path.commands)).not.toMatch(/null/);
    expect(path.commands[0]).toEqual({ kind: 'move', to: [0, 0] });
  });

  it('拒绝零宽度圆弧扫描', () => {
    expect(() =>
      compile({
        width: { kind: 'fixed', value: 0 },
        end: { cap: { name: 'arc', params: { center: [0, 0], radius: 10 } } },
      }),
    ).toThrow(/nonzero width/);
  });

  it('直接定义和提供者定义以相同方式组装自定义端帽', () => {
    const cap = defineRibbonCap({
      name: 'pointed',
      paramsSchema: strictObject({}),
      resolve: context => {
        const position = (x: number, y: number): IRPosition => [
          context.center[0] + x * context.outward[0] + y * context.sectionAxis[0],
          context.center[1] + x * context.outward[1] + y * context.sectionAxis[1],
        ];
        const half = (context.width / 2) * (context.endpoint === 'end' ? 1 : -1);

        return {
          extension: 0,
          commands: [
            { kind: 'move', to: position(0, half) },
            { kind: 'line', to: position(30, 0) },
            { kind: 'line', to: position(0, -half) },
          ],
        };
      },
    });
    const options = {
      width: { kind: 'fixed', value: 20 },
      start: { direction: 0, cap: { name: cap.name } },
      end: { direction: 0, cap: { name: cap.name } },
    };
    const direct = compile(options, createRibbonPathDefinition({ caps: [cap] }));
    const definitions = resolveCoreProviderDependencies({
      contributions: [createRibbonProviderContribution({ caps: [cap] })],
    });

    expect(compile(options, definitions.paths?.[0]).commands).toEqual(direct.commands);
    expect(direct.commands).toContainEqual({ kind: 'line', to: [0, -30] });
    expect(direct.commands).toContainEqual({ kind: 'line', to: [100, 130] });
  });

  it('即使只有两个基础样本，也可以在中心线角处保持斜角连接', () => {
    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            kind: 'ribbon',
            kindOptions: { width: { kind: 'fixed', value: 20 }, sampling: { kind: 'fixed', samples: 2 } },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
              { type: 'step', kind: 'line', to: [100, 100] },
            ],
          },
        ],
      },
      { paths: [ribbonPathDefinition] },
    ).scene;
    const path = scene.primitives.find(primitive => primitive.type === 'path');
    if (path?.type !== 'path') throw new Error('Expected ribbon path');

    expect(path.commands).toContainEqual({ kind: 'line', to: [100, 10] });
    expect(path.commands).toContainEqual({ kind: 'line', to: [90, 0] });
    expect(path.commands.some(command => command.kind === 'cubic')).toBe(false);
  });

  it('保留方向作为截面轴并保留端点中心', () => {
    const path = compile({ width: { kind: 'fixed', value: 20 }, start: { direction: 0 }, end: { direction: 0 } });

    expect(path.commands[0]).toEqual({ kind: 'move', to: [-10, 0] });
    expect(path.commands).toContainEqual({ kind: 'line', to: [110, 100] });
  });

  it('拒绝平行于中心线的截面', () => {
    expect(() => compile({ width: { kind: 'fixed', value: 20 }, start: { direction: 45 } })).toThrow(/section/i);
  });

  it('默认使用三次插值', () => {
    const path = compile({ width: { kind: 'fixed', value: 20 } });

    expect(path.commands.some(command => command.kind === 'cubic')).toBe(true);
    expect(path.commands.at(-1)).toEqual({ kind: 'close' });
  });

  it('拒绝在 JSON 边界处删除的采样简写', () => {
    expect(RibbonPathOptionsSchema.safeParse({ width: { kind: 'fixed', value: 20 }, samples: 4 }).success).toBe(false);
    expect(
      RibbonPathOptionsSchema.safeParse({ width: { kind: 'fixed', value: 20 }, start: { cap: 'round' } }).success,
    ).toBe(false);
  });

  it('向自定义端帽提供端点坐标系并保留回调失败原因', () => {
    const failure = new Error('cap failure');
    const cap = defineRibbonCap({
      name: 'failing',
      paramsSchema: strictObject({}),
      resolve: context => {
        expect(context.endpoint).toBe('start');
        expect(context.width).toBe(20);
        expect(context.sectionAxis[1]).toBeCloseTo(0);
        throw failure;
      },
    });
    const definition = createRibbonPathDefinition({ caps: [cap] });
    let caught: unknown;

    try {
      compile({ width: { kind: 'fixed', value: 20 }, start: { direction: 0, cap: { name: 'failing' } } }, definition);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);

    while (caught instanceof Error && caught.cause !== undefined) caught = caught.cause;

    expect(caught).toBe(failure);
  });

  it('包括场景布局边界中的长圆形帽极值', () => {
    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            kind: 'ribbon',
            kindOptions: {
              width: { kind: 'fixed', value: 10 },
              end: {
                direction: 0,
                cap: { name: 'arc', params: { center: [-Math.sqrt(75), 0], radius: 10, sweep: 'long' } },
              },
            },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 100] },
            ],
          },
        ],
      },
      { paths: [ribbonPathDefinition], padding: 0 },
    ).scene;

    expect(scene.layout.x + scene.layout.width).toBeGreaterThanOrEqual(110);
    expect(scene.layout.y + scene.layout.height).toBeGreaterThanOrEqual(100 - Math.sqrt(75) + 10);
  });

  it('报告未知端帽及无效端帽参数而不回退', () => {
    expect(() => compile({ width: { kind: 'fixed', value: 20 }, end: { cap: { name: 'missing' } } })).toThrow(
      /missing/,
    );
    expect(() =>
      compile({ width: { kind: 'fixed', value: 20 }, end: { cap: { name: 'arc', params: { radius: -1 } } } }),
    ).toThrow(/end.cap/);
  });

  it('绕截面框架旋转弦弧', () => {
    const path = compile({
      width: { kind: 'fixed', value: 10 },
      start: { direction: 0, cap: { name: 'arc', params: { center: [-Math.sqrt(75), 0], radius: 10 } } },
    });
    const arc = path.commands.find(command => command.kind === 'arc');

    expect(arc).toMatchObject({ kind: 'arc', radius: 10 });

    if (arc?.kind !== 'arc') throw new Error('Expected circular cap');

    expect(arc.center[0]).toBeCloseTo(0);
    expect(arc.center[1]).toBeCloseTo(Math.sqrt(75));
    expect(Math.abs(arc.endAngle - arc.startAngle)).toBeCloseTo(60);
  });

  it('选择长弦弧而不将其替换为短弧', () => {
    const path = compile({
      width: { kind: 'fixed', value: 10 },
      end: { direction: 0, cap: { name: 'arc', params: { center: [-Math.sqrt(75), 0], radius: 10, sweep: 'long' } } },
    });
    const arc = path.commands.find(command => command.kind === 'arc');
    if (arc?.kind !== 'arc') throw new Error('Expected circular cap');

    expect(Math.abs(arc.endAngle - arc.startAngle)).toBeCloseTo(300);
  });

  it('拒绝断开的自定义电容输出', () => {
    const cap = defineRibbonCap({
      name: 'disconnected',
      paramsSchema: strictObject({}),
      resolve: () => ({
        extension: 0,
        commands: [
          { kind: 'move', to: [999, 999] },
          { kind: 'line', to: [1000, 999] },
        ],
      }),
    });

    expect(() =>
      compile(
        { width: { kind: 'fixed', value: 10 }, start: { cap: { name: cap.name } } },
        createRibbonPathDefinition({ caps: [cap] }),
      ),
    ).toThrow(/side points/);
  });

  it('拒绝覆盖内置端帽', () => {
    const cap = defineRibbonCap({
      name: 'butt',
      paramsSchema: strictObject({}),
      resolve: () => ({ extension: 0, commands: [] }),
    });

    expect(() => createRibbonPathDefinition({ caps: [cap] })).toThrow(/defined more than once/);
  });

  it('保留编写的边界曲线并反转三次控制顺序', () => {
    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            kind: 'ribbon',
            kindOptions: {
              mode: 'boundary',
              upper: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'cubic', control1: [20, 20], control2: [80, 20], to: [100, 0] },
              ],
              lower: [
                { type: 'step', kind: 'move', to: [0, -10] },
                { type: 'step', kind: 'cubic', control1: [20, -30], control2: [80, -30], to: [100, -10] },
              ],
            },
          },
        ],
      },
      { paths: [ribbonPathDefinition] },
    ).scene;
    const path = scene.primitives.find(primitive => primitive.type === 'path');

    expect(path).toMatchObject({
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'cubic', control1: [20, 20], control2: [80, 20], to: [100, 0] },
        { kind: 'line', to: [100, -10] },
        { kind: 'cubic', control1: [80, -30], control2: [20, -30], to: [0, -10] },
        { kind: 'close' },
      ],
    });
  });
});
