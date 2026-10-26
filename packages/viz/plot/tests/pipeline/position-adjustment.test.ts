import type { IRNode, IRScope } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import { describe, expect, it } from 'vitest';
import { literal, number, strictObject } from 'zod';

import { createPlotLocator } from '../../src';
import type { RolePositionAdjustmentDefinition, ScreenPositionAdjustmentDefinition } from '../../src/contract';
import { createCoordinateFrame, defineCoordinate } from '../../src/contract';
import { lowerPlotWithDataArtifact } from '../../src/pipeline/expand/lower';
import type { IRPlot } from '../../src/schemas';
import { PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

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
        properties: { ...(adjustments === undefined ? {} : { placement: { adjustments } }) },
        encodings: { position: { x: { field: 'category' }, y: { field: 'value' } } },
      },
    ],
  });

const isNodeChild = (child: IRScope['children'][number]): child is IRNode =>
  child.type === 'node' && 'position' in child;

const isScopeChild = (child: IRScope['children'][number]): child is IRScope =>
  child.type === 'scope' && 'children' in child;

const loweredOf = (
  spec: IRPlot,
  options: Omit<Parameters<typeof lowerPlotWithDataArtifact>[2], 'textMeasurer'> = {},
  data: Array<ExternalRow> = rows,
) =>
  lowerPlotWithDataArtifact(
    spec,
    { d: data },
    { ...options, layout: { width: 200, height: 100, ...options.layout }, textMeasurer: measureLabel },
  );

