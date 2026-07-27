import { PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { IntervalMark } from '../../../src/components/marks';
import { Scale } from '../../../src/components/scales';

describe('buildPlotSpec heatmap interval mark（ADR-02 双 band，显式 bounds）', () => {
  const bandBounds = { x: { kind: 'band' }, y: { kind: 'band' } } as const;

  it('heatmap-react-build-plot-spec：显式双 band bounds → interval IR + 双 band 推断', () => {
    const spec = buildPlotSpec(<IntervalMark x="rowKey" y="colKey" color="value" bounds={bandBounds} />, '__plot');
    expect(spec.marks).toEqual([
      {
        type: 'interval',
        bounds: { x: { kind: 'band' }, y: { kind: 'band' } },
        encoding: { x: { field: 'rowKey' }, y: { field: 'colKey' }, color: { field: 'value', scale: '__color' } },
      },
    ]);
    // band×band bounds → x / y 双轴强制 band scale
    expect(spec.scales).toContainEqual({ type: 'band', name: '__x' });
    expect(spec.scales).toContainEqual({ type: 'band', name: '__y' });
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
  });

  it('heatmap 缺 color → 纯网格（无 color 编码），仍双 band', () => {
    const spec = buildPlotSpec(<IntervalMark x="day" y="hour" bounds={bandBounds} />, '__plot');
    expect(spec.marks[0]).toEqual({
      type: 'interval',
      bounds: { x: { kind: 'band' }, y: { kind: 'band' } },
      encoding: { x: { field: 'day' }, y: { field: 'hour' } },
    });
    expect(spec.scales).toContainEqual({ type: 'band', name: '__x' });
    expect(spec.scales).toContainEqual({ type: 'band', name: '__y' });
  });

  it('heatmap_explicit_band_scale_forwards_padding_on_forced_dimension', () => {
    const spec = buildPlotSpec(
      <>
        <IntervalMark x="rowKey" y="colKey" bounds={bandBounds} />
        <Scale dimension="y" type="band" paddingInner={0.2} paddingOuter={0} />
      </>,
      '__plot',
    );

    expect(spec.scales).toContainEqual({
      type: 'band',
      name: '__y',
      paddingInner: 0.2,
      paddingOuter: 0,
    });
  });

  it('heatmap + 显式 <Scale dimension="y"> → fail-loud（y 由 band bounds 强制 band）', () => {
    expect(() =>
      buildPlotSpec(
        <>
          <IntervalMark x="rowKey" y="colKey" color="value" bounds={bandBounds} />
          <Scale dimension="y" type="linear" />
        </>,
        '__plot',
      ),
    ).toThrow(/band y scale/i);
  });

  it('heatmap 装配产物过 PlotSpecSchema', () => {
    const spec = buildPlotSpec(<IntervalMark x="rowKey" y="colKey" color="value" bounds={bandBounds} />, '__plot');
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });
});
