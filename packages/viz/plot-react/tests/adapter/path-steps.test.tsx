import { DrawWay } from '@retikz/core';
import { normalizePlotPathMark } from '@retikz/plot-vanilla';
import { describe, expect, it } from 'vitest';

import { buildPlotIR, PathMark, PlotPathStep } from '../../src';

describe('Path authoring parity', () => {
  it('preserves ribbon fields and options through Vanilla way and JSX steps', () => {
    const properties = { kind: 'ribbon' as const, ribbon: { align: 'center' as const } };
    const encodings = { ribbon: { width: 'flow' } };
    const plain = normalizePlotPathMark({
      way: [
        [0, 0],
        [100, 50],
      ],
      properties,
      encodings,
    });
    const react = buildPlotIR(
      <PathMark properties={properties} encodings={encodings}>
        <PlotPathStep kind="move" to={[0, 0]} />
        <PlotPathStep kind="line" to={[100, 50]} />
      </PathMark>,
      'data',
    );
    expect(react.marks[0]).toMatchObject({ type: 'path', ...plain });
  });
  it('preserves field targets and yields equivalent Vanilla, way and JSX steps', () => {
    const from = { mark: 'nodes', key: { field: 'source' } };
    const to = { mark: 'nodes', key: { field: 'target' } };
    const plain = normalizePlotPathMark({ way: [from, DrawWay.Hvh, to], arrow: '->' });
    const viaWay = buildPlotIR(<PathMark way={[from, DrawWay.Hvh, to]} arrow="->" />, 'data');
    const viaChildren = buildPlotIR(
      <PathMark arrow="->">
        <PlotPathStep kind="move" to={from} />
        <PlotPathStep kind="fold" via="-|-" to={to} />
      </PathMark>,
      'data',
    );
    expect(viaWay.marks[0].encodings).toEqual(plain.encodings);
    expect(viaChildren.marks[0]).toEqual(viaWay.marks[0]);
    expect(viaWay.marks[0]).toMatchObject({ properties: { marks: [{ pos: 1, mark: { kind: 'arrow' } }] } });
    expect(JSON.stringify(viaChildren)).not.toContain('children');
  });

  it('rejects standalone steps and unrelated path children', () => {
    expect(() => buildPlotIR(<PlotPathStep kind="cycle" />, 'data')).toThrow(/inside PathMark/);
    expect(() =>
      buildPlotIR(
        <PathMark>
          <div />
        </PathMark>,
        'data',
      ),
    ).toThrow(/PlotPathStep/);
  });

  it('keeps control point fields and explicit generator parameters intact', () => {
    const control = { x: { field: 'cx' }, y: { field: 'cy' } };
    const normalized = normalizePlotPathMark({ way: [[0, 0], { curve: control }, [10, 20]] });
    expect(normalized.encodings.steps?.[1]).toEqual({ kind: 'curve', to: [10, 20], control });
    const generated = buildPlotIR(
      <PathMark>
        <PlotPathStep kind="move" to={[0, 0]} />
        <PlotPathStep kind="generator" name="custom" params={{ field: 'opaque' }} />
      </PathMark>,
      'data',
    );
    expect(generated.marks[0].encodings?.steps).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'generator', name: 'custom', params: { field: 'opaque' } },
    ]);
  });
});
