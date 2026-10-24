import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import type {
  CompileWarning,
  IRScene,
  IRPosition,
  IRPathBase,
  PathCommand,
  PathPrimitive,
  ScenePrimitive,
} from '../../src';
import { BuiltinCompileWarningCode, compileToScene, definePath, PathSchema } from '../../src';

const steps = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [100, 0] as [number, number] },
];

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const flatten = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> => {
  const out: Array<ScenePrimitive> = [];

  for (const primitive of primitives) {
    out.push(primitive);
    if (primitive.type === 'group') out.push(...flatten(primitive.children));
  }

  return out;
};

const pathPrims = (ir: IRScene, options?: Parameters<typeof compileToScene>[1]): Array<PathPrimitive> =>
  flatten(compileToScene(ir, { padding: 0, ...options }).scene.primitives).filter(
    (primitive): primitive is PathPrimitive => primitive.type === 'path',
  );

const customPathSchema = <TKind extends string>(kind: TKind) => PathSchema.extend({ kind: literal(kind) });

describe('Path registry', () => {
  it('compiles omitted kind as the built-in stroke path', () => {
    const [prim] = pathPrims(
      scene([
        {
          type: 'path',
          children: steps,
          style: { stroke: 'crimson' },
        },
      ]),
    );

    expect(prim.stroke).toBe('crimson');
    expect(prim.fill).toBe('none');
  });

  it('throws for unknown path definitions until a provider is registered', () => {
    expect(
      () =>
        compileToScene(
          scene([{ type: 'path', kind: 'missing', kindOptions: {}, children: steps }] as IRScene['children']),
        ).scene,
    ).toThrow(/Unknown provider 'missing'/);
  });

  it('lets custom path definitions reuse the built-in stroke emitter', () => {
    const highlight = definePath({
      name: 'highlight',
      schema: PathSchema.extend({
        kind: literal('highlight'),
        kindOptions: strictObject({ stroke: NonBlankStringSchema }),
      }),
      compile: context => {
        const base = context.emitStroke(context.path);
        if (base === null) return null;

        return {
          ...base,
          primitives: Array.from(base.primitives).map(primitive =>
            primitive.type === 'path' ? { ...primitive, stroke: context.path.kindOptions.stroke } : primitive,
          ),
        };
      },
    });

    const [prim] = pathPrims(
      scene([
        {
          type: 'path',
          kind: 'highlight',
          kindOptions: { stroke: 'gold' },
          children: steps,
        },
      ] as IRScene['children']),
      { paths: [highlight] },
    );

    expect(prim.stroke).toBe('gold');
  });

  it('自定义 Path 无需 Stroke steps，仍接收分组 Source', () => {
    let observed: unknown;
    const empty = definePath({
      name: 'empty',
      schema: customPathSchema('empty'),
      compile: context => {
        observed = context.path;
        return null;
      },
    });
    const output = compileToScene(scene([{ type: 'path', kind: 'empty', style: { stroke: 'blue' } }]), {
      paths: [empty],
    });

    expect(output.scene.primitives).toEqual([]);
    expect(observed).toMatchObject({ type: 'path', kind: 'empty', style: { stroke: 'blue' } });
    expect(observed).not.toHaveProperty('stroke');
  });

  it('keeps Source shorthand visible to custom providers before emitStroke canonicalizes it', () => {
    let observedPosition: unknown;
    let observedStyle: unknown;
    let observedStroke: unknown;
    const sourceStroke = definePath({
      name: 'source-stroke',
      schema: customPathSchema('source-stroke'),
      compile: context => {
        const line = context.path.children?.[1];
        observedPosition = line && 'label' in line ? line.label?.position : undefined;
        observedStyle = context.path.style;
        observedStroke = context.appearance.stroke;

        return context.emitStroke();
      },
    });
    const compiled = compileToScene(
      scene([
        {
          type: 'path',
          kind: 'source-stroke',
          style: { color: '#336699', stroke: 0.8 },
          children: [steps[0], { ...steps[1], label: { text: 'end', position: 'at-end' } }],
        },
      ] as IRScene['children']),
      { paths: [sourceStroke], padding: 0 },
    ).scene;
    const label = flatten(compiled.primitives).find(primitive => primitive.type === 'text');

    expect(observedPosition).toBe('at-end');
    expect(observedStyle).toMatchObject({ color: '#336699', stroke: '#5c85ad' });
    expect(observedStroke).toBe('#5c85ad');
    expect(label).toMatchObject({ type: 'text', x: 100 });
  });

  it('does not resolve unused secondary providers for custom output', () => {
    const silent = definePath({
      name: 'silent',
      schema: customPathSchema('silent'),
      compile: () => null,
    });
    const direct = definePath({
      name: 'direct',
      schema: customPathSchema('direct'),
      compile: () => ({ primitives: [], boundsPoints: [] }),
    });
    const children = steps;
    const source = {
      type: 'path' as const,
      children,
      marks: [{ pos: 0.5, mark: { kind: 'arrow' as const, shape: 'missing-arrow' } }],
    };

    expect(() =>
      compileToScene(scene([{ ...source, kind: 'silent' }] as IRScene['children']), { paths: [silent] }),
    ).not.toThrow();
    expect(() =>
      compileToScene(scene([{ ...source, kind: 'direct' }] as IRScene['children']), { paths: [direct] }),
    ).not.toThrow();
  });

  it('rejects endpoint arrow overlap before a custom path provider can consume it', () => {
    const custom = definePath({
      name: 'custom-overlap',
      schema: customPathSchema('custom-overlap'),
      compile: () => ({ primitives: [], boundsPoints: [] }),
    });
    const input = scene([
      {
        type: 'path',
        kind: 'custom-overlap',
        marks: [{ pos: 1, endpointOverlap: 0.5, mark: { kind: 'arrow' } }],
        children: steps,
      },
    ]);

    expect(() => compileToScene(input, { paths: [custom] })).toThrow(
      /children\[0\]\.path\.marks\[0\]\.endpointOverlap.*built-in Stroke path/,
    );
  });

  it('keeps custom short emitStroke ahead of secondary provider lookup', () => {
    const shortStroke = definePath({
      name: 'short-stroke',
      schema: customPathSchema('short-stroke'),
      compile: context =>
        context.emitStroke({
          ...context.path,
          kind: 'stroke',
          children: context.path.children?.slice(0, 1),
        }),
    });
    const warnings: Array<CompileWarning> = [];
    const source = {
      type: 'path' as const,
      kind: 'short-stroke' as const,
      children: [
        { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
        { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
      ],
      marks: [{ pos: 0.5, mark: { kind: 'arrow' as const, shape: 'missing-arrow' } }],
    };

    expect(() =>
      compileToScene(scene([source] as IRScene['children']), {
        paths: [shortStroke],
        onWarn: warning => warnings.push(warning),
      }),
    ).not.toThrow();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ code: BuiltinCompileWarningCode.PathTooShort });
  });

  it('keeps the no-Inspector emitStroke result free of inspection-only subject data', () => {
    const observed: Array<ReadonlyArray<string>> = [];
    const plain = definePath({
      name: 'plain-stroke',
      schema: customPathSchema('plain-stroke'),
      compile: context => {
        const result = context.emitStroke();
        if (result !== null) observed.push(Object.keys(result));
        return result;
      },
    });

    pathPrims(scene([{ type: 'path', kind: 'plain-stroke', children: steps }] as IRScene['children']), {
      paths: [plain],
    });

    expect(observed).toEqual([['primitives', 'boundsPoints']]);
  });

  it('keeps custom path primitives in the transformed owner group', () => {
    const badge = definePath({
      name: 'badge',
      schema: customPathSchema('badge'),
      compile: () => ({
        primitives: [{ type: 'rect', x: 0, y: 0, width: 10, height: 6, fill: 'gold' }],
        boundsPoints: [
          [0, 0],
          [10, 6],
        ],
      }),
    });
    const compiled = compileToScene(
      scene([
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 100, y: 20 }],
          children: [
            {
              type: 'path',
              kind: 'badge',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ],
        },
      ] as IRScene['children']),
      { paths: [badge] },
    ).scene;

    expect(compiled.primitives).toHaveLength(1);

    const [group] = compiled.primitives;

    expect(group.type).toBe('group');

    if (group.type !== 'group') throw new Error('expected transformed owner group');

    expect(group.transforms).toEqual([{ kind: 'translate', x: 100, y: 20 }]);
    expect(group.children).toEqual([{ type: 'rect', x: 0, y: 0, width: 10, height: 6, fill: 'gold' }]);
  });

  it('custom_path_kind_options_error_contains_provider_and_ir_path', () => {
    const highlight = definePath({
      name: 'highlight',
      schema: PathSchema.extend({
        kind: literal('highlight'),
        kindOptions: strictObject({ stroke: NonBlankStringSchema }),
      }),
      compile: context => context.emitStroke(context.path),
    });
    const ir = scene([
      {
        type: 'path',
        kind: 'highlight',
        kindOptions: { stroke: 42 },
        children: steps,
      },
    ] as IRScene['children']);

    expect(() => compileToScene(ir, { paths: [highlight] }).scene).toThrow(/path 'highlight'/);
    expect(() => compileToScene(ir, { paths: [highlight] }).scene).toThrow(/children\[0\]\.path\.kindOptions\.stroke/);
  });
});

