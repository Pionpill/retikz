import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import { resolveScaleRegistry } from '../../../src/providers/scale';
import { LinearScaleSchema, PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const rows = [
  { x: 0, y: 0, r: 2 },
  { x: 5, y: 5, r: 30 },
  { x: 10, y: 10, r: 2 },
];

/** 用例尺寸尺度将平方根映射到半径范围 */
const radiusOf = (value: number) => 2 + ((Math.sqrt(value) - Math.sqrt(2)) / (Math.sqrt(30) - Math.sqrt(2))) * 28;

const pointPositions = (scope: IRScope): Array<[number, number]> =>
  scope.children.flatMap(child => {
    if (child.type === 'scope' && 'children' in child) return pointPositions(child as IRScope);
    if (child.type === 'node' && 'position' in child) return [(child as IRNode).position as [number, number]];
    return [];
  });

const plotOf = (padding: unknown = { kind: 'mark', marks: ['dots'] }, guides: Array<unknown> = []) =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    width: 100,
    height: 100,
    data: { reference: 'rows' },
    scales: [
      { type: 'linear', name: 'x', domainPadding: padding },
      { type: 'linear', name: 'y', domainPadding: padding },
      { type: 'sqrt', name: 'size', domain: [2, 30], range: [2, 30] },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    guides,
    marks: [
      {
        id: 'dots',
        type: 'point',
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, size: { field: 'r', scale: 'size' } },
      },
    ],
  });

describe('mark padding 编译闭环', () => {
  it('实际 size 映射和最终 frame 使用紧凑留白', () => {
    const result = lowerPlotWithDataArtifact(plotOf(), { rows }, { textMeasurer: measureLabel });
    const frame = [...result.dataArtifact.frameByCoordinateScopeId.values()][0];
    const scale = frame.roleScales?.x;

    expect(scale).toBeDefined();

    const [left, right] = scale!.range();

    expect(scale!.coordinate(0) - left).toBeGreaterThanOrEqual(2);
    expect(scale!.coordinate(0) - left).toBeLessThan(2.1);
    expect(right - scale!.coordinate(10)).toBeGreaterThanOrEqual(2);
    expect(scale!.coordinate(5) - left).toBeGreaterThanOrEqual(30);
    expect(right - scale!.coordinate(5)).toBeGreaterThanOrEqual(30);
  });

  it('未知 mark 不回退', () => {
    expect(() =>
      lowerPlotWithDataArtifact(plotOf({ kind: 'mark', marks: ['missing'] }), { rows }, { textMeasurer: measureLabel }),
    ).toThrow(/missing/);
  });

  it('非法 schema 保留诊断', () => {
    expect(() => plotOf({ kind: 'mark', marks: [] })).toThrow();
    expect(() => plotOf({ kind: 'mark', marks: ['dots', 'dots'] })).toThrow();
  });
});

