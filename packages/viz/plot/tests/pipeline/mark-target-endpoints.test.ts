import type { CompileWarning, IRChild, IRPath, IRScope, ScenePrimitive } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';

import { lowerPlot } from '../../src/pipeline/expand/lower';
import { PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

const lower = (
  source: Parameters<typeof lowerPlot>[0],
  datasets: Parameters<typeof lowerPlot>[1],
  options: Partial<Parameters<typeof lowerPlot>[2]> = {},
) => lowerPlot(source, datasets, { textMeasurer: measureLabel, ...options });

const rows = [
  { id: 'a', x: 2, y: 3, source: 'a', target: 'b' },
  { id: 'b', x: 8, y: 7, source: 'b', target: 'a' },
];
const nodes = {
  type: 'point',
  id: 'nodes',
  encodings: { anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } } },
  properties: { anchorId: { prefix: 'custom' } },
};
const connection = {
  type: 'path',
  id: 'links',
  encodings: {
    from: { mark: 'nodes', key: { field: 'source' } },
    to: { mark: 'nodes', key: { field: 'target' } },
  },
};
const plot = (marks: Array<unknown>) =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'data' },
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    scales: [
      { type: 'linear', name: 'x', domain: [0, 10], domainPadding: 0 },
      { type: 'linear', name: 'y', domain: [0, 10], domainPadding: 0 },
    ],
    marks,
  });
const paths = (child: IRChild): Array<IRPath> =>
  child.type === 'path' ? [child as IRPath] : child.type === 'scope' ? (child as IRScope).children.flatMap(paths) : [];

const flatten = (items: Array<ScenePrimitive>): Array<ScenePrimitive> =>
  items.flatMap(item => (item.type === 'group' ? flatten(item.children) : [item]));

