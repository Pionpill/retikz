import type { IRPathBase, IRScene, IRStep, PathPrim, ScenePrimitive } from '@retikz/core';
import { compileToScene as compileCoreToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { IRRibbonPathOptions } from '../../src/ribbon';
import {
  createRibbonPathKindDefinition,
  defineRibbonWidthProfile,
  RibbonPathKindDefinition,
  RibbonPathSchema,
} from '../../src/ribbon';

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const pathPrim = (primitive: ScenePrimitive): PathPrim => {
  expect(primitive.type).toBe('path');
  return primitive as PathPrim;
};

const commandPoint = (command: PathPrim['commands'][number]): [number, number] => {
  if (!('to' in command)) throw new Error(`Expected a point command, got ${command.kind}.`);
  return command.to;
};

const ribbonCenterAt = (prim: PathPrim, sampleCount: number, sampleIndex: number): [number, number] => {
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
  const supplied = options.pathKinds ?? [];
  const ribbonDefinition = supplied.find(definition => definition.name === 'ribbon') ?? RibbonPathKindDefinition;

  return compileCoreToScene(input, {
    ...options,
    pathKinds: [ribbonDefinition, ...supplied.filter(definition => definition.name !== 'ribbon')],
  });
};

describe('compile ribbon', () => {
  it('schema accepts JSON round-trip fixed width and rejects negative widths', () => {
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

  it('fixed-width ribbon lowers a straight centerline to one filled closed path', () => {
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

  it('default sampling connects a straight centerline through cubic segments', () => {
    const compiled = compileToScene(scene([ribbonWithDefaultSampling()]), { padding: 0 }).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands).toHaveLength(129);
    expect(prim.commands[1]).toMatchObject({ kind: 'cubic' });
    expect(prim.commands[0]).toEqual({ kind: 'move', to: [0, 2] });
  });

  it('default sampling connects quadratic centerlines into cubic outline commands', () => {
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

  it('omitted sampling uses the default fixed sampling count', () => {
    const parsed = RibbonSchema.parse(ribbon({ sampling: undefined }));
    const compiled = compileToScene(scene([parsed]), { padding: 0 }).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands).toHaveLength(129);
  });

  it('default sampling preserves stepped width stops', () => {
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

  it('linear taper changes start and end widths independently', () => {
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

  it('stop widths can make the middle narrower than both ends', () => {
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

  it('stop widths are sorted by offset before interpolation', () => {
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

  it('stop widths extend missing endpoint values outward', () => {
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

  it('cubic ribbon lowers to a closed sampled path with finite coordinates', () => {
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

  it('curved ribbon endpoint caps follow the centerline endpoint tangents by default', () => {
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

  it('endpoint direction overrides accept angle and vector forms', () => {
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

  it('endpoint direction override accepts PolarPosition sugar', () => {
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

  it('aligns centerline ribbons to the left or right side', () => {
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

  it('supports square caps on centerline ribbons', () => {
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

  it('uses the ribbon side midpoint for round caps when aligned right', () => {
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

  it('supports custom arc caps with explicit center and radius', () => {
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

  it('throws when a custom arc cap radius does not reach both ribbon sides', () => {
    const parsed = RibbonSchema.parse(
      ribbon({ start: { cap: { name: 'arc', params: { center: [0, 0], radius: 3 } } } }),
    );

    expect(() => compileToScene(scene([parsed]), { padding: 0 }).scene).toThrow(/arc cap/);
  });

  it('uses fixed sampling config as the samples shorthand replacement', () => {
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

  it('normalizes angle, vector, and polar endpoint directions through the same path', () => {
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

  it('endpoint directions preserve the sampled centerline', () => {
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

  it('keeps a straight segment before a curved segment when the centerline asks for it', () => {
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

  it('keeps endpoint override sides aligned with the sampled outline', () => {
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

  it('keeps explicit endpoint direction at the cap without rotating nearby straight-line sections', () => {
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

  it('registered width profile receives JSON params and total length', () => {
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
      { pathKinds: [createRibbonPathKindDefinition({ profiles: [taper] })], padding: 0 },
    ).scene;
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands[1]).toEqual({ kind: 'line', to: [10, 0] });
    expect(prim.commands[2]).toEqual({ kind: 'line', to: [10, 0] });
  });

  it('throws for an unregistered width profile', () => {
    expect(() => compileToScene(scene([ribbon({ width: { kind: 'profile', name: 'missing' } })])).scene).toThrow(
      /missing/,
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'throws when a registered width profile returns an invalid width (%s)',
    invalidWidth => {
      const bad = defineRibbonWidthProfile({
        name: 'bad',
        widthAt: () => invalidWidth,
      });

      expect(
        () =>
          compileToScene(scene([ribbon({ width: { kind: 'profile', name: 'bad' } })]), {
            pathKinds: [createRibbonPathKindDefinition({ profiles: [bad] })],
          }).scene,
      ).toThrow(/profile "bad"/);
    },
  );

  it('lowers explicit boundary ribbons from upper and lower open paths', () => {
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

  it('rejects closed centerlines', () => {
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

  it('rejects zero-length centerlines', () => {
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
  ])('rejects a boundary with a %s', (_label, upper) => {
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

  it('resolves conic gradient fill through paint resources', () => {
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

  it('preserves outline and opacity style on the lowered path', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          style: {
            fill: '#60a5fa',
            fillOpacity: 0.4,
            stroke: '#172033',
            strokeWidth: 2,
            strokeOpacity: 0.7,
            opacity: 0.5,
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

  it('uses ribbon zIndex when sorting lowered path primitives', () => {
    const compiled = compileToScene(scene([ribbon({ id: 'front', zIndex: 2 }), ribbon({ id: 'back', zIndex: 0 })]), {
      padding: 0,
    }).scene;

    expect(compiled.primitives.map(prim => prim.id)).toEqual(['back', 'front']);
  });
});