describe('共享标记填充', () => {
  it.each(['linear', 'radial'])('在具有不同参考线的小平面面板上共享一个填充的 %s 域', type => {
    const base = plotOf({ kind: 'mark', marks: ['dots'], clearance: { lower: 8, upper: 15 } });
    const { coordinate, ...rest } = base;
    const spec = PlotSchema.parse({
      ...rest,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, type } : scale)),
      width: 640,
      height: 300,
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y' },
      ],
      composition: {
        defaultView: 'root',
        views: [{ id: 'root', coordinate }],
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
    });
    const data = [
      ...rows.map(row => ({ ...row, group: 'A' })),
      ...rows.map(row => ({ ...row, y: row.y * 100000, group: 'B' })),
    ];
    const result = lowerPlotWithDataArtifact(spec, { rows: data }, { textMeasurer: measureLabel });
    const frames = [...result.dataArtifact.frameByCoordinateScopeId.values()].slice(1);

    expect(frames.length).toBeGreaterThanOrEqual(2);

    const domains = frames.map(frame => frame.roleScales?.x?.domain());

    expect(domains.every(domain => JSON.stringify(domain) === JSON.stringify(domains[0]))).toBe(true);

    for (const frame of frames) {
      const scale = frame.roleScales!.x!;

      expect(scale.coordinate(0) - scale.range()[0]).toBeGreaterThanOrEqual(10);
      expect(scale.range()[1] - scale.coordinate(10)).toBeGreaterThanOrEqual(17);
    }

    expect(frames[0].roleScales!.y!.domain()).not.toEqual(frames[1].roleScales!.y!.domain());
  });

  it.each(['log', 'pow', 'sqrt', 'symlog', 'radial'])('使用 %s 位置映射保护字形', type => {
    const base = plotOf();
    const spec = PlotSchema.parse({
      ...base,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, type, domain: [1, 10] } : scale)),
    });
    const data = [{ x: 1, y: 0, r: 2 }, rows[1], rows[2]];
    const result = lowerPlotWithDataArtifact(spec, { rows: data }, { textMeasurer: measureLabel });
    const frame = [...result.dataArtifact.frameByCoordinateScopeId.values()][0];
    const scale = frame.roleScales!.x!;

    for (const row of data) {
      expect(scale.coordinate(row.x) - scale.range()[0]).toBeGreaterThanOrEqual(radiusOf(row.r));
      expect(scale.range()[1] - scale.coordinate(row.x)).toBeGreaterThanOrEqual(radiusOf(row.r));
    }
  });
});

