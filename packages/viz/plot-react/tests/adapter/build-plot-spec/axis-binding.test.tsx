import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { PlotAxis } from '../../../src/components/guides';
import { PathMark, PointMark } from '../../../src/components/marks';

describe('buildPlotIR alpha.14 ADR-08 轴结合糖', () => {
  it('React y 轴绑定生成叠加组合', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis dimension="x" title="day" />
        <PlotAxis id="temperature" dimension="y" placement={{ kind: 'side', side: 'left' }} title="Temperature" />
        <PlotAxis id="rainfall" dimension="y" placement={{ kind: 'side', side: 'right' }} title="Rainfall" grid />
        <PathMark
          yAxisId="temperature"
          encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }}
        />
        <PathMark yAxisId="rainfall" encodings={{ position: { x: { field: 'day' }, y: { field: 'rainfall' } } }} />
      </>,
      'weather',
    );

    expect(spec.coordinate).toBeUndefined();
    expect(spec.composition).toEqual({
      defaultView: 'default',
      views: [
        { id: 'default', coordinate: { type: 'cartesian2D', x: '__x', y: '__y.default' } },
        {
          id: 'temperature',
          coordinate: { type: 'cartesian2D', x: '__x', y: '__y.temperature' },
          placement: { kind: 'overlay', target: 'default' },
        },
        {
          id: 'rainfall',
          coordinate: { type: 'cartesian2D', x: '__x', y: '__y.rainfall' },
          placement: { kind: 'overlay', target: 'default' },
        },
      ],
    });
    expect(spec.scales).toEqual([
      { type: 'linear', name: '__x' },
      { type: 'linear', name: '__y.default' },
      { type: 'linear', name: '__y.temperature' },
      { type: 'linear', name: '__y.rainfall' },
    ]);
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'temperature' },
      { type: 'path', coordinateView: 'rainfall' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', id: 'temperature', dimension: 'y', coordinateView: 'temperature' },
      { type: 'axis', id: 'rainfall', dimension: 'y', coordinateView: 'rainfall', grid: true },
    ]);
    expect(JSON.stringify(spec)).not.toContain('yAxisId');
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('当位置推断延迟时，y 轴绑定提供比例', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis dimension="x" title="day" />
        <PlotAxis id="temperature" dimension="y" title="temperature" />
        <PlotAxis id="rainfall" dimension="y" title="rainfall" />
        <PathMark
          yAxisId="temperature"
          encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }}
        />
        <PathMark yAxisId="rainfall" encodings={{ position: { x: { field: 'day' }, y: { field: 'rainfall' } } }} />
      </>,
      'weather',
      { deferPositionScaleInference: true },
    );

    expect(spec.scales).toEqual([
      { type: 'linear', name: '__x' },
      { type: 'linear', name: '__y.default' },
      { type: 'linear', name: '__y.temperature' },
      { type: 'linear', name: '__y.rainfall' },
    ]);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('React x 轴绑定生成叠加组合', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis id="elapsed" dimension="x" placement={{ kind: 'side', side: 'bottom' }} title="elapsed day" />
        <PlotAxis id="date" dimension="x" placement={{ kind: 'side', side: 'top' }} title="date" />
        <PlotAxis dimension="y" title="revenue" />
        <PathMark xAxisId="elapsed" encodings={{ position: { x: { field: 'elapsedDay' }, y: { field: 'revenue' } } }} />
        <PointMark xAxisId="date" encodings={{ position: { x: { field: 'dateIndex' }, y: { field: 'revenue' } } }} />
      </>,
      'schedule',
    );

    expect(spec.coordinate).toBeUndefined();
    expect(spec.composition).toEqual({
      defaultView: 'default',
      views: [
        { id: 'default', coordinate: { type: 'cartesian2D', x: '__x.default', y: '__y' } },
        {
          id: 'elapsed',
          coordinate: { type: 'cartesian2D', x: '__x.elapsed', y: '__y' },
          placement: { kind: 'overlay', target: 'default' },
        },
        {
          id: 'date',
          coordinate: { type: 'cartesian2D', x: '__x.date', y: '__y' },
          placement: { kind: 'overlay', target: 'default' },
        },
      ],
    });
    expect(spec.scales).toEqual([
      { type: 'linear', name: '__x.default' },
      { type: 'linear', name: '__x.elapsed' },
      { type: 'linear', name: '__x.date' },
      { type: 'linear', name: '__y' },
    ]);
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'elapsed' },
      { type: 'point', coordinateView: 'date' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', id: 'elapsed', dimension: 'x', coordinateView: 'elapsed' },
      { type: 'axis', id: 'date', dimension: 'x', coordinateView: 'date' },
      { type: 'axis', dimension: 'y' },
    ]);
    expect(JSON.stringify(spec)).not.toContain('xAxisId');
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('轴绑定省略保留单个坐标', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis dimension="x" />
        <PlotAxis id="temperature" dimension="y" />
        <PathMark encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }} />
      </>,
      'weather',
    );

    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
    expect(spec.composition).toBeUndefined();
  });

  it('没有 y 轴 id 的标记在绑定模式下绑定到默认轴', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis id="temperature" dimension="y" />
        <PlotAxis id="rainfall" dimension="y" />
        <PathMark
          yAxisId="temperature"
          encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }}
        />
        <PointMark encodings={{ position: { x: { field: 'day' }, y: { field: 'label' } } }} />
      </>,
      'weather',
    );

    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'temperature' },
      { type: 'point', coordinateView: 'default' },
    ]);
  });

  it('默认 y 轴 id 绑定到维度默认范围', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis id="rainfall" dimension="y" />
        <PathMark yAxisId="default" encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }} />
        <PathMark yAxisId="rainfall" encodings={{ position: { x: { field: 'day' }, y: { field: 'rainfall' } } }} />
      </>,
      'weather',
    );

    expect(spec.composition).toMatchObject({
      defaultView: 'default',
      views: [
        { id: 'default', coordinate: { y: '__y.default' } },
        { id: 'rainfall', coordinate: { y: '__y.rainfall' }, placement: { kind: 'overlay', target: 'default' } },
      ],
    });
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'default' },
      { type: 'path', coordinateView: 'rainfall' },
    ]);
  });

  it('具有相同命名范围的显式组合接受 y 轴 id', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis id="temperature" dimension="y" />
        <PlotAxis id="rainfall" dimension="y" />
        <PathMark
          yAxisId="temperature"
          encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }}
        />
        <PathMark yAxisId="rainfall" encodings={{ position: { x: { field: 'day' }, y: { field: 'rainfall' } } }} />
      </>,
      'weather',
      {
        composition: {
          defaultView: 'default',
          views: [
            { id: 'default', coordinate: { type: 'cartesian2D' } },
            {
              id: 'temperature',
              coordinate: { type: 'cartesian2D' },
              placement: { kind: 'overlay', target: 'default' },
            },
            { id: 'rainfall', coordinate: { type: 'cartesian2D' }, placement: { kind: 'overlay', target: 'default' } },
          ],
        },
      },
    );

    expect(spec.composition?.defaultView).toBe('default');
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'temperature' },
      { type: 'path', coordinateView: 'rainfall' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', id: 'temperature', coordinateView: 'temperature' },
      { type: 'axis', id: 'rainfall', coordinateView: 'rainfall' },
    ]);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('拒绝无效的 y 轴绑定输入', () => {
    expect(() =>
      buildPlotIR(
        <>
          <PlotAxis id="left" dimension="y" />
          <PathMark yAxisId="missing" encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }} />
        </>,
        'weather',
      ),
    ).toThrow(/missing.*y axis/i);

    expect(() =>
      buildPlotIR(
        <>
          <PlotAxis id="left" dimension="x" />
          <PathMark yAxisId="left" encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }} />
        </>,
        'weather',
      ),
    ).toThrow(/dimension.*y/i);

    expect(() =>
      buildPlotIR(
        <>
          <PlotAxis id="left" dimension="y" />
          <PlotAxis id="left" dimension="y" />
          <PathMark yAxisId="left" encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }} />
        </>,
        'weather',
      ),
    ).toThrow(/duplicate.*axis id/i);

    expect(() =>
      buildPlotIR(
        <>
          <PlotAxis id="left" dimension="y" />
          <PathMark
            coordinateView="left"
            yAxisId="left"
            encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }}
          />
        </>,
        'weather',
      ),
    ).toThrow(/coordinateView.*yAxisId/i);
  });

  it('拒绝在 cartesian2D 外部绑定轴并缺少显式范围', () => {
    expect(() =>
      buildPlotIR(
        <>
          <PlotAxis id="left" dimension="y" />
          <PathMark yAxisId="left" encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }} />
        </>,
        'weather',
        { coordinate: 'polar2D' },
      ),
    ).toThrow(/cartesian2D/i);

    expect(() =>
      buildPlotIR(
        <>
          <PlotAxis id="left" dimension="y" />
          <PathMark yAxisId="left" encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }} />
        </>,
        'weather',
        { composition: { defaultView: 'default', views: [{ id: 'default', coordinate: { type: 'cartesian2D' } }] } },
      ),
    ).toThrow(/left.*view/i);
  });
});
