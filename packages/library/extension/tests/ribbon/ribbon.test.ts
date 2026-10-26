import type { IRPathBase, IRScene, IRStep, PathPrimitive, ScenePrimitive } from '@retikz/core';
import { compileToScene as compileCoreToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { IRRibbonPathOptions } from '../../src/ribbon';
import {
  createRibbonPathDefinition,
  defineRibbonWidthProfile,
  RibbonPathDefinition,
  RibbonPathSchema,
} from '../../src/ribbon';

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const pathPrim = (primitive: ScenePrimitive): PathPrimitive => {
  expect(primitive.type).toBe('path');
  return primitive as PathPrimitive;
};

const commandPoint = (command: PathPrimitive['commands'][number]): [number, number] => {
  if (!('to' in command)) throw new Error(`Expected a point command, got ${command.kind}.`);
  return command.to;
};

const ribbonCenterAt = (prim: PathPrimitive, sampleCount: number, sampleIndex: number): [number, number] => {
  const left = commandPoint(prim.commands[sampleIndex]);
  const right = commandPoint(prim.commands[sampleCount * 2 - 1 - sampleIndex]);
  return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
};

const defaultRibbonChildren: Array<IRStep> = [
  { type: 'step', kind: 'move', to: [0, 0] },
  { type: 'step', kind: 'line', to: [10, 0] },
];

const normalizeRibbonInput = (input: Record<string, unknown> = {}): IRPathBase => {
  const { kind, width, start, end, align, sampling, upper, lower, children, ...pathProps } = input;
  const kindOptions = Object.fromEntries(
    Object.entries({ mode: kind, width, start, end, align, sampling, upper, lower }).filter(
      ([, value]) => value !== undefined,
    ),
  );

  return {
    type: 'path',
    kind: 'ribbon',
    ...pathProps,
    kindOptions,
    ...(kind === 'boundary' ? {} : { children: children ?? defaultRibbonChildren }),
  } as IRPathBase;
};

const RibbonSchema = RibbonPathSchema;

const ribbon = (overrides: Record<string, unknown> = {}): IRPathBase =>
  normalizeRibbonInput({
    ...(overrides.kind === 'boundary' ? {} : { width: { kind: 'fixed', value: 4 } }),
    ...(overrides.kind === 'boundary' ? {} : { sampling: { kind: 'fixed', samples: 2 } }),
    children: defaultRibbonChildren,
    ...overrides,
  });

const ribbonWithDefaultSampling = (overrides: Record<string, unknown> = {}): IRPathBase => {
  const next = ribbon(overrides);
  if (next.kindOptions !== undefined && typeof next.kindOptions === 'object') {
    const options = next.kindOptions;
    delete options.sampling;
  }

  return next;
};

const compileToScene = (input: IRScene, options: Parameters<typeof compileCoreToScene>[1] = {}) => {
  const supplied = options.paths ?? [];
  const ribbonDefinition = supplied.find(definition => definition.name === 'ribbon') ?? RibbonPathDefinition;

  return compileCoreToScene(input, {
    ...options,
    paths: [ribbonDefinition, ...supplied.filter(definition => definition.name !== 'ribbon')],
  });
};

describe('编译功能区', () => {
  it('schema 接受 JSON 往返固定宽度并拒绝负宽度', () => {
    expect(RibbonSchema.parse(JSON.parse(JSON.stringify(ribbon())))).toMatchObject(ribbon());
    expect(() => RibbonSchema.parse(ribbon({ width: { kind: 'fixed', value: -1 } }))).toThrow();
    expect(() => RibbonSchema.parse(ribbon({ width: { kind: 'taper', start: -1, end: 2 } }))).toThrow();
    expect(() => RibbonSchema.parse(ribbon({ start: { direction: [0, 0] } }))).toThrow();
    expect(
      (() => {
        const parsed = RibbonSchema.parse(ribbon({ start: { direction: { angle: 90, radius: 1 } } }));
        if (parsed.kindOptions.mode !== 'centerline') throw new Error('Expected centerline');

        const start = parsed.kindOptions.start;

        expect(start).toBeDefined();

        const direction = start.direction;

        expect(direction).toBeDefined();

        return direction;
      })(),
    ).toEqual({
      angle: 90,
      radius: 1,
    });
    expect(
      RibbonSchema.parse(
        ribbon({
          start: { cap: { name: 'arc', params: { center: [0, 0], radius: 2, sweep: 'long' } } },
          end: { cap: { name: 'arc', params: { center: [0, 0], radius: 2 } } },
        }),
      ),
    ).toMatchObject({
      kindOptions: {
        start: { cap: { name: 'arc', params: { center: [0, 0], radius: 2, sweep: 'long' } } },
        end: { cap: { name: 'arc', params: { center: [0, 0], radius: 2 } } },
      },
    });
    expect(() =>
      compileToScene(scene([ribbon({ start: { cap: { name: 'arc', params: { center: [0, 0], radius: 0 } } } })])),
    ).toThrow();
  });

  it('固定宽度功能区将直线中心线下沉到一条填充的闭合路径', () => {
    const compiled = compileToScene(scene([ribbon()]), { padding: 0 }).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.fill).toBe('currentColor');
    expect(prim.stroke).toBeUndefined();
    expect(prim.commands).toEqual([
      { kind: 'move', to: [0, 2] },
      { kind: 'line', to: [10, 2] },
      { kind: 'line', to: [10, -2] },
      { kind: 'line', to: [0, -2] },
      { kind: 'close' },
    ]);
  });

  it('默认采样通过立方段连接直线中心线', () => {
    const compiled = compileToScene(scene([ribbonWithDefaultSampling()]), { padding: 0 }).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands).toHaveLength(129);
    expect(prim.commands[1]).toMatchObject({ kind: 'cubic' });
    expect(prim.commands[0]).toEqual({ kind: 'move', to: [0, 2] });
  });

  it('默认采样将二次中心线连接到三次轮廓命令', () => {
    const compiled = compileToScene(
      scene([
        ribbonWithDefaultSampling({
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'curve', control: [5, -10], to: [10, 0] },
          ],
        }),
      ]),
      { padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands.filter(command => command.kind === 'cubic')).toHaveLength(126);
    expect(prim.commands.at(-1)).toEqual({ kind: 'close' });
  });

  it('省略采样使用默认的固定采样计数', () => {
    const parsed = RibbonSchema.parse(ribbon({ sampling: undefined }));
    const compiled = compileToScene(scene([parsed]), { padding: 0 }).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands).toHaveLength(129);
  });

  it('默认采样保留阶梯宽度停止点', () => {
    const compiled = compileToScene(
      scene([
        ribbonWithDefaultSampling({
          width: {
            kind: 'stops',
            stops: [
              { offset: 0, value: 4 },
              { offset: 0.5, value: 8 },
              { offset: 1, value: 8 },
            ],
            interpolation: 'step',
          },
        }),
      ]),
      { padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands).toContainEqual({ kind: 'line', to: [5, 4] });
    expect(prim.commands).toContainEqual({ kind: 'line', to: [5, -2] });
  });

  it('线性锥度独立改变开始和结束宽度', () => {
    const compiled = compileToScene(
      scene([ribbon({ width: { kind: 'taper', start: 4, end: 2 }, sampling: { kind: 'fixed', samples: 2 } })]),
      { padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands).toEqual([
      { kind: 'move', to: [0, 2] },
      { kind: 'line', to: [10, 1] },
      { kind: 'line', to: [10, -1] },
      { kind: 'line', to: [0, -2] },
      { kind: 'close' },
    ]);
  });

  it('停止宽度可以使中间比两端窄', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          width: {
            kind: 'stops',
            stops: [
              { offset: 0, value: 8 },
              { offset: 0.5, value: 2 },
              { offset: 1, value: 8 },
            ],
          },
          sampling: { kind: 'fixed', samples: 3 },
        }),
      ]),
      { padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands).toMatchObject([
      { kind: 'move', to: [0, 4] },
      { kind: 'cubic', to: [5, 1] },
      { kind: 'cubic', to: [10, 4] },
      { kind: 'line', to: [10, -4] },
      { kind: 'cubic', to: [5, -1] },
      { kind: 'cubic', to: [0, -4] },
      { kind: 'close' },
    ]);
  });

  it('停止宽度在插值之前按偏移量排序', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          width: {
            kind: 'stops',
            stops: [
              { offset: 1, value: 2 },
              { offset: 0, value: 4 },
            ],
          },
          sampling: { kind: 'fixed', samples: 2 },
        }),
      ]),
      { padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands[0]).toEqual({ kind: 'move', to: [0, 2] });
    expect(prim.commands[1]).toEqual({ kind: 'line', to: [10, 1] });
  });

  it('停止宽度向外延伸缺失的端点值', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          width: {
            kind: 'stops',
            stops: [
              { offset: 0.25, value: 4 },
              { offset: 0.75, value: 8 },
            ],
          },
          sampling: { kind: 'fixed', samples: 3 },
        }),
      ]),
      { padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands[0]).toEqual({ kind: 'move', to: [0, 2] });
    expect(prim.commands).toContainEqual(expect.objectContaining({ kind: 'cubic', to: [10, 4] }));
  });

  it('立方带下降到具有有限坐标的闭合采样路径', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          sampling: { kind: 'fixed', samples: 12 },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'cubic', control1: [30, 40], control2: [70, -40], to: [100, 0] },
          ],
        }),
      ]),
      { padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);
    const points = prim.commands.flatMap(command => ('to' in command ? [command.to] : []));

    expect(prim.commands.at(-1)).toEqual({ kind: 'close' });
    expect(points.length).toBeGreaterThan(12);
    expect(points.every(point => point.every(Number.isFinite))).toBe(true);
  });

  it('默认情况下，弯曲带状端点帽遵循中心线端点切线', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          sampling: { kind: 'fixed', samples: 3 },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'curve', control: [0, 10], to: [10, 0] },
          ],
        }),
      ]),
      { padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands[0]).toEqual({ kind: 'move', to: [-2, 0] });
    expect(prim.commands[2]).toMatchObject({ kind: 'cubic', to: [11.41, 1.41] });
  });

  it('端点方向覆盖接受角度和矢量形式', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          start: { direction: 90 },
          end: { direction: [0, 1] },
        }),
      ]),
      { padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands).toEqual([
      { kind: 'move', to: [0, 2] },
      { kind: 'line', to: [10, 2] },
      { kind: 'line', to: [10, -2] },
      { kind: 'line', to: [0, -2] },
      { kind: 'close' },
    ]);
  });

  it('端点方向覆盖接受 PolarPosition 糖', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          start: { direction: { angle: 90, radius: 1 } },
          end: { direction: { angle: 90, radius: 1 } },
        }),
      ]),
      { padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands).toEqual([
      { kind: 'move', to: [0, 2] },
      { kind: 'line', to: [10, 2] },
      { kind: 'line', to: [10, -2] },
      { kind: 'line', to: [0, -2] },
      { kind: 'close' },
    ]);
  });

  it('将中心线色带向左侧或右侧对齐', () => {
    const left = pathPrim(compileToScene(scene([ribbon({ align: 'left' })]), { padding: 0 }).scene.primitives[0]);
    const right = pathPrim(compileToScene(scene([ribbon({ align: 'right' })]), { padding: 0 }).scene.primitives[0]);

    expect(left.commands).toEqual([
      { kind: 'move', to: [0, 4] },
      { kind: 'line', to: [10, 4] },
      { kind: 'line', to: [10, 0] },
      { kind: 'line', to: [0, 0] },
      { kind: 'close' },
    ]);
    expect(right.commands).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 0] },
      { kind: 'line', to: [10, -4] },
      { kind: 'line', to: [0, -4] },
      { kind: 'close' },
    ]);
  });

  it('支持中心线色带上的方形帽', () => {
    const prim = pathPrim(
      compileToScene(scene([ribbon({ start: { cap: { name: 'square' } }, end: { cap: { name: 'square' } } })]), {
        padding: 0,
      }).scene.primitives[0],
    );

    expect(prim.commands).toEqual([
      { kind: 'move', to: [-2, 2] },
      { kind: 'line', to: [12, 2] },
      { kind: 'line', to: [12, -2] },
      { kind: 'line', to: [-2, -2] },
      { kind: 'close' },
    ]);
  });

  it('右对齐时，使用圆帽的色带侧中点', () => {
    const prim = pathPrim(
      compileToScene(
        scene([
          ribbon({
            align: 'right',
            start: { cap: { name: 'round' } },
            end: { cap: { name: 'round' } },
          }),
        ]),
        { padding: 0 },
      ).scene.primitives[0],
    );

    expect(prim.commands[2]).toMatchObject({ kind: 'arc', center: [10, -2], radius: 2, startAngle: 90, endAngle: -90 });
    expect(prim.commands.at(-2)).toMatchObject({ kind: 'arc', center: [0, -2], radius: 2 });
  });

  it('支持具有明确中心和半径的自定义圆弧帽', () => {
    const parsed = RibbonSchema.parse(
      ribbon({
        start: { cap: { name: 'arc', params: { center: [0, 0], radius: 2, sweep: 'long' } } },
        end: { cap: { name: 'arc', params: { center: [0, 0], radius: 2 } } },
      }),
    );
    const prim = pathPrim(compileToScene(scene([parsed]), { padding: 0 }).scene.primitives[0]);

    expect(prim.commands[2]).toMatchObject({ kind: 'arc', center: [10, 0], radius: 2, startAngle: 90, endAngle: -90 });
    expect(prim.commands.at(-2)).toMatchObject({ kind: 'arc', center: [0, 0], radius: 2 });
    expect(prim.commands.at(-1)).toEqual({ kind: 'close' });
  });

  it('当自定义圆弧帽半径未到达功能区两侧时抛出', () => {
    const parsed = RibbonSchema.parse(
      ribbon({ start: { cap: { name: 'arc', params: { center: [0, 0], radius: 3 } } } }),
    );

    expect(() => compileToScene(scene([parsed]), { padding: 0 }).scene).toThrow(/arc cap/);
  });

  it('使用固定采样配置作为样本简写替换', () => {
    const prim = pathPrim(
      compileToScene(scene([ribbon({ sampling: { kind: 'fixed', samples: 3 } })]), {
        padding: 0,
      }).scene.primitives[0],
    );

    expect(prim.commands).toHaveLength(7);
    expect(() => RibbonSchema.parse(ribbon({ samples: 2, sampling: { kind: 'fixed', samples: 3 } }))).toThrow(
      /samples/,
    );
  });

  it('通过同一路径标准化角度、矢量和极端点方向', () => {
    type RibbonDirection = NonNullable<Extract<IRRibbonPathOptions, { mode?: 'centerline' }>['start']>['direction'];
    const commandsFor = (startDirection: RibbonDirection, endDirection: RibbonDirection) =>
      pathPrim(
        compileToScene(
          scene([
            ribbon({
              start: { direction: startDirection },
              end: { direction: endDirection },
              sampling: { kind: 'fixed', samples: 5 },
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'curve', control: [20, -20], to: [60, 20] },
              ],
            }),
          ]),
          { padding: 0 },
        ).scene.primitives[0],
      ).commands;

    expect(commandsFor([0, 1], [0, 1])).toEqual(commandsFor(90, 90));
    expect(commandsFor({ angle: 90, radius: 1 }, { angle: 90, radius: 1 })).toEqual(commandsFor(90, 90));
  });

  it('端点方向保留采样的中心线', () => {
    const children: Array<IRStep> = [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'curve', control: [30, -40], to: [80, 20] },
    ];
    const withoutDirection = pathPrim(
      compileToScene(scene([ribbon({ children, sampling: { kind: 'fixed', samples: 5 } })]), { padding: 0 }).scene
        .primitives[0],
    );
    const withDirection = pathPrim(
      compileToScene(
        scene([
          ribbon({ children, sampling: { kind: 'fixed', samples: 5 }, start: { direction: 0 }, end: { direction: 0 } }),
        ]),
        {
          padding: 0,
        },
      ).scene.primitives[0],
    );

    expect(ribbonCenterAt(withoutDirection, 5, 1)[1]).toBeLessThan(0);
    expect(ribbonCenterAt(withDirection, 5, 1)).toEqual(ribbonCenterAt(withoutDirection, 5, 1));
  });

  it('当中心线需要时，将直线段保留在曲线段之前', () => {
    const prim = pathPrim(
      compileToScene(
        scene([
          ribbon({
            sampling: { kind: 'fixed', samples: 5 },
            start: { direction: 90 },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [20, 0] },
              { type: 'step', kind: 'curve', control: [45, 0], to: [70, 30] },
            ],
          }),
        ]),
        { padding: 0 },
      ).scene.primitives[0],
    );

    expect(prim.commands).toContainEqual(expect.objectContaining({ to: [20, 2] }));
    expect(prim.commands[0]).toEqual({ kind: 'move', to: [0, 2] });
  });

  it('保持端点覆盖边与采样轮廓对齐', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          start: { direction: [0, 1] },
          sampling: { kind: 'fixed', samples: 2 },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'curve', control: [10, -2], to: [20, 0] },
          ],
        }),
      ]),
      { padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands).toEqual([
      { kind: 'move', to: [0, 2] },
      { kind: 'line', to: [19.61, 1.96] },
      { kind: 'line', to: [20.39, -1.96] },
      { kind: 'line', to: [0, -2] },
      { kind: 'close' },
    ]);
  });

  it('在盖子处保持明确的端点方向，而不旋转附近的直线部分', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          start: { direction: 90 },
          sampling: { kind: 'fixed', samples: 8 },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        }),
      ]),
      { padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands[0]).toEqual({ kind: 'move', to: [0, 2] });
    expect(prim.commands[1]).toMatchObject({ kind: 'cubic', to: [14.29, 2] });
  });

  it('注册的宽度轮廓接收 JSON 参数和总长度', () => {
    const taper = defineRibbonWidthProfile<{ start: number; end: number }>({
      name: 'taper',
      widthAt: ({ offset, length, params }) => {
        expect(length).toBe(10);
        return params.start + (params.end - params.start) * offset;
      },
    });
    const compiled = compileToScene(
      scene([
        ribbon({
          width: { kind: 'profile', name: 'taper', params: { start: 4, end: 0 } },
          sampling: { kind: 'fixed', samples: 2 },
        }),
      ]),
      { paths: [createRibbonPathDefinition({ profiles: [taper] })], padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands[1]).toEqual({ kind: 'line', to: [10, 0] });
    expect(prim.commands[2]).toEqual({ kind: 'line', to: [10, 0] });
  });

  it('抛出未注册的宽度配置', () => {
    expect(() => compileToScene(scene([ribbon({ width: { kind: 'profile', name: 'missing' } })])).scene).toThrow(
      /missing/,
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    '当注册的宽度配置返回无效宽度（%s）时抛出',
    invalidWidth => {
      const bad = defineRibbonWidthProfile({
        name: 'bad',
        widthAt: () => invalidWidth,
      });

      expect(
        () =>
          compileToScene(scene([ribbon({ width: { kind: 'profile', name: 'bad' } })]), {
            paths: [createRibbonPathDefinition({ profiles: [bad] })],
          }).scene,
      ).toThrow(/profile "bad"/);
    },
  );

  it('从上下两条开放路径下沉显式边界 Ribbon', () => {
    const boundary = ribbon({
      kind: 'boundary',
      upper: [
        { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
        { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
      ],
      lower: [
        { type: 'step' as const, kind: 'move' as const, to: [0, 4] as [number, number] },
        { type: 'step' as const, kind: 'line' as const, to: [10, 4] as [number, number] },
      ],
      style: { fill: '#bfdbfe' },
    });

    expect(RibbonSchema.parse(boundary)).toEqual(boundary);
    expect(() =>
      RibbonSchema.parse({
        ...boundary,
        kindOptions: { ...(boundary.kindOptions as IRRibbonPathOptions), width: { kind: 'fixed', value: 4 } },
      }),
    ).toThrow(/width/);

    const prim = pathPrim(compileToScene(scene([boundary]), { padding: 0 }).scene.primitives[0]);

    expect(prim.commands).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 0] },
      { kind: 'line', to: [10, 4] },
      { kind: 'line', to: [0, 4] },
      { kind: 'close' },
    ]);
    expect(prim.fill).toBe('#bfdbfe');
  });

  it('拒绝闭合中心线', () => {
    expect(
      () =>
        compileToScene(
          scene([
            ribbon({
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
                { type: 'step', kind: 'cycle' },
              ],
            }),
          ]),
        ).scene,
    ).toThrow(/open/);
  });

  it('拒绝零长度中心线', () => {
    expect(
      () =>
        compileToScene(
          scene([
            ribbon({
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [0, 0] },
              ],
            }),
          ]),
        ).scene,
    ).toThrow(/zero length/);
  });

  it.each([
    [
      'multiple subpaths',
      [
        { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
        { type: 'step' as const, kind: 'line' as const, to: [5, 0] as [number, number] },
        { type: 'step' as const, kind: 'move' as const, to: [6, 0] as [number, number] },
        { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
      ],
    ],
    [
      'closed path',
      [
        { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
        { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
        { type: 'step' as const, kind: 'cycle' as const },
      ],
    ],
    [
      'zero-length path',
      [
        { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
        { type: 'step' as const, kind: 'line' as const, to: [0, 0] as [number, number] },
      ],
    ],
  ])('拒绝带有 %s 的边界', (_label, upper) => {
    expect(() =>
      compileToScene(
        scene([
          ribbon({
            kind: 'boundary',
            upper,
            lower: defaultRibbonChildren,
          }),
        ]),
      ),
    ).toThrow(/upper boundary|open|zero|subpath/i);
  });

  it('通过绘画资源解析圆锥渐变填充', () => {
    const conic = {
      kind: 'conicGradient' as const,
      stops: [
        { offset: 0, color: 'red' },
        { offset: 1, color: 'blue' },
      ],
    };
    const compiled = compileToScene(
      scene([
        ribbon({
          style: { fill: conic },
        }),
      ]),
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.fill).toEqual({ kind: 'resourceRef', id: 'paint-1' });
    expect(compiled.resources?.[0]).toMatchObject({
      id: 'paint-1',
      kind: 'paint',
      spec: conic,
    });
  });

  it('保留下沉路径上的轮廓和不透明度样式', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          style: {
            fill: '#60a5fa',
            stroke: '#172033',
            strokeWidth: 2,
            opacity: { fill: 0.4, stroke: 0.7, overall: 0.5 },
          },
        }),
      ]),
      { padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.fill).toBe('#60a5fa');
    expect(prim.fillOpacity).toBe(0.4);
    expect(prim.stroke).toBe('#172033');
    expect(prim.strokeWidth).toBe(2);
    expect(prim.strokeOpacity).toBe(0.7);
    expect(prim.opacity).toBe(0.5);
  });

  it('对下沉的路径基元进行排序时使用功能区 zIndex', () => {
    const compiled = compileToScene(scene([ribbon({ id: 'front', zIndex: 2 }), ribbon({ id: 'back', zIndex: 0 })]), {
      padding: 0,
    }).scene;

    expect(compiled.primitives.map(prim => prim.id)).toEqual(['back', 'front']);
  });
});
