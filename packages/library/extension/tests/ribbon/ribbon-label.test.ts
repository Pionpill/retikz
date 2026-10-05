import type { GroupPrim, IRPathBase, IRScene, IRStep, PathPrim, ScenePrimitive, TextPrim } from '@retikz/core';
import { compileToScene as compileCoreToScene, StepLabelSchema } from '@retikz/core';
import { curve } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import { RibbonPathKindDefinition, RibbonPathSchema } from '../../src/ribbon';

const ASCENT_FACTOR = 0.8;

const DESCENT_FACTOR = 0.2;

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const defaultRibbonChildren: Array<IRStep> = [
  { type: 'step', kind: 'move', to: [0, 0] },
  { type: 'step', kind: 'line', to: [100, 0] },
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
    ...(overrides.kind === 'boundary' ? {} : { width: { kind: 'fixed', value: 10 } }),
    ...(overrides.kind === 'boundary' ? {} : { sampling: { kind: 'fixed', samples: 2 } }),
    children: defaultRibbonChildren,
    ...overrides,
  });

const compileToScene = (input: IRScene, options: Parameters<typeof compileCoreToScene>[1] = {}) => {
  const supplied = options.pathKinds ?? [];
  const ribbonDefinition = supplied.find(definition => definition.name === 'ribbon') ?? RibbonPathKindDefinition;

  return compileCoreToScene(input, {
    ...options,
    pathKinds: [ribbonDefinition, ...supplied.filter(definition => definition.name !== 'ribbon')],
  });
};

const flatten = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> => {
  const out: Array<ScenePrimitive> = [];

  for (const primitive of primitives) {
    out.push(primitive);
    if (primitive.type === 'group') out.push(...flatten(primitive.children));
  }

  return out;
};

const textOf = (primitives: ReadonlyArray<ScenePrimitive>, text: string): TextPrim | undefined =>
  flatten(primitives).find(
    (primitive): primitive is TextPrim => primitive.type === 'text' && primitive.lines.some(line => line.text === text),
  );

const visualBottom = (t: TextPrim): number => t.y + t.fontSize * DESCENT_FACTOR;

const visualMiddle = (t: TextPrim): number => t.y - (t.fontSize * ASCENT_FACTOR - t.fontSize * DESCENT_FACTOR) / 2;

const slopedGroupOf = (primitives: ReadonlyArray<ScenePrimitive>, text: string): GroupPrim | undefined =>
  flatten(primitives).find(
    (primitive): primitive is GroupPrim =>
      primitive.type === 'group' &&
      primitive.transforms?.some(transform => transform.kind === 'rotate') === true &&
      textOf(primitive.children, text) !== undefined,
  );

const pathPrims = (primitives: ReadonlyArray<ScenePrimitive>): Array<PathPrim> =>
  flatten(primitives).filter((primitive): primitive is PathPrim => primitive.type === 'path');

describe('Ribbon label schema', () => {
  it('接受与 StepLabel 相同的 label vocabulary，并保持 JSON round-trip', () => {
    const label = {
      text: '128',
      position: 'near-end',
      sloped: true,
      placement: 'inside',
      distance: 6,
      textColor: '#0f172a',
      opacity: 0.5,
      font: { size: 10, weight: 'bold' },
    };

    expect(StepLabelSchema.parse(label)).toEqual(label);
    expect(RibbonSchema.parse(JSON.parse(JSON.stringify(ribbon({ label }))))).toMatchObject({
      label,
    });
  });

  it('拒绝 ribbon-only side 与 rotate/keepUpright/offset 私有字段', () => {
    expect(RibbonSchema.safeParse(ribbon({ label: { text: 'x', side: 'upper' } })).success).toBe(false);
    expect(RibbonSchema.safeParse(ribbon({ label: { text: 'x', rotate: 'sloped' } })).success).toBe(false);
    expect(RibbonSchema.safeParse(ribbon({ label: { text: 'x', keepUpright: true } })).success).toBe(false);
    expect(RibbonSchema.safeParse(ribbon({ label: { text: 'x', offset: 4 } })).success).toBe(false);
  });
});