describe('标记目标连接', () => {
  it('解析步骤目标并拒绝其前向声明，即使对于空数据也是如此', () => {
    const stepped = {
      type: 'path',
      encodings: {
        steps: [
          { kind: 'move', to: connection.encodings.from },
          { kind: 'bend', to: connection.encodings.to, outAngle: 30, inAngle: 150 },
        ],
      },
    };
    const lowered = lower(plot([nodes, stepped]), { data: rows });
    expect(paths(lowered)).toHaveLength(2);
    expect(paths(lowered)[0].children).toMatchObject([
      { kind: 'move', to: { id: 'custom.a' } },
      { kind: 'bend', to: { id: 'custom.b' }, outAngle: 30, inAngle: 150 },
    ]);
    expect(() => compileToScene({ version: 1, type: 'scene', children: [lowered] })).not.toThrow();
    expect(() => lower(plot([stepped, nodes]), { data: [] })).toThrow(/declared before/);
  });
  it('解析目标标识并编译实际几何图形', () => {
    const lowered = lower(plot([nodes, connection]), { data: rows }, { textMeasurer: measureLabel });
    const links = paths(lowered);
    expect(links).toHaveLength(2);
    expect(links[0].children).toMatchObject([
      { kind: 'move', to: { id: 'custom.a' } },
      { kind: 'line', to: { id: 'custom.b' } },
    ]);
    const warnings: Array<CompileWarning> = [];
    const result = compileToScene(
      { version: 1, type: 'scene', children: [lowered] },
      { onWarn: warning => warnings.push(warning) },
    );
    expect(warnings).toEqual([]);
    expect(flatten(result.scene.primitives).filter(item => item.type === 'path')).toHaveLength(2);
  });

  it('拒绝连接后声明的目标', () => {
    expect(() => lower(plot([connection, nodes]), { data: rows }, { textMeasurer: measureLabel })).toThrow(
      /declared before/,
    );
  });

  it('即使数据为空也验证声明顺序', () => {
    expect(() => lower(plot([connection, nodes]), { data: [] })).toThrow(/declared before/);
  });

  it('拒绝重复的声明和目标而不暴露身份', () => {
    expect(() => lower(plot([nodes, nodes, connection]), { data: rows })).toThrow(/Duplicate mark id/);
    const unnamedIdentity = { ...nodes, encodings: { position: nodes.encodings.position }, properties: {} };
    expect(() => lower(plot([unnamedIdentity, connection]), { data: rows })).toThrow(/does not expose anchorId/);
  });

  it('不将整个端点路径视为节点目标', () => {
    const target = {
      type: 'path',
      id: 'nodes',
      encodings: { from: { x: { value: 0 }, y: { value: 0 } }, to: { x: { value: 1 }, y: { value: 1 } } },
      properties: { anchorId: { template: 'a' } },
    };
    expect(() => lower(plot([target, connection]), { data: rows })).toThrow(/whole-path/);
  });

  it('不从身份键推断位置域', () => {
    const spec = plot([nodes, connection]);
    const inferred = { ...spec, scales: spec.scales.map(scale => ({ ...scale, domain: undefined })) };
    const compile = (data: typeof rows) =>
      flatten(
        compileToScene({ type: 'scene', version: 1, children: [lower(inferred, { data })] }).scene.primitives,
      ).filter(item => item.type === 'path');
    const renamed = rows.map(row => ({
      ...row,
      id: row.id === 'a' ? '1000000' : '2000000',
      source: row.source === 'a' ? '1000000' : '2000000',
      target: row.target === 'a' ? '1000000' : '2000000',
    }));
    expect(compile(rows)).toEqual(compile(renamed));
  });

  it('生成一个与数据行数无关的恒定连接', () => {
    const fixed = {
      ...connection,
      encodings: { from: { mark: 'nodes', key: { value: 'a' } }, to: { x: { value: 0 }, y: { value: 0 } } },
    };
    expect(paths(lower(plot([nodes, fixed]), { data: rows }, { textMeasurer: measureLabel }))).toHaveLength(1);
  });

  it('诊断缺失的键而不是回退到坐标', () => {
    const fixed = {
      ...connection,
      encodings: { from: { mark: 'nodes', key: { value: 'missing' } }, to: { x: { value: 0 }, y: { value: 0 } } },
    };
    expect(() => lower(plot([nodes, fixed]), { data: rows }, { textMeasurer: measureLabel })).toThrow(/missing/);
  });

  it('拒绝几何参考的坐标插值', () => {
    expect(() =>
      lower(
        plot([nodes, { ...connection, properties: { connection: 'coordinate' } }]),
        { data: rows },
        { textMeasurer: measureLabel },
      ),
    ).toThrow(/coordinate/);
  });

  it('在行重新排序后保留标识', () => {
    const fixed = {
      ...connection,
      encodings: { from: { mark: 'nodes', key: { value: 'a' } }, to: { mark: 'nodes', key: { value: 'b' } } },
    };
    const compile = (data: typeof rows) =>
      flatten(
        compileToScene({ type: 'scene', version: 1, children: [lower(plot([nodes, fixed]), { data })] }).scene
          .primitives,
      ).filter(item => item.type === 'path');
    expect(compile(rows)).toEqual(compile([...rows].reverse()));
  });

  it('评估目标生成器一次并使用它们返回的键', () => {
    const generator = vi.fn(() => 'generated');
    const target = {
      ...nodes,
      encodings: { position: { x: { value: 2 }, y: { value: 3 } } },
      properties: { anchorId: { generator: 'identity' } },
    };
    const fixed = {
      ...connection,
      encodings: { from: { mark: 'nodes', key: { value: 'generated' } }, to: { x: { value: 0 }, y: { value: 0 } } },
    };
    const lowered = lower(plot([target, fixed]), { data: [] }, { anchorIdGenerators: { identity: generator } });
    expect(generator).toHaveBeenCalledTimes(1);
    expect(paths(lowered)[0].children[0]).toMatchObject({ to: { id: 'generated' } });
  });

  it('使用常量模板标识，而不创建数据行', () => {
    const target = {
      ...nodes,
      encodings: { position: { x: { value: 2 }, y: { value: 3 } } },
      properties: { anchorId: { template: 'fixed' } },
    };
    const fixed = {
      ...connection,
      encodings: { from: { mark: 'nodes', key: { value: 'fixed' } }, to: { x: { value: 0 }, y: { value: 0 } } },
    };
    expect(paths(lower(plot([target, fixed]), { data: [] }))[0].children[0]).toMatchObject({ to: { id: 'fixed' } });
  });

  it.each([null, '', {}, true])('拒绝无效身份数据 %j', id => {
    expect(() => lower(plot([nodes, connection]), { data: [{ ...rows[0], id }] })).toThrow(/key|anchorId/);
  });

  it('拒绝数字/字符串身份冲突', () => {
    expect(() =>
      lower(plot([nodes, connection]), {
        data: [
          { ...rows[0], id: 1 },
          { ...rows[1], id: '1' },
        ],
      }),
    ).toThrow(/duplicate/i);
  });

  it('不注册几何形状缺失的目标', () => {
    expect(() => lower(plot([nodes, connection]), { data: [{ ...rows[0], x: null }, rows[1]] })).toThrow(
      /Missing mark target key/,
    );
  });

  it('引用路径顶点但拒绝其上的形状边界', () => {
    const vertices = { type: 'path', id: 'nodes', encodings: nodes.encodings };
    expect(paths(lower(plot([vertices, connection]), { data: rows }))).toHaveLength(3);
    const bounded = {
      ...connection,
      encodings: { ...connection.encodings, from: { ...connection.encodings.from, boundary: 'shape' } },
    };
    expect(() => lower(plot([vertices, bounded]), { data: rows })).toThrow(/Coordinate target/);
  });

  it('引用区间区域节点', () => {
    const intervals = {
      type: 'interval',
      id: 'nodes',
      encodings: {
        anchorId: 'id',
        bounds: { x: { from: { field: 'x' }, to: { value: 9 } }, y: { from: { value: 0 }, to: { field: 'y' } } },
      },
      properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } } },
    };
    const lowered = lower(plot([intervals, connection]), { data: rows });
    const warnings: Array<CompileWarning> = [];
    compileToScene({ type: 'scene', version: 1, children: [lowered] }, { onWarn: warning => warnings.push(warning) });
    expect(warnings).toEqual([]);
    expect(paths(lowered)).toHaveLength(2);
  });

  it('隔离构面面板中重复的目标身份', () => {
    const source = plot([nodes, connection]);
    const faceted = PlotSchema.parse({
      ...source,
      coordinate: undefined,
      composition: {
        defaultView: 'root',
        views: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
        arrangements: [{ kind: 'facet', id: 'panels', view: 'root', column: { field: 'panel' } }],
      },
    });
    const data = ['left', 'right'].flatMap(panel => rows.map(row => ({ ...row, panel })));
    const lowered = lower(faceted, { data }, { textMeasurer: measureLabel });
    expect(paths(lowered)).toHaveLength(4);
    expect(() =>
      lower(
        faceted,
        { data: data.filter(row => !(row.panel === 'right' && row.id === 'b')) },
        { textMeasurer: measureLabel },
      ),
    ).toThrow(/Missing mark target key/);
  });

  it('不为空结果生成字段绑定连接', () => {
    expect(paths(lower(plot([nodes, connection]), { data: [] }))).toHaveLength(0);
  });
});