describe('标记填充最终几何形状', () => {
  it.each(['sqrt', 'pow'])('保持 %s 域有效为零，同时保留边缘空间', type => {
    const base = plotOf();
    const spec = PlotSchema.parse({
      ...base,
      scales: base.scales.map(scale =>
        scale.name === 'x' ? { ...scale, type, ...(type === 'pow' ? { exponent: 0.7 } : {}), domain: [0, 10] } : scale,
      ),
    });
    const scale = [
      ...lowerPlotWithDataArtifact(
        spec,
        { rows },
        { textMeasurer: measureLabel },
      ).dataArtifact.frameByCoordinateScopeId.values(),
    ][0].roleScales!.x!;

    expect(scale.domain()[0]).toBe(0);
    expect(scale.ticks().values.every(value => typeof value === 'number' && value >= 0)).toBe(true);
    expect(scale.coordinate(0) - scale.range()[0]).toBeGreaterThanOrEqual(2);
  });

  it.each(['log', 'radial'])('通过方向间隙保护反向 %s 范围', type => {
    const base = plotOf({ kind: 'mark', marks: ['dots'], clearance: { lower: 3, upper: 9 } });
    const data = [{ x: 1, y: 0, r: 2 }, rows[1], rows[2]];
    const spec = PlotSchema.parse({
      ...base,
      scales: base.scales.map(scale =>
        scale.name === 'x' ? { ...scale, type, range: [100, 0], domain: [1, 10] } : scale,
      ),
    });
    const scale = [
      ...lowerPlotWithDataArtifact(
        spec,
        { rows: data },
        { textMeasurer: measureLabel },
      ).dataArtifact.frameByCoordinateScopeId.values(),
    ][0].roleScales!.x!;

    for (const row of data) {
      expect(100 - scale.coordinate(row.x)).toBeGreaterThanOrEqual(radiusOf(row.r) + 3);
      expect(scale.coordinate(row.x)).toBeGreaterThanOrEqual(radiusOf(row.r) + 9);
    }
  });

  it('使用径向刻度和屏幕单元间隙保护两个环形边界', () => {
    const base = plotOf({ kind: 'mark', marks: ['dots'], clearance: 4 });
    const spec = PlotSchema.parse({
      ...base,
      width: 400,
      height: 400,
      scales: base.scales.map(scale => (scale.name === 'y' ? { ...scale, type: 'radial' } : scale)),
      coordinate: { type: 'polar2D', angle: 'x', radius: 'y', innerRadius: 0.3 },
    });
    const scale = [
      ...lowerPlotWithDataArtifact(
        spec,
        { rows },
        { textMeasurer: measureLabel },
      ).dataArtifact.frameByCoordinateScopeId.values(),
    ][0].roleScales!.y!;

    for (const row of rows) {
      expect(scale.coordinate(row.y) - scale.range()[0]).toBeGreaterThanOrEqual(radiusOf(row.r) + 4);
      expect(scale.range()[1] - scale.coordinate(row.y)).toBeGreaterThanOrEqual(radiusOf(row.r) + 4);
    }
  });

  it.each(['band', 'point'])('保护分类 %s 边缘而不更改类别顺序', type => {
    const base = plotOf();
    const data = [
      { x: 'a', y: 0, r: 12 },
      { x: 'b', y: 5, r: 30 },
      { x: 'c', y: 10, r: 8 },
    ];
    const spec = PlotSchema.parse({
      ...base,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, type } : scale)),
    });
    const frame = [
      ...lowerPlotWithDataArtifact(
        spec,
        { rows: data },
        { textMeasurer: measureLabel },
      ).dataArtifact.frameByCoordinateScopeId.values(),
    ][0];
    const scale = frame.roleScales!.x!;

    expect(scale.domain()).toEqual(['a', 'b', 'c']);

    for (const row of data) {
      expect(scale.coordinate(row.x) - scale.range()[0]).toBeGreaterThanOrEqual(radiusOf(row.r));
      expect(scale.range()[1] - scale.coordinate(row.x)).toBeGreaterThanOrEqual(radiusOf(row.r));
    }
  });

  it.each([360, 90, -90, 270])('保护 %s 度扫描的极边界', endAngle => {
    const base = plotOf();
    const spec = PlotSchema.parse({
      ...base,
      width: 300,
      height: 300,
      coordinate: { type: 'polar2D', angle: 'x', radius: 'y', startAngle: 0, endAngle },
    });
    const frame = [
      ...lowerPlotWithDataArtifact(
        spec,
        { rows },
        { textMeasurer: measureLabel },
      ).dataArtifact.frameByCoordinateScopeId.values(),
    ][0];
    const radial = frame.roleScales!.y!;
    const angular = frame.roleScales!.x!;

    for (const row of rows) {
      const radius = radial.coordinate(row.y);

      expect(radial.range()[1] - radius).toBeGreaterThanOrEqual(radiusOf(row.r));

      if (endAngle !== 360) {
        const angle = (Math.abs(angular.coordinate(row.x)) * Math.PI) / 180;
        const sweep = (Math.abs(endAngle) * Math.PI) / 180;

        expect(radius * Math.sin(Math.min(Math.PI / 2, angle))).toBeGreaterThanOrEqual(radiusOf(row.r) - 1e-10);
        expect(radius * Math.sin(Math.min(Math.PI / 2, sweep - angle))).toBeGreaterThanOrEqual(radiusOf(row.r) - 1e-10);
      }
    }

    if (endAngle === 360) expect(angular.domain()).toEqual([0, 10]);
  });

  it('在其弦边界内包含离散极点', () => {
    const base = plotOf({ kind: 'mark', marks: ['dots'], clearance: 3 });
    const data = ['a', 'b', 'c', 'd'].map((x, index) => ({ x, y: index * 3, r: 8 }));
    const spec = PlotSchema.parse({
      ...base,
      width: 400,
      height: 400,
      coordinate: { type: 'polar2D', angle: 'x', radius: 'y' },
      scales: base.scales.map(scale =>
        scale.name === 'x' ? { ...scale, type: 'band', paddingInner: 0, paddingOuter: 0 } : scale,
      ),
    });
    const frame = [
      ...lowerPlotWithDataArtifact(
        spec,
        { rows: data },
        { textMeasurer: measureLabel },
      ).dataArtifact.frameByCoordinateScopeId.values(),
    ][0];
    const radial = frame.roleScales!.y!;

    for (const row of data) {
      const mapped = frame.mapRoles!([row.x, row.y])!;
      const extent = frame.placementBoundary!.glyphExtentInRoleUnits('y', mapped, radiusOf(row.r) + 3)!;

      expect(radial.range()[1] - mapped[1]).toBeGreaterThanOrEqual(extent);
    }

    expect(frame.roleScales!.x!.domain()).toEqual(data.map(row => row.x));
  });

  const frameOf = (spec: unknown, data = rows) =>
    [
      ...lowerPlotWithDataArtifact(
        PlotSchema.parse(spec),
        {
          rows: data,
        },
        { textMeasurer: measureLabel },
      ).dataArtifact.frameByCoordinateScopeId.values(),
    ][0];

  it('保留固定零端，同时保护另一端', () => {
    const scale = frameOf(plotOf({ kind: 'mark', marks: ['dots'], lower: 0 })).roleScales!.x!;
    const [start, end] = scale.range();

    expect(scale.coordinate(0)).toBe(start);
    expect(end - scale.coordinate(10)).toBeGreaterThanOrEqual(2);
  });

  it('忽略域外目标而不过滤渲染数据', () => {
    const base = plotOf();
    const spec = {
      ...base,
      scales: base.scales.map(scale =>
        scale.name === 'x' || scale.name === 'y' ? { ...scale, domain: [0, 10] } : scale,
      ),
    };
    const outside = [...rows, { x: -1, y: 5, r: 30 }];

    expect(frameOf(spec, outside).roleScales!.x!.domain()).toEqual(frameOf(spec).roleScales!.x!.domain());
    expect(
      lowerPlotWithDataArtifact(PlotSchema.parse(spec), { rows: outside }, { textMeasurer: measureLabel }).dataArtifact,
    ).toBeDefined();
  });

  it('重新计算更改的绘图区域的几何图形', () => {
    const base = plotOf();
    const narrow = frameOf(base).roleScales!.x!;
    const wide = frameOf({ ...base, width: 300 }).roleScales!.x!;

    expect(wide.domain()).not.toEqual(narrow.domain());
    expect(wide.coordinate(0) - wide.range()[0]).toBeGreaterThanOrEqual(2);
    expect(wide.coordinate(0) - wide.range()[0]).toBeLessThan(2.02);
  });

  it('保留低于一毫秒的小数时间填充', () => {
    const base = plotOf();
    const spec = {
      ...base,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, type: 'time', domain: [0, 10] } : scale)),
    };
    const scale = frameOf(spec).roleScales!.x!;

    expect(scale.tickKind).toBe('time');
    expect(scale.coordinate(0) - scale.range()[0]).toBeGreaterThanOrEqual(2);
    expect(scale.range()[1] - scale.coordinate(10)).toBeGreaterThanOrEqual(2);
  });

  it('对反向范围保持与方向无关的保护', () => {
    const base = plotOf();
    const spec = {
      ...base,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, range: [100, 0] } : scale)),
    };
    const scale = frameOf(spec).roleScales!.x!;

    expect(Math.abs(scale.coordinate(0) - scale.range()[0])).toBeGreaterThanOrEqual(2);
    expect(Math.abs(scale.coordinate(10) - scale.range()[1])).toBeGreaterThanOrEqual(2);
  });

  it('为空的可见样本集不添加填充', () => {
    const base = plotOf({ kind: 'mark', marks: ['dots'], clearance: 80 });
    const spec = {
      ...base,
      scales: base.scales.map(scale =>
        scale.name === 'x' || scale.name === 'y' ? { ...scale, domain: [0, 10] } : scale,
      ),
    };

    expect(frameOf(spec, []).roleScales!.x!.domain()).toEqual([0, 10]);
  });

  it('报告不可能的范围，而不是渲染剪裁的自动边缘', () => {
    expect(() => frameOf({ ...plotOf(), width: 40 })).toThrow(/feasible/);
  });
});

