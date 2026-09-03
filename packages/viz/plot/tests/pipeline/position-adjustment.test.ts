import type { IRNode, IRScope } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';

import { describe, expect, it } from 'vitest';
import { literal, number, strictObject } from 'zod';

import type { RolePositionAdjustmentDefinition, ScreenPositionAdjustmentDefinition } from '../../src/contract';
import type { IRPlot } from '../../src/schemas';

import { createPlotLocator } from '../../src';
import { createCoordinateFrame, defineCoordinate } from '../../src/contract';
import { lowerPlotWithDataArtifact } from '../../src/pipeline/expand/lower';
import { PlotSchema } from '../../src/schemas';

const rows = [
  { category: 'A', value: 1 },
  { category: 'A', value: 2 },
  { category: 'B', value: 3 },
];

const specOf = (adjustments?: Array<Record<string, unknown>>): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'point', name: 'x' },
      { type: 'linear', name: 'y', domainPadding: 0 },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',
        encoding: { x: { field: 'category' }, y: { field: 'value' } },
        ...(adjustments === undefined ? {} : { placement: { adjustments } }),
      },
    ],
  });

const isNodeChild = (child: IRScope['children'][number]): child is IRNode =>
  child.type === 'node' && 'position' in child;

const isScopeChild = (child: IRScope['children'][number]): child is IRScope =>
  child.type === 'scope' && 'children' in child;

const loweredOf = (
  spec: IRPlot,
  options: Parameters<typeof lowerPlotWithDataArtifact>[2] = {},
  data: Array<ExternalRow> = rows,
) => lowerPlotWithDataArtifact(spec, { d: data }, { width: 200, height: 100, ...options });

const positionsOf = (
  spec: IRPlot,
  options: Parameters<typeof lowerPlotWithDataArtifact>[2] = {},
  data: Array<ExternalRow> = rows,
): Array<[number, number]> => {
  const root = loweredOf(spec, options, data).child as IRScope;
  const nodes: Array<IRNode> = [];
  const visit = (scope: IRScope): void => {
    for (const child of scope.children) {
      if (isNodeChild(child) && Array.isArray(child.position)) nodes.push(child);
      if (isScopeChild(child)) visit(child);
    }
  };
  visit(root);
  return nodes.map(node => node.position as [number, number]);
};

const defaultFrameOf = (spec: IRPlot, data: Array<ExternalRow> = rows) =>
  [...loweredOf(spec, {}, data).dataArtifact.frameByCoordinateScopeId.values()][0];