describe('Path output wrapping', () => {
  const once = <T>(items: ReadonlyArray<T>): Iterable<T> => {
    let consumed = false;
    return {
      [Symbol.iterator]: () => {
        if (consumed) throw new Error('iterator consumed twice');
        consumed = true;
        return items[Symbol.iterator]();
      },
    };
  };

  it.each([false, true])('一次性输出保持图元顺序和布局结果（宿主包装：%s）', wrapped => {
    const compile = (iterable: boolean) =>
      compileToScene(scene([{ type: 'path', kind: 'iterable', rotate: 90 }]), {
        padding: 0,
        paths: [
          definePath({
            name: 'iterable',
            schema: customPathSchema('iterable'),
            compile: context => {
              const primitives: Array<ScenePrimitive> = [
                { type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: 'red' },
                { type: 'rect', x: 10, y: 0, width: 10, height: 10, fill: 'blue' },
              ];
              const boundsPoints: Array<IRPosition> = [
                [0, 0],
                [20, 10],
              ];
              const output = {
                primitives: iterable ? once(primitives) : primitives,
                boundsPoints: iterable ? once(boundsPoints) : boundsPoints,
              };
              return wrapped ? context.wrapOutput(output) : output;
            },
          }),
        ],
      }).scene;
    const expected = compile(false);
    const actual = compile(true);
    expect(actual).toEqual(expected);
    expect(
      flatten(actual.primitives)
        .filter(primitive => primitive.type === 'rect')
        .map(primitive => primitive.fill),
    ).toEqual(['red', 'blue']);
  });

  it.each([false, true])('空迭代器产生空输出（宿主包装：%s）', wrapped => {
    const definition = definePath({
      name: 'empty-iterable',
      schema: customPathSchema('empty-iterable'),
      compile: context => {
        const output = { primitives: once<ScenePrimitive>([]), boundsPoints: once<IRPosition>([]) };
        return wrapped ? context.wrapOutput(output) : output;
      },
    });
    expect(
      compileToScene(scene([{ type: 'path', kind: definition.name }]), { paths: [definition] }).scene.primitives,
    ).toEqual([]);
  });

  it.each([
    [false, 'primitives'],
    [true, 'primitives'],
    [false, 'boundsPoints'],
    [true, 'boundsPoints'],
  ] as const)('迭代异常保留原始 cause（宿主包装：%s，字段：%s）', (wrapped, field) => {
    const cause = new Error('iterator failed');
    const failing = {
      [Symbol.iterator]: (): Iterator<never> => ({
        next: () => {
          throw cause;
        },
      }),
    };
    const definition = definePath({
      name: 'failing-iterable',
      schema: customPathSchema('failing-iterable'),
      compile: context => {
        const output = {
          primitives: field === 'primitives' ? failing : [],
          boundsPoints: field === 'boundsPoints' ? failing : [],
        };
        return wrapped ? context.wrapOutput(output) : output;
      },
    });
    expect(() => compileToScene(scene([{ type: 'path', kind: definition.name }]), { paths: [definition] })).toThrow(
      expect.objectContaining({ cause }),
    );
  });

  it.each([
    { children: steps },
    {
      children: [
        ...steps,
        { type: 'step', kind: 'line', to: [100, 100] },
        { type: 'step', kind: 'line', to: { relativeAccumulate: [50, 0] } },
      ],
      cornerRadius: 10,
    },
    {
      children: [steps[0], { type: 'step', kind: 'rectangle', from: [10, 20], to: [80, 60] }],
    },
  ] satisfies Array<Pick<IRPathBase, 'children' | 'cornerRadius'>>)(
    'materializes the same geometry as an undecorated stroke: %j',
    input => {
      let commands: ReadonlyArray<PathCommand> = [];
      const custom = definePath({
        name: 'geometry-probe',
        schema: customPathSchema('geometry-probe'),
        compile: context => {
          commands = context.materializePath();
          return null;
        },
      });
      compileToScene(scene([{ ...input, type: 'path', kind: custom.name }]), { paths: [custom] });
      const output = compileToScene(scene([{ ...input, type: 'path' }])).scene;
      const primitive = flatten(output.primitives).find(item => item.type === 'path');
      expect(primitive).toBeDefined();
      expect(commands).toEqual(primitive?.commands);
    },
  );

  it('materializes geometry without measuring labels or resolving marks', () => {
    let measurements = 0;
    let commands: ReadonlyArray<PathCommand> = [];
    const custom = definePath({
      name: 'geometry-only',
      schema: customPathSchema('geometry-only'),
      compile: context => {
        commands = context.materializePath();
        return null;
      },
    });
    compileToScene(
      scene([
        {
          type: 'path',
          kind: custom.name,
          children: [steps[0], { type: 'step', kind: 'line', to: [100, 0], label: { text: 'step label' } }],
          label: { text: 'host label' },
          marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'unused-arrow' } }],
          rotate: 90,
        },
      ]),
      {
        paths: [custom],
        measureText: () => {
          measurements++;
          return { width: 40, height: 20 };
        },
      },
    );
    expect(commands).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [100, 0] },
    ]);
    expect(measurements).toBe(0);
  });

  it('wraps custom geometry and shared labels in one host transform', () => {
    const custom = definePath({
      name: 'boundary-label-host',
      schema: customPathSchema('boundary-label-host'),
      compile: context => {
        const commands = context.materializePath();
        const labels = context.emitBoundaryLabels([
          { label: { text: 'target' }, point: [100, 0], outward: [1, 0], sourcePath: 'kindOptions.label' },
        ]);

        return context.wrapOutput({
          primitives: once<ScenePrimitive>([{ type: 'path', commands: [...commands] }, ...labels]),
          boundsPoints: once<IRPosition>([
            [0, 0],
            [100, 0],
          ]),
        });
      },
    });
    const output = compileToScene(
      scene([
        {
          type: 'path',
          kind: 'boundary-label-host',
          children: steps,
          rotate: 90,
          id: 'host',
          meta: { source: 'custom' },
        },
      ]),
      { paths: [custom], padding: 0, measureText: () => ({ width: 40, height: 20 }) },
    ).scene;

    expect(output.layout.x).toBeCloseTo(62);
    expect(output.layout.y).toBeCloseTo(-72);
    expect(output.layout.width).toBeCloseTo(20);
    expect(output.layout.height).toBeCloseTo(144);
    expect(output.primitives[0]).toMatchObject({ type: 'group', id: 'host', meta: { source: 'custom' } });
  });

  it('does not wrap a delegated stroke result twice', () => {
    const custom = definePath({
      name: 'delegated',
      schema: customPathSchema('delegated'),
      compile: context => context.emitStroke(),
    });
    const input = { type: 'path' as const, children: steps, rotate: 90, scale: { x: 2, y: 3 } };
    const builtin = compileToScene(scene([input]), { padding: 0 }).scene;
    const delegated = compileToScene(scene([{ ...input, kind: 'delegated' }]), {
      padding: 0,
      paths: [custom],
    }).scene;

    expect(delegated).toEqual(builtin);
  });
});