describe('标记填充功能', () => {
  it('通过秤注册表调度带有内置标记的自定义秤', () => {
    const linear = resolveScaleRegistry().get('linear')!;
    const customScale = { ...linear, schema: LinearScaleSchema.extend({ type: literal('custom-affine') }) };
    const base = plotOf();
    const spec = PlotSchema.parse({
      ...base,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, type: 'custom-affine' } : scale)),
    });
    const result = lowerPlotWithDataArtifact(
      spec,
      { rows },
      { definitions: { scales: [customScale] }, textMeasurer: measureLabel },
    );
    const frame = [...result.dataArtifact.frameByCoordinateScopeId.values()][0];
    const scale = frame.roleScales!.x!;

    expect(scale.coordinate(0) - scale.range()[0]).toBeGreaterThanOrEqual(2);
  });

  it.each([
    { span: 4, automatic: false },
    { span: { kind: 'ratio', value: 1 }, automatic: false },
    { span: 4, automatic: true },
    { span: { kind: 'ratio', value: 1 }, automatic: true },
  ])('保护 %j 的实际抖动位置', ({ span, automatic }) => {
    const base = plotOf();
    const spec = PlotSchema.parse({
      ...base,
      width: 180,
      scales: base.scales.map(scale => ({
        ...scale,
        ...(scale.name === 'x' ? { type: 'point', padding: 0 } : {}),
        ...(automatic ? { domainPadding: undefined } : {}),
      })),
      marks: base.marks.map(mark => ({
        ...mark,
        ...(automatic ? { id: undefined } : {}),
        properties: {
          ...(automatic ? { autoPadding: 'point-aware' } : {}),
          placement: { adjustments: [{ kind: 'jitter', role: 'x', span, seed: 1 }] },
        },
      })),
    });
    const result = lowerPlotWithDataArtifact(spec, { rows }, { textMeasurer: measureLabel });
    const scale = [...result.dataArtifact.frameByCoordinateScopeId.values()][0].roleScales!.x!;
    const positions = pointPositions(result.child as IRScope);

    expect(positions).toHaveLength(rows.length);
    expect(positions.some((position, index) => position[0] !== scale.coordinate(rows[index].x))).toBe(true);

    positions.forEach((position, index) => {
      expect(position[0] - scale.range()[0]).toBeGreaterThanOrEqual(radiusOf(rows[index].r));
      expect(scale.range()[1] - position[0]).toBeGreaterThanOrEqual(radiusOf(rows[index].r));
    });
  });
});

