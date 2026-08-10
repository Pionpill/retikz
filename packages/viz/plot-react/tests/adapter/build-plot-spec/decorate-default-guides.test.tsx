import { PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotSpec, decorateDefaultGuides } from '../../../src/adapter';
import { Axis, Legend } from '../../../src/components/guides';
import { IntervalMark, PathMark, PointMark } from '../../../src/components/marks';

// alpha.10：薄 Plot 退化 + 装饰函数抽出（供 v0.2 chart 复用）
describe('decorateDefaultGuides（薄 Plot 装饰函数，PlotSpec 进出、框架无关）', () => {
  it('decorate_adds_cartesian_axes：cartesian2D 无 axis → 前置 x/y 轴，网格交给 Theme', () => {
    const thin = buildPlotSpec(<PathMark x="m" y="r" />, '__plot');
    expect(thin.guides).toEqual([]);
    expect(decorateDefaultGuides(thin).guides).toEqual([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y' },
    ]);
  });

  it('decorate_keeps_grid_out_of_recipe：装饰产物不固化 grid 风格', () => {
    const decorated = decorateDefaultGuides(buildPlotSpec(<IntervalMark x="m" y="r" />, '__plot'));
    expect(decorated.guides).toEqual([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y' },
    ]);
  });

  it('decorate_keeps_explicit_axis：已有显式 <Axis> → 原样不补', () => {
    const withAxis = buildPlotSpec(
      <>
        <PathMark x="m" y="r" />
        <Axis dimension="x" />
      </>,
      '__plot',
    );
    expect(decorateDefaultGuides(withAxis).guides).toEqual([{ type: 'axis', dimension: 'x' }]);
  });

  it('decorate_prepends_before_legend：只有 legend → 前置默认轴、legend 保留其后', () => {
    const withLegend = buildPlotSpec(
      <>
        <PointMark x="lon" y="lat" color="kind" />
        <Legend channel="color" />
      </>,
      '__plot',
    );
    expect(decorateDefaultGuides(withLegend).guides).toEqual([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y' },
      { type: 'legend', channel: 'color' },
    ]);
  });

  it('decorate_noop_polar：非 cartesian2D（polar）→ 原样返回，不补轴', () => {
    const polar = buildPlotSpec(<IntervalMark angle="value" />, '__plot', { coordinate: 'polar2D' });
    expect(decorateDefaultGuides(polar).guides).toEqual([]);
  });

  it('decorate_pass_schema：装饰产物过 PlotSpecSchema', () => {
    const decorated = decorateDefaultGuides(buildPlotSpec(<PathMark x="m" y="r" />, '__plot'));
    expect(() => PlotSpecSchema.parse(decorated)).not.toThrow();
  });
});