describe('Ribbon label compile', () => {
  it('在 centerline midpoint 发出 label，并保留 ribbon path 作为第一个 primitive', () => {
    const compiled = compileToScene(scene([ribbon({ label: { text: 'mid', position: 'midway' } })]), {
      padding: 0,
    }).scene;

    const paths = pathPrims(compiled.primitives);
    const label = textOf(compiled.primitives, 'mid');

    expect(paths).toHaveLength(1);
    expect(compiled.primitives[0].type).toBe('path');
    expect(label?.x).toBeCloseTo(50);
  });

  it('把 scope 内的长 host label 纳入 layout bounds', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'scope',
          children: [ribbon({ label: { text: 'long host label', side: 'left' } })],
        },
      ]),
      {
        measureText: () => ({ width: 200, height: 20 }),
        padding: 0,
      },
    ).scene;

    expect(compiled.layout.x).toBeLessThan(-100);
  });

  it('position keyword 与数字端点沿 centerline 采样', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          label: [
            { text: 'start', position: 0 },
            { text: 'near', position: 'near-end' },
            { text: 'end', position: 1 },
          ],
        }),
      ]),
      { padding: 0 },
    ).scene;

    expect(textOf(compiled.primitives, 'start')?.x).toBeCloseTo(0);
    expect(textOf(compiled.primitives, 'near')?.x).toBeCloseTo(75);
    expect(textOf(compiled.primitives, 'end')?.x).toBeCloseTo(100);
  });

  it('side=top/bottom 与 path label 一样沿切线法线偏移', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          label: [
            { text: 'top', side: 'top' },
            { text: 'bottom', side: 'bottom' },
          ],
        }),
      ]),
      { padding: 0 },
    ).scene;

    expect(textOf(compiled.primitives, 'top')?.y).toBeLessThan(0);
    expect(textOf(compiled.primitives, 'bottom')?.y).toBeGreaterThan(0);
  });

  it('side=top 使用 Path label 默认距离加 ribbon 半宽，distance 可覆盖', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          label: [
            { text: 'default', side: 'top' },
            { text: 'far', side: 'top', distance: 10 },
          ],
        }),
      ]),
      { padding: 0 },
    ).scene;

    expect(visualBottom(textOf(compiled.primitives, 'default')!)).toBeCloseTo(-9, 2);
    expect(visualBottom(textOf(compiled.primitives, 'far')!)).toBeCloseTo(-15, 2);
  });

  it.each([
    { align: 'left', top: -14 },
    { align: 'right', top: -4 },
  ])('外侧标签跟随 $align 对齐的实际边界', ({ align, top }) => {
    const compiled = compileToScene(scene([ribbon({ align, label: { text: 'outside', side: 'top' } })]), {
      padding: 0,
    }).scene;
    const label = textOf(compiled.primitives, 'outside');
    if (label === undefined) throw new Error('Expected outside label');

    expect(visualBottom(label)).toBeCloseTo(top, 2);
  });

  it('placement=inside 且未显式 side 时居中落在 ribbon 内部', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          label: { text: 'inside', position: 'midway', placement: 'inside', sloped: true },
        }),
      ]),
      { padding: 0 },
    ).scene;

    expect(visualMiddle(textOf(compiled.primitives, 'inside')!)).toBeCloseTo(0, 2);
  });

  it('sloped=true 复用 path label 的 rotate group 行为', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [0, 100] },
          ],
          label: { text: 'flow', sloped: true },
        }),
      ]),
      { padding: 0 },
    ).scene;

    const group = slopedGroupOf(compiled.primitives, 'flow');

    expect(group?.transforms?.[0]).toMatchObject({ kind: 'rotate', degrees: 90 });
  });

  it('近起点的 sloped 标签沿中心线局部切线旋转', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          sampling: { kind: 'fixed', samples: 32 },
          children: [
            { type: 'step', kind: 'move', to: [-210, -48] },
            {
              type: 'step',
              kind: 'cubic',
              control1: [-80, -100],
              control2: [80, 38],
              to: [210, 16],
            },
          ],
          label: { text: '128', position: 0.05, side: 'bottom', sloped: true },
        }),
      ]),
      { padding: 0 },
    ).scene;

    const group = slopedGroupOf(compiled.primitives, '128');

    expect(group?.transforms?.[0]).toMatchObject({ kind: 'rotate' });

    const geometry = {
      kind: 'cubicBezier' as const,
      from: [-210, -48] as [number, number],
      control1: [-80, -100] as [number, number],
      control2: [80, 38] as [number, number],
      to: [210, 16] as [number, number],
    };
    const tangent = curve.sampleAt(
      geometry,
      curve.parameterAtDistance(geometry, curve.approximateLength(geometry) * 0.05),
    ).tangent;
    const expected = Math.round(((Math.atan2(tangent[1], tangent[0]) * 180) / Math.PI) * 100) / 100;

    expect(group?.transforms?.[0]).toHaveProperty('degrees', expected);
  });

  it('sloped=true 仍保持无偏移 rotate 行为', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [0, 100] },
          ],
          label: { text: 'legacy', sloped: true },
        }),
      ]),
      { padding: 0 },
    ).scene;

    const group = slopedGroupOf(compiled.primitives, 'legacy');

    expect(group?.transforms?.[0]).toMatchObject({ kind: 'rotate', degrees: 90 });
  });

  it('style 与 opacity 落到 label，opacity 与 host ribbon opacity 相乘', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          label: {
            text: 'styled',
            textColor: 'crimson',
            opacity: 0.5,
            font: { size: 12, weight: 'bold' },
          },
          style: { opacity: 0.5 },
        }),
      ]),
      { padding: 0 },
    ).scene;

    const label = textOf(compiled.primitives, 'styled');

    expect(label?.fill).toBe('crimson');
    expect(label?.fontSize).toBe(12);
    expect(label?.fontWeight).toBe('bold');
    expect(label?.opacity).toBe(0.25);
  });

  it('boundary ribbon 首版带 label 时给出明确诊断', () => {
    const boundary = ribbon({
      kind: 'boundary',
      label: { text: 'nope' },
      upper: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
      lower: [
        { type: 'step', kind: 'move', to: [0, 10] },
        { type: 'step', kind: 'line', to: [100, 10] },
      ],
    });

    expect(() => compileToScene(scene([boundary])).scene).toThrow(/centerline ribbon labels/i);
  });
});
