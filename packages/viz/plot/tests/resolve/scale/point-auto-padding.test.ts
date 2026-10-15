import { describe, expect, it } from 'vitest';

import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import { PlotSchema, PointAutoPaddingSchema, PointMarkSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const rows = [
  { x: 0, y: 0 },
  { x: 10, y: 10 },
];

const resolveFrame = (autoPadding?: unknown, domainPadding?: unknown) => {
  const plot = PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    width: 200,
    height: 200,
    data: { reference: 'rows' },
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    scales: ['x', 'y'].map(name => ({ type: 'linear', name, domainPadding })),
    marks: [
      {
        type: 'point',
        size: { kind: 'constant', value: 10 },
        autoPadding,
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      },
    ],
  });
  return [
    ...lowerPlotWithDataArtifact(
      plot,
      { rows },
      { textMeasurer: measureLabel },
    ).dataArtifact.frameByCoordinateScopeId.values(),
  ][0];
};

describe('Point 自动留白', () => {
  const framesOf = (marks: Array<unknown>, extra = {}, data = rows) => {
    const plot = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      width: 400,
      height: 300,
      data: { reference: 'rows' },
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      marks,
      ...extra,
    });
    return [
      ...lowerPlotWithDataArtifact(
        plot,
        { rows: data },
        { textMeasurer: measureLabel },
      ).dataArtifact.frameByCoordinateScopeId.values(),
    ];
  };
  const point = (size: number, autoPadding: unknown = 'max-radius', extra = {}) => ({
    type: 'point',
    size: { kind: 'constant', value: size },
    autoPadding,
    encoding: { x: { field: 'x' }, y: { field: 'y' } },
    ...extra,
  });

  it('混合策略按各端最大需求求解，匿名图元不与作者 id 碰撞', () => {
    const scale = framesOf([
      point(10, { kind: 'point-aware', clearance: 4 }),
      point(20, 'max-radius', { id: '__padding.0' }),
    ])[0].roleScales!.x!;
    expect(scale.coordinate(0) - scale.range()[0]).toBeCloseTo(20);
    expect(scale.range()[1] - scale.coordinate(10)).toBeCloseTo(20);
  });

  it.each(['max-radius', 'point-aware'])('共享分面以同一域满足不同绘图区的 %s 约束', strategy => {
    const frames = framesOf(
      [point(10, strategy)],
      {
        coordinate: undefined,
        width: 640,
        guides: [
          { type: 'axis', dimension: 'x' },
          { type: 'axis', dimension: 'y' },
        ],
        composition: {
          defaultView: 'root',
          views: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
          arrangements: [
            {
              kind: 'facet',
              id: 'groups',
              view: 'root',
              column: { field: 'group' },
              resolve: { scale: { y: 'independent' } },
            },
          ],
        },
      },
      [...rows.map(row => ({ ...row, group: 'A' })), ...rows.map(row => ({ ...row, y: row.y * 100000, group: 'B' }))],
    ).slice(1);
    expect(frames).toHaveLength(2);
    expect(frames[0].roleScales!.x!.domain()).toEqual(frames[1].roleScales!.x!.domain());
    for (const frame of frames) {
      const scale = frame.roleScales!.x!;
      expect(scale.coordinate(0) - scale.range()[0]).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(scale.range()[1] - scale.coordinate(10)).toBeGreaterThanOrEqual(10 - 1e-9);
    }
  });

  it.each([
    [2, 13],
    [18, 2],
  ])('尺寸尺度 %j 的输出上界决定最大半径', (start, end) => {
    const scale = framesOf([point(1, 'max-radius', { size: { kind: 'field', value: 'x', scale: 'size' } })], {
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'sqrt', name: 'size', range: [start, end] },
      ],
    })[0].roleScales!.x!;
    expect(scale.coordinate(0) - scale.range()[0]).toBeCloseTo(Math.max(start, end));
  });

  it.each(['max-radius', 'point-aware'])('%s 保留方向净空、反向轴和显式零', strategy => {
    const frame = framesOf([point(10, { kind: strategy, clearance: { default: 8, x: 12, left: 0, top: 20 } })], {
      scales: [
        { type: 'linear', name: 'x', range: [200, 0] },
        { type: 'linear', name: 'y', range: [0, 200] },
      ],
    })[0];
    const x = frame.roleScales!.x!;
    const y = frame.roleScales!.y!;
    expect(200 - x.coordinate(0)).toBeCloseTo(22, 1);
    expect(x.coordinate(10)).toBeCloseTo(10, 1);
    expect(y.coordinate(0)).toBeCloseTo(30, 1);
    expect(200 - y.coordinate(10)).toBeCloseTo(18, 1);
  });

  it('Relation 只在启用策略时保护实际端点节点', () => {
    const relation = {
      type: 'relation',
      source: { project: { x: 'x', y: 'y' } },
      target: { project: { x: 'x', y: 'y' } },
      endpoints: {
        source: { size: { kind: 'constant', value: 8 } },
        target: { size: { kind: 'constant', value: 15 } },
      },
    };
    const off = framesOf([relation])[0].roleScales!.x!;
    expect(off.coordinate(0)).toBe(off.range()[0]);
    const on = framesOf([{ ...relation, autoPadding: 'max-radius' }])[0].roleScales!.x!;
    expect(on.coordinate(0) - on.range()[0]).toBeCloseTo(15);
  });

  it('无法确定尺寸上界时由 Plot 报错，显式尺度覆盖可跳过自动计算', () => {
    expect(() => framesOf([point(-1)])).toThrow();
    const mark = point(1, 'max-radius', { size: { kind: 'field', value: 'x', scale: 'unknown' } });
    expect(() => framesOf([mark])).toThrow(/radius upper bound/);
    expect(() =>
      framesOf([point(1, 'max-radius', { size: { kind: 'field', value: 'x', scale: 'size' } })], {
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
          { type: 'sqrt', name: 'size', range: [5, Infinity] },
        ],
      }),
    ).toThrow();
  });

  it('独立坐标视图的不同尺度不借用半径', () => {
    const frames = framesOf([point(4), point(20, 'max-radius', { coordinateView: 'overlay' })], {
      coordinate: undefined,
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'linear', name: 'otherX' },
        { type: 'linear', name: 'otherY' },
      ],
      composition: {
        defaultView: 'root',
        views: [
          { id: 'root', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } },
          {
            id: 'overlay',
            coordinate: { type: 'cartesian2D', x: 'otherX', y: 'otherY' },
            placement: { kind: 'overlay', target: 'root' },
          },
        ],
      },
    });
    expect(frames).toHaveLength(2);
    for (const [index, radius] of [4, 20].entries()) {
      const scale = frames[index].roleScales!.x!;
      expect(scale.coordinate(0) - scale.range()[0]).toBeCloseTo(radius);
    }
  });

  it('同一尺度定义用于两个角色时保留各自的方向与范围', () => {
    const frame = framesOf([point(10)], {
      coordinate: { type: 'cartesian2D', x: 'shared', y: 'shared' },
      scales: [{ type: 'linear', name: 'shared' }],
    })[0];
    const x = frame.roleScales!.x!;
    const y = frame.roleScales!.y!;
    expect(x.range()[1]).toBeGreaterThan(x.range()[0]);
    expect(y.range()[0]).toBeGreaterThan(y.range()[1]);
    expect(x.coordinate(0) - x.range()[0]).toBeCloseTo(10);
    expect(y.range()[0] - y.coordinate(0)).toBeCloseTo(10);
  });

  it.each(['max-radius', 'point-aware'])('%s 字符串与零净空对象具有相同映射', kind => {
    expect(resolveFrame(kind).roleScales!.x!.domain()).toEqual(
      resolveFrame({ kind, clearance: 0 }).roleScales!.x!.domain(),
    );
  });

  it('默认策略与显式关闭可以 JSON 往返', () => {
    expect(PointMarkSchema.parse({ type: 'point', encoding: {} }).autoPadding).toBe('max-radius');
    const strategy = { kind: 'point-aware', clearance: { left: 0, default: 8 } };
    expect(PointAutoPaddingSchema.parse(JSON.parse(JSON.stringify(strategy)))).toEqual(strategy);
    expect(PointAutoPaddingSchema.parse(false)).toBe(false);
    expect(PointAutoPaddingSchema.safeParse({ kind: 'max-radius', clearance: -1 }).success).toBe(false);
  });

  it('默认按半径保护两端', () => {
    const scale = resolveFrame().roleScales!.x!;
    const [start, end] = scale.range();
    expect(scale.coordinate(0) - start).toBeCloseTo(10);
    expect(end - scale.coordinate(10)).toBeCloseTo(10);
  });

  it('图元关闭与显式尺度零均不补留白', () => {
    for (const frame of [resolveFrame(false), resolveFrame(undefined, 0)]) {
      const scale = frame.roleScales!.x!;
      expect(scale.coordinate(0)).toBeCloseTo(scale.range()[0]);
      expect(scale.coordinate(10)).toBeCloseTo(scale.range()[1]);
    }
  });

  it('没有显式图元 id 也可逐点保护并增加净空', () => {
    const scale = resolveFrame({ kind: 'point-aware', clearance: 4 }).roleScales!.x!;
    expect(scale.coordinate(0) - scale.range()[0]).toBeGreaterThanOrEqual(14);
    expect(scale.range()[1] - scale.coordinate(10)).toBeGreaterThanOrEqual(14);
  });

  it('range 缺省端自动补齐而 ratio 缺省端保持零', () => {
    const range = resolveFrame(undefined, { lower: 0 }).roleScales!.x!;
    expect(range.coordinate(0)).toBeCloseTo(range.range()[0]);
    expect(range.range()[1] - range.coordinate(10)).toBeCloseTo(10);
    const upper = resolveFrame(undefined, { upper: 0 }).roleScales!.x!;
    expect(upper.coordinate(10)).toBeCloseTo(upper.range()[1]);
    expect(upper.coordinate(0) - upper.range()[0]).toBeCloseTo(10);
    const ratio = resolveFrame(undefined, { kind: 'ratio', lower: 0 }).roleScales!.x!;
    expect(ratio.coordinate(10)).toBeCloseTo(ratio.range()[1]);
  });
});
