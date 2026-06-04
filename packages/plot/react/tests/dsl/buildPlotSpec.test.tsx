import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '@retikz/plot';
import { buildPlotSpec } from '../../src/dsl/buildPlotSpec';
import { Axis } from '../../src/dsl/guides';
import { LineMark, PointMark } from '../../src/dsl/marks';

describe('buildPlotSpec 装配（ADR-08 / ADR-05）', () => {
  it('单 line：装配出等价手写 PlotSpec（含默认 guides）', () => {
    const spec = buildPlotSpec(<LineMark x="month" y="revenue" order="month" />, '__plot');
    const expected: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { ref: '__plot' },
      scales: [
        { type: 'linear', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      marks: [{ type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y', grid: true },
      ],
    };
    expect(spec).toEqual(expected);
  });

  it('单 point：marks 等价手写', () => {
    const spec = buildPlotSpec(<PointMark x="month" y="revenue" />, '__plot');
    expect(spec.marks).toEqual([{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }]);
  });

  it('line + point 叠加：marks 两项、共享 scales/coordinate', () => {
    const spec = buildPlotSpec(
      <>
        <LineMark x="m" y="r" />
        <PointMark x="m" y="r" />
      </>,
      '__plot',
    );
    expect(spec.marks).toHaveLength(2);
    expect(spec.marks[0]?.type).toBe('line');
    expect(spec.marks[1]?.type).toBe('point');
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
  });

  it('装配产物是合法 IR（过 PlotSpecSchema）', () => {
    const spec = buildPlotSpec(<LineMark x="m" y="r" />, '__plot');
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('忽略非 mark 子节点（裸文本等）', () => {
    const spec = buildPlotSpec(
      <>
        hello
        <LineMark x="m" y="r" />
      </>,
      '__plot',
    );
    expect(spec.marks).toHaveLength(1);
  });

  it('无 mark 子节点 → marks 为空 → PlotSpecSchema(.min(1)) 拒绝', () => {
    const spec = buildPlotSpec(<></>, '__plot');
    expect(spec.marks).toHaveLength(0);
    expect(() => PlotSpecSchema.parse(spec)).toThrow();
  });

  // ADR-05：guide 装配（默认 / 显式 / bare）
  it('dsl_default_guides：无 <Axis> → 默认全套（x 轴 + y 轴带网格）', () => {
    const spec = buildPlotSpec(<LineMark x="m" y="r" />, '__plot');
    expect(spec.guides).toEqual([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
    ]);
  });

  it('dsl_explicit_axis_only：写 <Axis dimension="x"/> → 仅该轴（显式所得、无默认）', () => {
    const spec = buildPlotSpec(
      <>
        <LineMark x="m" y="r" />
        <Axis dimension="x" />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'x' }]);
  });

  it('dsl_axis_fields：<Axis> 字段逐一落位（含 grid）', () => {
    const spec = buildPlotSpec(
      <>
        <LineMark x="m" y="r" />
        <Axis dimension="y" tickCount={5} tickLabels={false} grid id="yA" />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([
      { type: 'axis', dimension: 'y', tickCount: 5, tickLabels: false, grid: true, id: 'yA' },
    ]);
  });

  it('dsl_axis_with_grid：<Axis dimension="y" grid/> → grid:true', () => {
    const spec = buildPlotSpec(
      <>
        <LineMark x="m" y="r" />
        <Axis dimension="y" grid />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'y', grid: true }]);
  });

  it('dsl_bare_empty_guides：bare → guides:[]', () => {
    const spec = buildPlotSpec(<LineMark x="m" y="r" />, '__plot', { bare: true });
    expect(spec.guides).toEqual([]);
  });

  it('dsl_bare_ignores_axis：bare 优先，忽略 <Axis>', () => {
    const spec = buildPlotSpec(
      <>
        <LineMark x="m" y="r" />
        <Axis dimension="x" />
      </>,
      '__plot',
      { bare: true },
    );
    expect(spec.guides).toEqual([]);
  });

  it('dsl_built_guides_pass_schema：默认装配产物过 PlotSpecSchema', () => {
    const spec = buildPlotSpec(<LineMark x="m" y="r" />, '__plot');
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('dsl_axis_bad_dim_type：非法 dimension 经 PlotSpecSchema 被拒', () => {
    const spec = buildPlotSpec(
      <>
        <LineMark x="m" y="r" />
        {/* @ts-expect-error 故意传非法 dimension，验证装配产物被 schema 拒 */}
        <Axis dimension="z" />
      </>,
      '__plot',
    );
    expect(() => PlotSpecSchema.parse(spec)).toThrow();
  });
});
