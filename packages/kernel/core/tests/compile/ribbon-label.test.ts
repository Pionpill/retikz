import { describe, expect, it } from 'vitest';
import {
  type GroupPrim,
  type IR,
  type IRPathBase,
  type IRPathRibbonOptions,
  type IRStep,
  type PathPrim,
  PathSchema,
  type ScenePrimitive,
  StepLabelSchema,
  type TextPrim,
  compileToScene,
} from '../../src';
import { ASCENT_FACTOR, DESCENT_FACTOR } from '../../src/compile/text-baseline';

const scene = (children: IR['children']): IR => ({
  version: 1,
  type: 'scene',
  children,
});

type RibbonInput = Partial<Omit<IRPathBase, 'kind' | 'ribbon' | 'type'>> &
  IRPathRibbonOptions & {
    kind?: IRPathRibbonOptions['mode'];
    type?: 'path' | 'ribbon';
    ribbon?: IRPathRibbonOptions;
  };

const defaultRibbonChildren: Array<IRStep> = [
  { type: 'step', kind: 'move', to: [0, 0] },
  { type: 'step', kind: 'line', to: [100, 0] },
];

const normalizeRibbonInput = (input: Record<string, unknown> = {}): IRPathBase => {
  const raw = input as RibbonInput;
  const {
    type: inputType,
    kind,
    ribbon: nestedRibbon,
    width,
    start,
    end,
    interpolation,
    align,
    samples,
    sampling,
    upper,
    lower,
    children,
    ...pathProps
  } = raw;
  void inputType;
  const options: IRPathRibbonOptions = { ...(nestedRibbon ?? {}) };
  const mode = kind === 'boundary' || kind === 'centerline' ? kind : options.mode;
  if (mode !== undefined) options.mode = mode;
  if (width !== undefined) options.width = width;
  if (start !== undefined) options.start = start;
  if (end !== undefined) options.end = end;
  if (interpolation !== undefined) options.interpolation = interpolation;
  if (align !== undefined) options.align = align;
  if (samples !== undefined) options.samples = samples;
  if (sampling !== undefined) options.sampling = sampling;
  if (upper !== undefined) options.upper = upper;
  if (lower !== undefined) options.lower = lower;

  const path: IRPathBase = {
    type: 'path',
    kind: 'ribbon',
    ...pathProps,
    ribbon: options,
  };
  if (options.mode !== 'boundary') path.children = children ?? defaultRibbonChildren;
  return path;
};

const RibbonSchema = {
  parse: (value: unknown): IRPathBase =>
    PathSchema.parse(typeof value === 'object' && value !== null ? normalizeRibbonInput(value as Record<string, unknown>) : value),
  safeParse: (value: unknown) =>
    PathSchema.safeParse(typeof value === 'object' && value !== null ? normalizeRibbonInput(value as Record<string, unknown>) : value),
};

const ribbon = (overrides: Record<string, unknown> = {}): IRPathBase =>
  normalizeRibbonInput({
    ...(overrides.kind === 'boundary' ? {} : { width: 10 }),
    samples: 2,
    children: defaultRibbonChildren,
    ...overrides,
  });

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
    (primitive): primitive is TextPrim =>
      primitive.type === 'text' && primitive.lines.some(line => line.text === text),
  );

const visualBottom = (t: TextPrim): number => t.y + t.fontSize * DESCENT_FACTOR;
const visualMiddle = (t: TextPrim): number =>
  t.y - (t.fontSize * ASCENT_FACTOR - t.fontSize * DESCENT_FACTOR) / 2;

const slopedGroupOf = (
  primitives: ReadonlyArray<ScenePrimitive>,
  text: string,
): GroupPrim | undefined =>
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
    });

    const paths = pathPrims(compiled.primitives);
    const label = textOf(compiled.primitives, 'mid');
    expect(paths).toHaveLength(1);
    expect(compiled.primitives[0].type).toBe('path');
    expect(label?.x).toBeCloseTo(50);
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
    );

    expect(textOf(compiled.primitives, 'start')?.x).toBeCloseTo(0);
    expect(textOf(compiled.primitives, 'near')?.x).toBeCloseTo(75);
    expect(textOf(compiled.primitives, 'end')?.x).toBeCloseTo(100);
  });

  it('side=above/below 与 path label 一样沿切线法线偏移', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          label: [
            { text: 'above', side: 'above' },
            { text: 'below', side: 'below' },
          ],
        }),
      ]),
      { padding: 0 },
    );

    expect(textOf(compiled.primitives, 'above')?.y).toBeLessThan(0);
    expect(textOf(compiled.primitives, 'below')?.y).toBeGreaterThan(0);
  });

  it('side=above 使用 Path label 默认距离加 ribbon 半宽，distance 可覆盖', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          label: [
            { text: 'default', side: 'above' },
            { text: 'far', side: 'above', distance: 10 },
          ],
        }),
      ]),
      { padding: 0 },
    );

    expect(visualBottom(textOf(compiled.primitives, 'default')!)).toBeCloseTo(-9, 2);
    expect(visualBottom(textOf(compiled.primitives, 'far')!)).toBeCloseTo(-15, 2);
  });

  it('placement=inside 且未显式 side 时居中落在 ribbon 内部', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          label: { text: 'inside', position: 'midway', placement: 'inside', sloped: true },
        }),
      ]),
      { padding: 0 },
    );

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
    );

    const group = slopedGroupOf(compiled.primitives, 'flow');
    expect(group?.transforms?.[0]).toMatchObject({ kind: 'rotate', degrees: 90 });
  });

  it('legacy side=sloped 仍保持无偏移 rotate 行为', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [0, 100] },
          ],
          label: { text: 'legacy', side: 'sloped' },
        }),
      ]),
      { padding: 0 },
    );

    const group = slopedGroupOf(compiled.primitives, 'legacy');
    expect(group?.transforms?.[0]).toMatchObject({ kind: 'rotate', degrees: 90 });
  });

  it('style 与 opacity 落到 label，opacity 与 host ribbon opacity 相乘', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          opacity: 0.5,
          label: {
            text: 'styled',
            textColor: 'crimson',
            opacity: 0.5,
            font: { size: 12, weight: 'bold' },
          },
        }),
      ]),
      { padding: 0 },
    );

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

    expect(() => compileToScene(scene([boundary]))).toThrow(/centerline ribbon labels/i);
  });
});