describe('标记填充有效观测值', () => {
  it('使用局部变换的位置和大小', () => {
    const base = plotOf();
    const transformed = PlotSchema.parse({
      ...base,
      marks: base.marks.map(mark => ({
        ...mark,
        transforms: [
          {
            operation: {
              kind: 'summarize',
              params: { groupBy: ['x', 'y'], metrics: [{ kind: 'mean', field: 'r', as: 'r' }] },
            },
          },
        ],
      })),
    });
    const duplicateRows = [
      { x: 0, y: 0, r: 2 },
      { x: 0, y: 0, r: 30 },
      { x: 10, y: 10, r: 2 },
    ];
    const compactRows = [
      { x: 0, y: 0, r: 16 },
      { x: 10, y: 10, r: 2 },
    ];
    const domainOf = (spec: ReturnType<typeof plotOf>, data: typeof rows) =>
      [
        ...lowerPlotWithDataArtifact(
          spec,
          { rows: data },
          { textMeasurer: measureLabel },
        ).dataArtifact.frameByCoordinateScopeId.values(),
      ][0].roleScales!.x!.domain();

    expect(domainOf(transformed, duplicateRows)).toEqual(domainOf(base, compactRows));
  });

  it('忽略缺失的位置和映射的大小', () => {
    const base = plotOf();
    const getDomain = (data: Array<Record<string, number | null>>) =>
      [
        ...lowerPlotWithDataArtifact(
          base,
          { rows: data },
          { textMeasurer: measureLabel },
        ).dataArtifact.frameByCoordinateScopeId.values(),
      ][0].roleScales!.x!.domain();

    expect(getDomain([...rows, { x: null, y: 0, r: 30 }, { x: 0, y: 0, r: null }])).toEqual(getDomain(rows));
  });
});