const positionsOf = (
  spec: IRPlot,
  options: Omit<Parameters<typeof lowerPlotWithDataArtifact>[2], 'textMeasurer'> = {},
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

describe('标记放置管线', () => {
  it('当省略抖动默认值时，使用比率 0.3 和种子 0', () => {
    const implicit = positionsOf(specOf([{ kind: 'jitter', role: 'x' }]));
    const explicit = positionsOf(specOf([{ kind: 'jitter', role: 'x', span: { kind: 'ratio', value: 0.3 }, seed: 0 }]));
    const previousDefault = positionsOf(
      specOf([{ kind: 'jitter', role: 'x', span: { kind: 'ratio', value: 0.8 }, seed: 0 }]),
    );

    expect(implicit).toEqual(explicit);
    expect(implicit).not.toEqual(previousDefault);
  });

  it('在比例映射后应用确定性比率抖动', () => {
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

  it('对离散角色中心周围的有界法向抖动进行采样', () => {
    const sampleRows = Array.from({ length: 128 }, (_, index) => ({
      category: index % 2 === 0 ? 'A' : 'B',
      value: index,
    }));
    const normalSpec = specOf([
      {
        kind: 'jitter',
        role: 'x',
        span: { kind: 'ratio', value: 1 },
        distribution: { kind: 'normal' },
        seed: 11,
      },
    ]);
    const uniformSpec = specOf([
      {
        kind: 'jitter',
        role: 'x',
        span: { kind: 'ratio', value: 1 },
        distribution: { kind: 'uniform' },
        seed: 11,
      },
    ]);
    const normal = positionsOf(normalSpec, {}, sampleRows);
    const repeated = positionsOf(normalSpec, {}, sampleRows);
    const uniform = positionsOf(uniformSpec, {}, sampleRows);
    const frame = defaultFrameOf(normalSpec, sampleRows);
    const xScale = frame.roleScales?.x;

    expect(xScale).toBeDefined();

    const centers = sampleRows.map(row => xScale?.coordinate(row.category) ?? Number.NaN);
    const normalOffsets = normal.map((position, index) => position[0] - centers[index]);
    const uniformOffsets = uniform.map((position, index) => position[0] - centers[index]);
    const halfStep = (xScale?.step ?? 0) / 2;
    const centralNormal = normalOffsets.filter(offset => Math.abs(offset) <= halfStep * 0.25).length;
    const centralUniform = uniformOffsets.filter(offset => Math.abs(offset) <= halfStep * 0.25).length;

    expect(normal).toEqual(repeated);
    expect(normal).not.toEqual(uniform);
    expect(normalOffsets.every(offset => Math.abs(offset) <= halfStep + 1e-8)).toBe(true);
    expect(centralNormal).toBeGreaterThan(centralUniform);
  });

  it('使用 sigma 更改正常扩展，而不更改抖动包络', () => {
    const narrow = specOf([
      {
        kind: 'jitter',
        role: 'x',
        span: { kind: 'ratio', value: 1 },
        distribution: { kind: 'normal', sigma: 0.25 },
        seed: 23,
      },
    ]);
    const wide = specOf([
      {
        kind: 'jitter',
        role: 'x',
        span: { kind: 'ratio', value: 1 },
        distribution: { kind: 'normal', sigma: 1 },
        seed: 23,
      },
    ]);

    expect(positionsOf(narrow)).not.toEqual(positionsOf(wide));
    expect(defaultFrameOf(narrow).roleScales?.x?.range()).toEqual(defaultFrameOf(wide).roleScales?.x?.range());
  });

  it('当空目标占据较早的随机槽时，保持后面的正常样本稳定', () => {
    const spec = specOf([
      {
        kind: 'jitter',
        role: 'x',
        span: { kind: 'ratio', value: 0.8 },
        distribution: { kind: 'normal' },
        seed: 17,
      },
    ]);
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

  it('投影后运行自定义屏幕空间初始值设定项', () => {
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
      definitions: { positionAdjustments: [definition] },
    });

    expect(shifted).toEqual(base.map(([x, y]) => [x + 7, y]));
  });

  it('拒绝屏幕初始化程序中重新排序的目标和更改的目标键', () => {
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
      positionsOf(specOf([{ kind: 'screen-reorder' }]), { definitions: { positionAdjustments: [reorder] } }),
    ).toThrow(/preserve placement target order and keys/);
    expect(() =>
      positionsOf(specOf([{ kind: 'screen-rekey' }]), { definitions: { positionAdjustments: [rekey] } }),
    ).toThrow(/preserve placement target order and keys/);
  });

  it('拒绝空更改、非有限位置和非 2D 屏幕结果', () => {
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
        { definitions: { positionAdjustments: [fillNull] } },
        rowsWithNullTarget,
      ),
    ).toThrow(/preserve null placement targets/);
    expect(() =>
      positionsOf(specOf([{ kind: 'screen-nan' }]), { definitions: { positionAdjustments: [nan] } }),
    ).toThrow(/finite values with stable dimensions/);
    expect(() =>
      positionsOf(specOf([{ kind: 'screen-three-dimensions' }]), {
        definitions: { positionAdjustments: [threeDimensions] },
      }),
    ).toThrow(/finite values with stable dimensions/);
  });

  it('当空目标占据较早的随机时隙时，保持后面的抖动样本稳定', () => {
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

  it('保持笛卡尔轴边界固定，同时包含数字抖动', () => {
    const makeSpec = (span: number) =>
      PlotSchema.parse({
        ...specOf([{ kind: 'jitter', role: 'x', span, seed: 7 }]),
        guides: [
          { type: 'axis', dimension: 'x' },
          { type: 'axis', dimension: 'y', grid: true },
        ],
      });
    const axisLinesOf = (scope: IRScope): Array<unknown> =>
      scope.children.flatMap(child => {
        if (!isScopeChild(child)) return [];
        if (child.meta?.layer === 'axis') {
          const path = child.children.find(item => item.type === 'path');
          return path === undefined ? [] : [path];
        }
        return axisLinesOf(child);
      });
    const jitterRows = Array.from({ length: 18 }, (_, index) => ({
      category: String.fromCharCode(65 + Math.floor(index / 3)),
      value: index + 1,
    }));
    const baseline = loweredOf(makeSpec(0), { layout: { width: 400, height: 360 }, provenance: true }, jitterRows);
    const jittered = loweredOf(makeSpec(120), { layout: { width: 400, height: 360 }, provenance: true }, jitterRows);
    const baselineAxes = axisLinesOf(baseline.child as IRScope);
    expect(baselineAxes).toHaveLength(2);
    expect(axisLinesOf(jittered.child as IRScope)).toEqual(baselineAxes);
    const boundary = [...baseline.dataArtifact.frameByCoordinateScopeId.values()][0].roleScales?.x?.range();
    expect(boundary).toBeDefined();
    const markNodesOf = (scope: IRScope): Array<IRNode> =>
      scope.children.flatMap(child => {
        if (!isScopeChild(child)) return [];
        return child.meta?.layer === 'mark' ? child.children.filter(isNodeChild) : markNodesOf(child);
      });
    const nodes = markNodesOf(jittered.child as IRScope);
    expect(nodes).toHaveLength(jitterRows.length);
    for (const node of nodes) {
      const [x] = node.position as [number, number];
      expect(x - 5).toBeGreaterThanOrEqual(Math.min(...boundary!));
      expect(x + 5).toBeLessThanOrEqual(Math.max(...boundary!));
    }
  });

  it('在笛卡尔边缘保留离散抖动半步加上字形和描边范围', () => {
    const spec = PlotSchema.parse({
      ...specOf([{ kind: 'jitter', role: 'x', span: { kind: 'ratio', value: 1 }, seed: 3 }]),
      marks: [
        {
          ...specOf().marks[0],
          properties: {
            size: 10,
            strokeWidth: 4,
            placement: { adjustments: [{ kind: 'jitter', role: 'x', span: { kind: 'ratio', value: 1 }, seed: 3 }] },
          },
        },
      ],
    });
    const frame = defaultFrameOf(spec);

    expect(frame.roleScales?.x?.range()).toEqual([12, 188]);
    expect(frame.roleScales?.x?.step).toBe(88);
  });

  it('保留反向范围，同时包含数字角色空间抖动', () => {
    const spec = specOf([{ kind: 'jitter', role: 'y', span: 20, seed: 1 }]);
    const frame = defaultFrameOf(spec);

    expect(frame.roleScales?.y?.range()).toEqual([85, 15]);
  });

  it('失败而不是重写显式连续范围以进行遏制', () => {
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
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: {
            size: 10,
            strokeWidth: 2,
            placement: { adjustments: [{ kind: 'jitter', role: 'x', span: 20, seed: 1 }] },
          },
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

  it('在 Plot 所属模块边界处包装自定义角色空间遏制失败', () => {
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
      positionsOf(specOf([{ kind: 'measure-failure' }]), { definitions: { positionAdjustments: [measureFailure] } }),
    ).toThrow('lowerPlots: position adjustment "measure-failure" containment failed');
  });

  it('沿相邻多边形边投影离散弦角调整', () => {
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
          encodings: { position: { x: { field: 'category' }, y: { field: 'value' } } },
          properties: { placement: { adjustments: [{ kind: 'fixed-angle', offset: 22.5 }] } },
        },
      ],
    });
    const base = positionsOf(
      PlotSchema.parse({
        ...polarSpec,
        marks: [{ type: 'point', encodings: { position: { x: { field: 'category' }, y: { field: 'value' } } } }],
      }),
      { layout: { width: 200, height: 200 } },
      polarRows,
    );
    const shifted = positionsOf(
      polarSpec,
      { layout: { width: 200, height: 200 }, definitions: { positionAdjustments: [fixedAngle] } },
      polarRows,
    );

    expect(shifted[0][0]).toBeCloseTo(base[0][0] * 0.75 + base[1][0] * 0.25, 6);
    expect(shifted[0][1]).toBeCloseTo(base[0][1] * 0.75 + base[1][1] * 0.25, 6);
  });

  it('在位移跟随半径的圆弧上保持显式极角调整', () => {
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
          encodings: { position: { x: { field: 'category' }, y: { field: 'value' } } },
          properties: { placement: { adjustments: [{ kind: 'fixed-polar-angle', offset: 22.5 }] } },
        },
      ],
    });
    const base = positionsOf(
      PlotSchema.parse({
        ...polarSpec,
        marks: [{ type: 'point', encodings: { position: { x: { field: 'category' }, y: { field: 'value' } } } }],
      }),
      { layout: { width: 200, height: 200 } },
      polarRows,
    );
    const shifted = positionsOf(
      polarSpec,
      { layout: { width: 200, height: 200 }, definitions: { positionAdjustments: [fixedPolarAngle] } },
      polarRows,
    );
    const displacement = (index: number): number =>
      Math.hypot(shifted[index][0] - base[index][0], shifted[index][1] - base[index][1]);

    expect(displacement(1)).toBeCloseTo(displacement(0) * 2, 6);
  });

  it('即使路径插值是弦插值，也可以在精确的极投影上保持连续的角度值', () => {
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
          encodings: { position: { x: { field: 'angle' }, y: { field: 'value' } } },
          properties: { placement: { adjustments: [{ kind: 'fixed-continuous-angle', offset: 22.5 }] } },
        },
      ],
    });
    const base = positionsOf(
      PlotSchema.parse({
        ...continuousSpec,
        marks: [{ type: 'point', encodings: { position: { x: { field: 'angle' }, y: { field: 'value' } } } }],
      }),
      { layout: { width: 200, height: 200 } },
      continuousRows,
    );
    const shifted = positionsOf(
      continuousSpec,
      { layout: { width: 200, height: 200 }, definitions: { positionAdjustments: [fixedContinuousAngle] } },
      continuousRows,
    );
    const distanceFromCenter = (position: [number, number]): number =>
      Math.hypot(position[0] - base[0][0], position[1] - base[0][1]);

    expect(distanceFromCenter(shifted[1])).toBeCloseTo(distanceFromCenter(base[1]), 6);
  });

  it('不会为完全极坐标扫描创建接缝，并且在不可能进行部分扫描字形遏制时会失败', () => {
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
            encodings: { position: { x: { field: 'category' }, y: { field: 'value' } } },
            properties: {
              placement: { adjustments: [{ kind: 'jitter', role: 'x', span: { kind: 'ratio', value: 1 } }] },
            },
          },
        ],
      });

    expect(defaultFrameOf(polarSpec(360), [{ category: 'A', value: 10 }]).roleScales?.x?.range()).toEqual([0, 360]);
    expect(() => defaultFrameOf(polarSpec(180), [{ category: 'A', value: 0 }])).toThrow(/cannot contain glyph extent/);
  });

  it('使用相同的两阶段投影协定来实现可放置的自定义坐标', () => {
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
          encodings: { position: { x: { field: 'category' } } },
          properties: { placement: { adjustments: [{ kind: 'jitter', span: { kind: 'ratio', value: 1 }, seed: 2 }] } },
        },
      ],
    });

    expect(
      positionsOf(customSpec, { definitions: { coordinates: [customCoordinate] } }).some(
        position => position[1] === 20,
      ),
    ).toBe(true);
  });

  it('保持 projectRoles 等效于显式映射然后项目阶段', () => {
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
      marks: [{ type: 'point', encodings: { position: { x: { field: 'category' }, y: { field: 'value' } } } }],
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

  it('当自定义坐标缺少用于放置的两阶段投影时，会明确报错', () => {
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
          encodings: { position: { x: { field: 'category' } } },
          properties: { placement: { adjustments: [{ kind: 'screen-noop' }] } },
        },
      ],
    });

    expect(() =>
      positionsOf(customSpec, { definitions: { coordinates: [legacyCoordinate], positionAdjustments: [noop] } }),
    ).toThrow(/does not expose mapped-role projection/);
  });

  it('独立解决每个面面板的抖动', () => {
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
          encodings: { position: { x: { field: 'category' }, y: { field: 'value' } } },
          properties: {
            size: 10,
            placement: {
              adjustments: [{ kind: 'jitter', role: 'x', span: { kind: 'ratio', value: 1 }, seed: 9 }],
            },
          },
        },
      ],
    });
    const positions = positionsOf(facetSpec, {}, facetRows);

    expect(positions).toHaveLength(4);
    expect(positions[0]).toEqual(positions[2]);
    expect(positions[1]).toEqual(positions[3]);
  });

  it('定位器读取最终调整后的点位置，而不回放初始化程序', () => {
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
      { layout: { width: 200, height: 100 }, definitions: { positionAdjustments: [countedNudge] }, environment: {} },
    );

    expect(locator.datum(0)?.position).toEqual([base[0][0] + 6, base[0][1]]);
    expect(locator.datum(1)?.position).toEqual([base[1][0] + 6, base[1][1]]);
    expect(locator.datum(0)?.position).toEqual([base[0][0] + 6, base[0][1]]);
    expect(initializeCount).toBe(1);
  });

  it('由于未知类型、不明确的角色和非法初始化输出而明确报错', () => {
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

    expect(() =>
      positionsOf(specOf([{ kind: 'bad-output' }]), { definitions: { positionAdjustments: [bad] } }),
    ).toThrow(/preserve placement target count/);
  });

  it('拒绝稀疏或 undefined 的初始值设定项，并显示诊断 Plot 错误', () => {
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

    expect(() =>
      positionsOf(specOf([{ kind: 'sparse-screen' }]), { definitions: { positionAdjustments: [sparse] } }),
    ).toThrow(/initializer must preserve placement target order and keys/);
    expect(() =>
      positionsOf(specOf([{ kind: 'undefined-screen' }]), { definitions: { positionAdjustments: [undefinedEntry] } }),
    ).toThrow(/initializer must preserve placement target order and keys/);
  });
});
