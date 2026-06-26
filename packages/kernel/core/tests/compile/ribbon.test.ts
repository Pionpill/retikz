import { describe, expect, it } from 'vitest';
import {
  type IR,
  type PathPrim,
  RibbonSchema,
  type ScenePrimitive,
  compileToScene,
  defineRibbonWidthProfile,
} from '../../src';

const scene = (children: IR['children']): IR => ({
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

const ribbonCenterAt = (
  prim: PathPrim,
  sampleCount: number,
  sampleIndex: number,
): [number, number] => {
  const left = commandPoint(prim.commands[sampleIndex]);
  const right = commandPoint(prim.commands[sampleCount * 2 - 1 - sampleIndex]);
  return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
};

const ribbon = (
  overrides: Partial<Extract<IR['children'][number], { type: 'ribbon' }>> = {},
): Extract<IR['children'][number], { type: 'ribbon' }> => ({
  type: 'ribbon',
  width: 4,
  samples: 2,
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to: [10, 0] },
  ],
  ...overrides,
});

describe('compile ribbon', () => {
  it('schema accepts JSON round-trip numeric width and rejects negative widths', () => {
    expect(RibbonSchema.parse(JSON.parse(JSON.stringify(ribbon())))).toEqual(ribbon());
    expect(() => RibbonSchema.parse(ribbon({ width: -1 }))).toThrow();
    expect(() => RibbonSchema.parse(ribbon({ width: { start: -1, end: 2 } }))).toThrow();
    expect(() => RibbonSchema.parse(ribbon({ startDirection: [0, 0] }))).toThrow();
    expect(RibbonSchema.parse(ribbon({ startDirection: { angle: 90, radius: 1 } })).startDirection).toEqual({
      angle: 90,
      radius: 1,
    });
  });

  it('fixed-width ribbon lowers a straight centerline to one filled closed path', () => {
    const compiled = compileToScene(scene([ribbon()]), { padding: 0 });
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

  it('linear taper changes start and end widths independently', () => {
    const compiled = compileToScene(
      scene([ribbon({ width: { start: 4, end: 2 }, samples: 2 })]),
      { padding: 0 },
    );
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands).toEqual([
      { kind: 'move', to: [0, 2] },
      { kind: 'line', to: [10, 1] },
      { kind: 'line', to: [10, -1] },
      { kind: 'line', to: [0, -2] },
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
          samples: 2,
        }),
      ]),
      { padding: 0 },
    );
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
          samples: 3,
        }),
      ]),
      { padding: 0 },
    );
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands[0]).toEqual({ kind: 'move', to: [0, 2] });
    expect(prim.commands[2]).toEqual({ kind: 'line', to: [10, 4] });
  });

  it('cubic ribbon lowers to a closed sampled path with finite coordinates', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          samples: 12,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'cubic', control1: [30, 40], control2: [70, -40], to: [100, 0] },
          ],
        }),
      ]),
      { padding: 0 },
    );
    const prim = pathPrim(compiled.primitives[0]);
    const points = prim.commands.flatMap(command => ('to' in command ? [command.to] : []));

    expect(prim.commands.at(-1)).toEqual({ kind: 'close' });
    expect(points.length).toBeGreaterThan(12);
    expect(points.every(point => point.every(Number.isFinite))).toBe(true);
  });

  it('curved ribbon endpoint caps default to the start-to-end connection direction', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          samples: 3,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'curve', control: [0, 10], to: [10, 0] },
          ],
        }),
      ]),
      { padding: 0 },
    );
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands[0]).toEqual({ kind: 'move', to: [0, 2] });
    expect(prim.commands[2]).toEqual({ kind: 'line', to: [10, 2] });
  });

  it('endpoint direction overrides accept angle and vector forms', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          startDirection: 90,
          endDirection: [0, 1],
        }),
      ]),
      { padding: 0 },
    );
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands).toEqual([
      { kind: 'move', to: [-2, 0] },
      { kind: 'line', to: [8, 0] },
      { kind: 'line', to: [12, 0] },
      { kind: 'line', to: [2, 0] },
      { kind: 'close' },
    ]);
  });

  it('endpoint direction override accepts PolarPosition sugar', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          startDirection: { angle: 90, radius: 1 },
          endDirection: { angle: 90, radius: 1 },
        }),
      ]),
      { padding: 0 },
    );
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands).toEqual([
      { kind: 'move', to: [-2, 0] },
      { kind: 'line', to: [8, 0] },
      { kind: 'line', to: [12, 0] },
      { kind: 'line', to: [2, 0] },
      { kind: 'close' },
    ]);
  });

  it('normalizes angle, vector, and polar endpoint directions through the same path', () => {
    type RibbonDirection = Extract<IR['children'][number], { type: 'ribbon' }>['startDirection'];
    const commandsFor = (startDirection: RibbonDirection, endDirection: RibbonDirection) =>
      pathPrim(
        compileToScene(
          scene([
            ribbon({
              startDirection,
              endDirection,
              samples: 5,
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'curve', control: [20, -20], to: [60, 20] },
              ],
            }),
          ]),
          { padding: 0 },
        ).primitives[0],
      ).commands;

    expect(commandsFor([0, 1], [0, 1])).toEqual(commandsFor(90, 90));
    expect(commandsFor({ angle: 90, radius: 1 }, { angle: 90, radius: 1 })).toEqual(
      commandsFor(90, 90),
    );
  });

  it('uses endpoint directions to reshape curved centerline tangents', () => {
    const children: Extract<IR['children'][number], { type: 'ribbon' }>['children'] = [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'curve', control: [30, -40], to: [80, 20] },
    ];
    const withoutDirection = pathPrim(
      compileToScene(scene([ribbon({ children, samples: 5 })]), { padding: 0 }).primitives[0],
    );
    const withDirection = pathPrim(
      compileToScene(
        scene([ribbon({ children, samples: 5, startDirection: 0, endDirection: 0 })]),
        { padding: 0 },
      ).primitives[0],
    );

    expect(ribbonCenterAt(withoutDirection, 5, 1)[1]).toBeLessThan(0);
    expect(ribbonCenterAt(withDirection, 5, 1)[1]).toBeGreaterThanOrEqual(0);
  });

  it('keeps endpoint override sides aligned with the sampled outline', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          startDirection: [0, 1],
          samples: 2,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'curve', control: [10, -2], to: [20, 0] },
          ],
        }),
      ]),
      { padding: 0 },
    );
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands).toEqual([
      { kind: 'move', to: [-2, 0] },
      { kind: 'line', to: [20, 2] },
      { kind: 'line', to: [20, -2] },
      { kind: 'line', to: [2, 0] },
      { kind: 'close' },
    ]);
  });

  it('blends endpoint direction overrides into nearby samples', () => {
    const compiled = compileToScene(
      scene([
        ribbon({
          startDirection: 90,
          samples: 8,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        }),
      ]),
      { padding: 0 },
    );
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands[1]).toEqual({ kind: 'line', to: [14.04, 1.98] });
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
          samples: 2,
        }),
      ]),
      { ribbonWidthProfiles: { taper }, padding: 0 },
    );
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.commands[1]).toEqual({ kind: 'line', to: [10, 0] });
    expect(prim.commands[2]).toEqual({ kind: 'line', to: [10, 0] });
  });

  it('throws for an unregistered width profile', () => {
    expect(() =>
      compileToScene(scene([ribbon({ width: { kind: 'profile', name: 'missing' } })])),
    ).toThrow(/missing/);
  });

  it('throws when a registered width profile returns a non-finite width', () => {
    const bad = defineRibbonWidthProfile({
      name: 'bad',
      widthAt: () => Number.NaN,
    });

    expect(() =>
      compileToScene(scene([ribbon({ width: { kind: 'profile', name: 'bad' } })]), {
        ribbonWidthProfiles: { bad },
      }),
    ).toThrow(/profile "bad"/);
  });

  it('rejects closed centerlines', () => {
    expect(() =>
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
      ),
    ).toThrow(/open/);
  });

  it('rejects zero-length centerlines', () => {
    expect(() =>
      compileToScene(
        scene([
          ribbon({
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [0, 0] },
            ],
          }),
        ]),
      ),
    ).toThrow(/zero length/);
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
          fill: conic,
        }),
      ]),
    );
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
          fill: '#60a5fa',
          fillOpacity: 0.4,
          stroke: '#172033',
          strokeWidth: 2,
          drawOpacity: 0.7,
          opacity: 0.5,
        }),
      ]),
      { padding: 0 },
    );
    const prim = pathPrim(compiled.primitives[0]);

    expect(prim.fill).toBe('#60a5fa');
    expect(prim.fillOpacity).toBe(0.4);
    expect(prim.stroke).toBe('#172033');
    expect(prim.strokeWidth).toBe(2);
    expect(prim.strokeOpacity).toBe(0.7);
    expect(prim.opacity).toBe(0.5);
  });

  it('uses ribbon zIndex when sorting lowered path primitives', () => {
    const compiled = compileToScene(
      scene([
        ribbon({ id: 'front', zIndex: 2 }),
        ribbon({ id: 'back', zIndex: 0 }),
      ]),
      { padding: 0 },
    );

    expect(compiled.primitives.map(prim => prim.id)).toEqual(['back', 'front']);
  });
});