describe('标记填充共享坐标视图', () => {
  it('组合来自使用一个共享比例的覆盖视图的标记', () => {
    const base = plotOf();
    const { coordinate, ...rest } = base;
    const spec = PlotSchema.parse({
      ...rest,
      scales: base.scales.map(scale =>
        scale.name === 'x' ? { ...scale, domainPadding: { kind: 'mark', marks: ['dots', 'overlay-dots'] } } : scale,
      ),
      composition: {
        defaultView: 'root',
        views: [
          { id: 'root', coordinate },
          { id: 'overlay', coordinate, placement: { kind: 'overlay', target: 'root' } },
        ],
      },
      marks: [
        ...base.marks,
        {
          ...base.marks[0],
          id: 'overlay-dots',
          coordinateView: 'overlay',
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { size: 8 },
        },
      ],
    });
    const result = lowerPlotWithDataArtifact(spec, { rows }, { textMeasurer: measureLabel });
    const frames = [...result.dataArtifact.frameByCoordinateScopeId.values()];

    expect(frames.length).toBe(2);
    expect(frames[0].roleScales!.x!.domain()).toEqual(frames[1].roleScales!.x!.domain());

    for (const frame of frames)
      expect(frame.roleScales!.x!.coordinate(0) - frame.roleScales!.x!.range()[0]).toBeGreaterThanOrEqual(8);
  });
});

describe('标记填充间隙', () => {
  it('通过附加间隙保护最终范围并遵循固定的零端', () => {
    const result = lowerPlotWithDataArtifact(
      plotOf({ kind: 'mark', marks: ['dots'], clearance: 8, lower: 0 }),
      {
        rows,
      },
      { textMeasurer: measureLabel },
    );
    const frame = [...result.dataArtifact.frameByCoordinateScopeId.values()][0];
    const scale = frame.roleScales!.x!;

    expect(scale.coordinate(0)).toBe(scale.range()[0]);

    for (const row of rows)
      expect(scale.range()[1] - scale.coordinate(row.x)).toBeGreaterThanOrEqual(radiusOf(row.r) + 8);
  });

  it('拒绝不可能的清关和无效的 JSON 号码', () => {
    expect(() =>
      lowerPlotWithDataArtifact(
        plotOf({ kind: 'mark', marks: ['dots'], clearance: 60 }),
        { rows },
        { textMeasurer: measureLabel },
      ),
    ).toThrow(/feasible/);

    for (const clearance of [-1, Infinity, NaN])
      expect(() => plotOf({ kind: 'mark', marks: ['dots'], clearance })).toThrow();
  });
});

describe('方向标记间隙', () => {
  it('默认省略的间隙端为零并保留固定端', () => {
    const result = lowerPlotWithDataArtifact(
      plotOf({ kind: 'mark', marks: ['dots'], clearance: { upper: 8 }, lower: 0 }),
      { rows },
      { textMeasurer: measureLabel },
    );
    const scale = [...result.dataArtifact.frameByCoordinateScopeId.values()][0].roleScales!.x!;

    expect(scale.coordinate(0)).toBe(scale.range()[0]);
    expect(scale.range()[1] - scale.coordinate(10)).toBeGreaterThanOrEqual(10);
    expect(() => plotOf({ kind: 'mark', marks: ['dots'], clearance: { lower: -1 } })).toThrow();
  });

  it.each([
    [0, 100],
    [100, 0],
  ])('保留范围 %j 的不对称间隙', (start, end) => {
    const base = plotOf({ kind: 'mark', marks: ['dots'], clearance: { lower: 3, upper: 15 } });
    const plot = PlotSchema.parse({
      ...base,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, range: [start, end] } : scale)),
    });
    const result = lowerPlotWithDataArtifact(plot, { rows }, { textMeasurer: measureLabel });
    const scale = [...result.dataArtifact.frameByCoordinateScopeId.values()][0].roleScales!.x!;

    for (const row of rows) {
      expect(Math.abs(scale.coordinate(row.x) - scale.range()[0])).toBeGreaterThanOrEqual(radiusOf(row.r) + 3);
      expect(Math.abs(scale.range()[1] - scale.coordinate(row.x))).toBeGreaterThanOrEqual(radiusOf(row.r) + 15);
    }

    expect(Math.abs(scale.coordinate(0) - scale.range()[0])).toBeLessThan(5.02);
  });
});