describe('Mark Placement pipeline', () => {
  it('applies deterministic ratio jitter after scale mapping', () => {
    const spec = specOf([{ kind: 'jitter', role: 'x', span: { kind: 'ratio', value: 0.8 }, seed: 3 }]);
    const first = positionsOf(spec);
    const second = positionsOf(spec);
    const base = positionsOf(specOf());
    expect(first).toEqual(second);
    expect(first.some((position, index) => position[0] !== base[index][0])).toBe(true);
    for (let index = 0; index < first.length; index += 1) {
      expect(Math.abs(first[index][0] - base[index][0])).toBeLessThan(80);
      expect(first[index][1]).toBe(base[index][1]);
    }
  });

  it('runs custom screen-space initializers after projection', () => {
    const NudgeSchema = strictObject({ kind: literal('screen-nudge'), dx: number() });
    type Nudge = { kind: 'screen-nudge'; dx: number };
    const definition: ScreenPositionAdjustmentDefinition<Nudge> = {
      space: 'screen',
      schema: NudgeSchema,
      initialize: (operation, context) =>
        context.targets.map(target => ({
          key: target.key,
          position: target.position === null ? null : [target.position[0] + operation.dx, target.position[1]],
        })),
    };
    const base = positionsOf(specOf());
    const shifted = positionsOf(specOf([{ kind: 'screen-nudge', dx: 7 }]), {
      positionAdjustmentDefinitions: [definition],
    });
    expect(shifted).toEqual(base.map(([x, y]) => [x + 7, y]));
  });

  it('rejects reordered targets and changed target keys from a screen initializer', () => {
    const ReorderSchema = strictObject({ kind: literal('screen-reorder') });
    const reorder: ScreenPositionAdjustmentDefinition<{ kind: 'screen-reorder' }> = {
      space: 'screen',
      schema: ReorderSchema,
      initialize: (_operation, context) =>
        [...context.targets].reverse().map(target => ({ key: target.key, position: target.position })),
    };
    const RekeySchema = strictObject({ kind: literal('screen-rekey') });
    const rekey: ScreenPositionAdjustmentDefinition<{ kind: 'screen-rekey' }> = {
      space: 'screen',
      schema: RekeySchema,
      initialize: (_operation, context) =>
        context.targets.map((target, index) => ({
          key: index === 0 ? `${target.key}.changed` : target.key,
          position: target.position,
        })),
    };

    expect(() =>
      positionsOf(specOf([{ kind: 'screen-reorder' }]), { positionAdjustmentDefinitions: [reorder] }),
    ).toThrow(/preserve placement target order and keys/);
    expect(() => positionsOf(specOf([{ kind: 'screen-rekey' }]), { positionAdjustmentDefinitions: [rekey] })).toThrow(
      /preserve placement target order and keys/,
    );
  });

  it('rejects null changes, non-finite positions, and non-2D screen results', () => {
    const NullSchema = strictObject({ kind: literal('screen-fill-null') });
    const fillNull: ScreenPositionAdjustmentDefinition<{ kind: 'screen-fill-null' }> = {
      space: 'screen',
      schema: NullSchema,
      initialize: (_operation, context) =>
        context.targets.map(target => ({ key: target.key, position: target.position ?? [0, 0] })),
    };
    const NanSchema = strictObject({ kind: literal('screen-nan') });
    const nan: ScreenPositionAdjustmentDefinition<{ kind: 'screen-nan' }> = {
      space: 'screen',
      schema: NanSchema,
      initialize: (_operation, context) =>
        context.targets.map(target => ({
          key: target.key,
          position: target.position === null ? null : [Number.NaN, target.position[1]],
        })),
    };
    const ThreeDimensionsSchema = strictObject({ kind: literal('screen-three-dimensions') });
    const threeDimensions: ScreenPositionAdjustmentDefinition<{ kind: 'screen-three-dimensions' }> = {
      space: 'screen',
      schema: ThreeDimensionsSchema,
      initialize: (_operation, context) =>
        context.targets.map(target => {
          if (target.position === null) return { key: target.key, position: null };
          const position: [number, number] = [target.position[0], target.position[1]];
          position.push(0);
          return { key: target.key, position };
        }),
    };
    const rowsWithNullTarget = [
      { category: 'A', value: 1 },
      { category: null, value: 2 },
      { category: 'B', value: 3 },
    ];

    expect(() =>
      positionsOf(
        specOf([{ kind: 'screen-fill-null' }]),
        { positionAdjustmentDefinitions: [fillNull] },
        rowsWithNullTarget,
      ),
    ).toThrow(/preserve null placement targets/);
    expect(() => positionsOf(specOf([{ kind: 'screen-nan' }]), { positionAdjustmentDefinitions: [nan] })).toThrow(
      /finite values with stable dimensions/,
    );
    expect(() =>
      positionsOf(specOf([{ kind: 'screen-three-dimensions' }]), {
        positionAdjustmentDefinitions: [threeDimensions],
      }),
    ).toThrow(/finite values with stable dimensions/);
  });

  it('keeps later jitter samples stable when a null target occupies an earlier random slot', () => {
    const spec = specOf([{ kind: 'jitter', role: 'x', span: { kind: 'ratio', value: 0.8 }, seed: 17 }]);
    const rowsWithNullTarget = [
      { category: 'A', value: 1 },
      { category: null, value: 2 },
      { category: 'B', value: 3 },
    ];
    const rowsWithValidPlaceholder = [
      { category: 'A', value: 1 },
      { category: 'A', value: 2 },
      { category: 'B', value: 3 },
    ];
    const withNull = positionsOf(spec, {}, rowsWithNullTarget);
    const withPlaceholder = positionsOf(spec, {}, rowsWithValidPlaceholder);

    expect(withNull).toHaveLength(2);
    expect(withNull[1]).toEqual(withPlaceholder[2]);
  });

  it('reserves discrete jitter half-step plus glyph and stroke extent at Cartesian edges', () => {
    const spec = PlotSchema.parse({
      ...specOf([{ kind: 'jitter', role: 'x', span: { kind: 'ratio', value: 1 }, seed: 3 }]),
      marks: [
        {
          ...specOf().marks[0],
          size: { kind: 'constant', value: 10 },
          strokeWidth: { kind: 'constant', value: 4 },
          placement: {
            adjustments: [{ kind: 'jitter', role: 'x', span: { kind: 'ratio', value: 1 }, seed: 3 }],
          },
        },
      ],
    });
    const frame = defaultFrameOf(spec);

    expect(frame.roleScales?.x?.range()).toEqual([12, 188]);
    expect(frame.roleScales?.x?.step).toBe(88);
  });

  it('preserves reversed ranges while containing numeric role-space jitter', () => {
    const spec = specOf([{ kind: 'jitter', role: 'y', span: 20, seed: 1 }]);
    const frame = defaultFrameOf(spec);

    expect(frame.roleScales?.y?.range()).toEqual([85, 15]);
  });

  it('fails instead of rewriting an explicit continuous range for containment', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domain: [0, 1], range: [20, 180], domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          size: { kind: 'constant', value: 10 },
          strokeWidth: { kind: 'constant', value: 2 },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
          placement: { adjustments: [{ kind: 'jitter', role: 'x', span: 20, seed: 1 }] },
        },
      ],
    });

    expect(() =>
      defaultFrameOf(spec, [
        { x: 0, y: 1 },
        { x: 1, y: 2 },
      ]),
    ).toThrow(/explicit range.*containment/i);
  });

  it('wraps custom role-space containment failures at the Plot owner boundary', () => {
    const MeasureFailureSchema = strictObject({ kind: literal('measure-failure') });
    const measureFailure: RolePositionAdjustmentDefinition<{ kind: 'measure-failure' }> = {
      space: 'role',
      schema: MeasureFailureSchema,
      containment: {
        policy: 'contain',
        measure: () => {
          throw new Error('measure boom');
        },
      },
      initialize: (_operation, context) =>
        context.targets.map(target => ({ key: target.key, mappedRoles: target.mappedRoles })),
    };

    expect(() =>
      positionsOf(specOf([{ kind: 'measure-failure' }]), {
        positionAdjustmentDefinitions: [measureFailure],
      }),
    ).toThrow('lowerPlots: position adjustment "measure-failure" containment failed');
  });

  it('projects discrete chord angle adjustments along adjacent polygon edges', () => {
    const FixedAngleSchema = strictObject({ kind: literal('fixed-angle'), offset: number() });
    type FixedAngle = { kind: 'fixed-angle'; offset: number };
    const fixedAngle = {
      space: 'role',
      schema: FixedAngleSchema,
      initialize: (operation, context) =>
        context.targets.map(target => ({
          key: target.key,
          mappedRoles:
            target.mappedRoles === null
              ? null
              : [target.mappedRoles[0] + operation.offset, ...target.mappedRoles.slice(1)],
        })),
    } satisfies RolePositionAdjustmentDefinition<FixedAngle>;
    const polarRows = [
      { category: 'A', value: 10 },
      { category: 'B', value: 10 },
      { category: 'C', value: 10 },
      { category: 'D', value: 10 },
    ];
    const polarSpec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'point', name: 'angle' },
        { type: 'linear', name: 'radius', domain: [0, 10], domainPadding: 0 },
      ],
      coordinate: { type: 'polar2D', angle: 'angle', radius: 'radius' },
      marks: [
        {
          type: 'point',
          encoding: { x: { field: 'category' }, y: { field: 'value' } },
          placement: { adjustments: [{ kind: 'fixed-angle', offset: 22.5 }] },
        },
      ],
    });
    const base = positionsOf(
      PlotSchema.parse({
        ...polarSpec,
        marks: [{ type: 'point', encoding: { x: { field: 'category' }, y: { field: 'value' } } }],
      }),
      { width: 200, height: 200 },
      polarRows,
    );
    const shifted = positionsOf(
      polarSpec,
      { width: 200, height: 200, positionAdjustmentDefinitions: [fixedAngle] },
      polarRows,
    );
    expect(shifted[0][0]).toBeCloseTo(base[0][0] * 0.75 + base[1][0] * 0.25, 6);
    expect(shifted[0][1]).toBeCloseTo(base[0][1] * 0.75 + base[1][1] * 0.25, 6);
  });

  it('keeps explicit polar angle adjustments on arcs whose displacement follows radius', () => {
    const FixedPolarAngleSchema = strictObject({ kind: literal('fixed-polar-angle'), offset: number() });
    type FixedPolarAngle = { kind: 'fixed-polar-angle'; offset: number };
    const fixedPolarAngle = {
      space: 'role',
      schema: FixedPolarAngleSchema,
      initialize: (operation, context) =>
        context.targets.map(target => ({
          key: target.key,
          mappedRoles:
            target.mappedRoles === null
              ? null
              : [target.mappedRoles[0] + operation.offset, ...target.mappedRoles.slice(1)],
        })),
    } satisfies RolePositionAdjustmentDefinition<FixedPolarAngle>;
    const polarRows = [
      { category: 'A', value: 5 },
      { category: 'A', value: 10 },
      { category: 'B', value: 10 },
      { category: 'C', value: 10 },
      { category: 'D', value: 10 },
    ];
    const polarSpec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'point', name: 'angle' },
        { type: 'linear', name: 'radius', domain: [0, 10], domainPadding: 0 },
      ],
      coordinate: { type: 'polar2D', angle: 'angle', radius: 'radius', interpolation: 'polar' },
      marks: [
        {
          type: 'point',
          encoding: { x: { field: 'category' }, y: { field: 'value' } },
          placement: { adjustments: [{ kind: 'fixed-polar-angle', offset: 22.5 }] },
        },
      ],
    });
    const base = positionsOf(
      PlotSchema.parse({
        ...polarSpec,
        marks: [{ type: 'point', encoding: { x: { field: 'category' }, y: { field: 'value' } } }],
      }),
      { width: 200, height: 200 },
      polarRows,
    );
    const shifted = positionsOf(
      polarSpec,
      { width: 200, height: 200, positionAdjustmentDefinitions: [fixedPolarAngle] },
      polarRows,
    );
    const displacement = (index: number): number =>
      Math.hypot(shifted[index][0] - base[index][0], shifted[index][1] - base[index][1]);

    expect(displacement(1)).toBeCloseTo(displacement(0) * 2, 6);
  });

  it('keeps continuous angular values on their exact polar projection even when path interpolation is chord', () => {
    const FixedContinuousAngleSchema = strictObject({ kind: literal('fixed-continuous-angle'), offset: number() });
    type FixedContinuousAngle = { kind: 'fixed-continuous-angle'; offset: number };
    const fixedContinuousAngle = {
      space: 'role',
      schema: FixedContinuousAngleSchema,
      initialize: (operation, context) =>
        context.targets.map(target => ({
          key: target.key,
          mappedRoles:
            target.mappedRoles === null
              ? null
              : [target.mappedRoles[0] + operation.offset, ...target.mappedRoles.slice(1)],
        })),
    } satisfies RolePositionAdjustmentDefinition<FixedContinuousAngle>;
    const continuousRows = [
      { angle: 0, value: 0 },
      { angle: 45, value: 10 },
    ];
    const continuousSpec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'angle', domain: [0, 360], domainPadding: 0 },
        { type: 'linear', name: 'radius', domain: [0, 10], domainPadding: 0 },
      ],
      coordinate: { type: 'polar2D', angle: 'angle', radius: 'radius', interpolation: 'chord' },
      marks: [
        {
          type: 'point',
          encoding: { x: { field: 'angle' }, y: { field: 'value' } },
          placement: { adjustments: [{ kind: 'fixed-continuous-angle', offset: 22.5 }] },
        },
      ],
    });
    const base = positionsOf(
      PlotSchema.parse({
        ...continuousSpec,
        marks: [{ type: 'point', encoding: { x: { field: 'angle' }, y: { field: 'value' } } }],
      }),
      { width: 200, height: 200 },
      continuousRows,
    );
    const shifted = positionsOf(
      continuousSpec,
      { width: 200, height: 200, positionAdjustmentDefinitions: [fixedContinuousAngle] },
      continuousRows,
    );
    const distanceFromCenter = (position: [number, number]): number =>
      Math.hypot(position[0] - base[0][0], position[1] - base[0][1]);

    expect(distanceFromCenter(shifted[1])).toBeCloseTo(distanceFromCenter(base[1]), 6);
  });

  it('does not create a seam for full polar sweeps and fails when partial-sweep glyph containment is impossible', () => {
    const polarSpec = (endAngle: number): IRPlot =>
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'point', name: 'angle' },
          { type: 'linear', name: 'radius', domain: [0, 10], domainPadding: 0 },
        ],
        coordinate: { type: 'polar2D', angle: 'angle', radius: 'radius', endAngle },
        marks: [
          {
            type: 'point',
            encoding: { x: { field: 'category' }, y: { field: 'value' } },
            placement: { adjustments: [{ kind: 'jitter', role: 'x', span: { kind: 'ratio', value: 1 } }] },
          },
        ],
      });

    expect(defaultFrameOf(polarSpec(360), [{ category: 'A', value: 10 }]).roleScales?.x?.range()).toEqual([0, 360]);
    expect(() => defaultFrameOf(polarSpec(180), [{ category: 'A', value: 0 }])).toThrow(/cannot contain glyph extent/);
  });

  it('uses the same two-stage projection contract for placement-capable custom coordinates', () => {
    const customCoordinate = defineCoordinate({
      schema: strictObject({ type: literal('placement-line') }),
      roles: ['x'],
      resolve: (_operation, context) => {
        const values = context.collectRoleValues('x');
        const scaleOperation = context.resolveScaleForRole('x', undefined, values);
        const scale = context.buildPositionScale(scaleOperation, values, [0, context.width]);
        const mapRoles = (roleValues: ReadonlyArray<unknown>): ReadonlyArray<number> | null => {
          const x = scale.coordinate(roleValues[0]);
          return Number.isFinite(x) ? [x] : null;
        };
        const projectMappedRoles = (mappedRoles: ReadonlyArray<number>): [number, number] | null =>
          Number.isFinite(mappedRoles[0]) ? [mappedRoles[0], 20] : null;
        return {
          frame: createCoordinateFrame(
            'placement-line',
            ['x'],
            roleValues => {
              const mappedRoles = mapRoles(roleValues);
              return mappedRoles === null ? null : projectMappedRoles(mappedRoles);
            },
            {
              roleScales: { x: scale },
              mapRoles,
              projectMappedRoles,
              placementBoundary: {
                isCyclic: () => false,
                unitNormal: role => (role === 'x' ? [1, 0] : null),
                glyphExtentInRoleUnits: (role, _mappedRoles, extent) => (role === 'x' ? extent : null),
              },
            },
          ),
          plotArea: { x: 0, y: 0, width: context.width, height: context.height },
          gridLayers: [],
          axisLayers: [],
        };
      },
    });
    const customSpec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'point', name: 'x' }],
      coordinate: { type: 'placement-line' },
      marks: [
        {
          type: 'point',
          encoding: { x: { field: 'category' } },
          placement: { adjustments: [{ kind: 'jitter', span: { kind: 'ratio', value: 1 }, seed: 2 }] },
        },
      ],
    });

    expect(positionsOf(customSpec, { coordinates: [customCoordinate] }).some(position => position[1] === 20)).toBe(
      true,
    );
  });

  it('keeps projectRoles equivalent to the explicit map-then-project stages', () => {
    const cartesianFrame = defaultFrameOf(specOf());
    const cartesianRoles = ['A', 2] as const;
    const cartesianMapped = cartesianFrame.mapRoles?.(cartesianRoles);

    expect(cartesianMapped).not.toBeNull();
    expect(cartesianFrame.projectRoles(cartesianRoles)).toEqual(
      cartesianMapped === null || cartesianMapped === undefined
        ? null
        : cartesianFrame.projectMappedRoles?.(cartesianMapped),
    );

    const polarSpec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'point', name: 'angle' },
        { type: 'linear', name: 'radius', domain: [0, 10], domainPadding: 0 },
      ],
      coordinate: { type: 'polar2D', angle: 'angle', radius: 'radius' },
      marks: [{ type: 'point', encoding: { x: { field: 'category' }, y: { field: 'value' } } }],
    });
    const polarFrame = defaultFrameOf(polarSpec, [
      { category: 'A', value: 2 },
      { category: 'B', value: 8 },
    ]);
    const polarRoles = ['B', 8] as const;
    const polarMapped = polarFrame.mapRoles?.(polarRoles);

    expect(polarMapped).not.toBeNull();
    expect(polarFrame.projectRoles(polarRoles)).toEqual(
      polarMapped === null || polarMapped === undefined ? null : polarFrame.projectMappedRoles?.(polarMapped),
    );
  });

  it('fails loudly when a custom coordinate lacks two-stage projection for placement', () => {
    const LegacyCoordinateSchema = strictObject({ type: literal('legacy-projection') });
    const legacyCoordinate = defineCoordinate({
      schema: LegacyCoordinateSchema,
      roles: ['x'],
      resolve: (_operation, context) => {
        const values = context.collectRoleValues('x');
        const scaleOperation = context.resolveScaleForRole('x', undefined, values);
        const scale = context.buildPositionScale(scaleOperation, values, [0, context.width]);
        return {
          frame: createCoordinateFrame(
            'legacy-projection',
            ['x'],
            roleValues => {
              const x = scale.coordinate(roleValues[0]);
              return Number.isFinite(x) ? [x, 10] : null;
            },
            { roleScales: { x: scale } },
          ),
          plotArea: { x: 0, y: 0, width: context.width, height: context.height },
          gridLayers: [],
          axisLayers: [],
        };
      },
    });
    const NoopSchema = strictObject({ kind: literal('screen-noop') });
    const noop: ScreenPositionAdjustmentDefinition<{ kind: 'screen-noop' }> = {
      space: 'screen',
      schema: NoopSchema,
      initialize: (_operation, context) =>
        context.targets.map(target => ({ key: target.key, position: target.position })),
    };
    const customSpec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'point', name: 'x' }],
      coordinate: { type: 'legacy-projection' },
      marks: [
        {
          type: 'point',
          encoding: { x: { field: 'category' } },
          placement: { adjustments: [{ kind: 'screen-noop' }] },
        },
      ],
    });

    expect(() =>
      positionsOf(customSpec, { coordinates: [legacyCoordinate], positionAdjustmentDefinitions: [noop] }),
    ).toThrow(/does not expose mapped-role projection/);
  });

  it('resolves jitter independently for each facet panel', () => {
    const facetRows = [
      { panel: 'left', category: 'A', value: 1 },
      { panel: 'left', category: 'B', value: 2 },
      { panel: 'right', category: 'A', value: 1 },
      { panel: 'right', category: 'B', value: 2 },
    ];
    const facetSpec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'point', name: 'x' },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      composition: {
        defaultView: 'root',
        views: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
        arrangements: [{ kind: 'facet', id: 'panels', view: 'root', column: { field: 'panel' } }],
      },
      marks: [
        {
          type: 'point',
          encoding: { x: { field: 'category' }, y: { field: 'value' } },
          size: { kind: 'constant', value: 10 },
          placement: {
            adjustments: [{ kind: 'jitter', role: 'x', span: { kind: 'ratio', value: 1 }, seed: 9 }],
          },
        },
      ],
    });
    const positions = positionsOf(facetSpec, {}, facetRows);

    expect(positions).toHaveLength(4);
    expect(positions[0]).toEqual(positions[2]);
    expect(positions[1]).toEqual(positions[3]);
  });

  it('locator reads final adjusted Point positions without replaying the initializer', () => {
    const CountedSchema = strictObject({ kind: literal('counted-screen-nudge'), dx: number() });
    let initializeCount = 0;
    const countedNudge: ScreenPositionAdjustmentDefinition<{ kind: 'counted-screen-nudge'; dx: number }> = {
      space: 'screen',
      schema: CountedSchema,
      initialize: (operation, context) => {
        initializeCount += 1;
        return context.targets.map(target => ({
          key: target.key,
          position: target.position === null ? null : [target.position[0] + operation.dx, target.position[1]],
        }));
      },
    };
    const base = positionsOf(specOf());
    const adjustedSpec = specOf([{ kind: 'counted-screen-nudge', dx: 6 }]);
    const locator = createPlotLocator(
      adjustedSpec,
      { d: rows },
      {
        width: 200,
        height: 100,
        positionAdjustmentDefinitions: [countedNudge],
      },
    );

    expect(locator.datum(0)?.position).toEqual([base[0][0] + 6, base[0][1]]);
    expect(locator.datum(1)?.position).toEqual([base[1][0] + 6, base[1][1]]);
    expect(locator.datum(0)?.position).toEqual([base[0][0] + 6, base[0][1]]);
    expect(initializeCount).toBe(1);
  });

  it('fails loudly for unknown kinds, ambiguous role, and illegal initializer output', () => {
    expect(() => positionsOf(specOf([{ kind: 'missing' }]))).toThrow(/not registered/);
    expect(() => positionsOf(specOf([{ kind: 'jitter', role: 'z', span: 10 }]))).toThrow(
      /not provided by the coordinate frame/,
    );

    const BadSchema = strictObject({ kind: literal('bad-output') });
    const bad: ScreenPositionAdjustmentDefinition<{ kind: 'bad-output' }> = {
      space: 'screen',
      schema: BadSchema,
      initialize: () => [],
    };
    expect(() => positionsOf(specOf([{ kind: 'bad-output' }]), { positionAdjustmentDefinitions: [bad] })).toThrow(
      /preserve placement target count/,
    );
  });

  it('rejects sparse or undefined initializer entries with a diagnostic Plot error', () => {
    const SparseSchema = strictObject({ kind: literal('sparse-screen') });
    const sparse: ScreenPositionAdjustmentDefinition<{ kind: 'sparse-screen' }> = {
      space: 'screen',
      schema: SparseSchema,
      initialize: (_operation, context) => new Array(context.targets.length),
    };
    const UndefinedSchema = strictObject({ kind: literal('undefined-screen') });
    const undefinedEntry: ScreenPositionAdjustmentDefinition<{ kind: 'undefined-screen' }> = {
      space: 'screen',
      schema: UndefinedSchema,
      initialize: (_operation, context) => new Array(context.targets.length).fill(undefined),
    };

    expect(() => positionsOf(specOf([{ kind: 'sparse-screen' }]), { positionAdjustmentDefinitions: [sparse] })).toThrow(
      /initializer must preserve placement target order and keys/,
    );
    expect(() =>
      positionsOf(specOf([{ kind: 'undefined-screen' }]), { positionAdjustmentDefinitions: [undefinedEntry] }),
    ).toThrow(/initializer must preserve placement target order and keys/);
  });
});
