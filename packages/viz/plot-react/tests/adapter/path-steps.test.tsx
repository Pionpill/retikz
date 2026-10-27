import { normalizePlotPathMark } from '@retikz/plot-vanilla';
import { DrawWay } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { buildPlotIR, PathMark, PlotPathStep } from '../../src';

describe('Path 编写等价性', () => {
  it('通过 Vanilla 方式和 JSX 步骤保留功能区字段和选项', () => {
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
  it('保留现场目标并产生等效的 Vanilla、方式和 JSX 步骤', () => {
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
    expect(viaWay.marks[0]).toMatchObject({ properties: { arrow: { end: {} } } });
    expect(JSON.stringify(viaChildren)).not.toContain('children');
  });

  it('拒绝独立步骤和不相关的子路径', () => {
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

  it('保持控制点字段完整', () => {
    const control = { x: { field: 'cx' }, y: { field: 'cy' } };
    const normalized = normalizePlotPathMark({ way: [[0, 0], { curve: control }, [10, 20]] });
    expect(normalized.encodings.steps?.[1]).toEqual({ kind: 'curve', to: [10, 20], control });
  });
});
