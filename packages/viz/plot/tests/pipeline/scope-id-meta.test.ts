import type { IRChild, IRNode, IRScope } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { SOURCE_INDEX } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../src/pipeline/expand';
import type { IRPlotSpec } from '../../src/schemas';

import { lowerPlots } from '../../src/pipeline/expand';
import { PlotSpecSchema } from '../../src/schemas';

/**
 * scope-aware id 绑定 + meta 透传。
 * @description 断言 lowerPlots 产物中 core IR Scope / Node / Path 的 id 与 meta。
 *   这些字段由 provenance、datumProvenance、datumIdField 控制；provenance 关闭时不写合成 id/meta
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const expandOf = (spec: IRPlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

/**
 * plot lowered 的内容 scope：承载 mark/guide 层与 provenance meta 的 localNamespace scope。
 * @description 带 id 的 plot 会生成外层 panel scope；无 id 时 outer 自身就是内容 scope
 */
const contentScope = (outer: IRScope): IRScope =>
  outer.id !== undefined && outer.localNamespace !== true ? (outer.children[0] as IRScope) : outer;

/** 取第一个 mark 图层 scope（内容 scope 的第一个子 scope） */
const firstLayer = (spec: IRPlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope =>
  contentScope(expandOf(spec, datasets, options)).children[0] as IRScope;

/** 递归收集 IRChild 树里所有带 meta 的元素（id 一并带出，便于断言） */
const collectMeta = (
  child: IRChild,
  out: Array<{ type: string; id?: string; meta: unknown }> = [],
): Array<{ type: string; id?: string; meta: unknown }> => {
  const anyChild = child as { type: string; id?: string; meta?: unknown; children?: Array<IRChild> };
  if (anyChild.meta !== undefined) out.push({ type: anyChild.type, id: anyChild.id, meta: anyChild.meta });
  if (Array.isArray(anyChild.children)) for (const c of anyChild.children) collectMeta(c, out);
  return out;
};

/** 递归收集 IRChild 树里所有出现的 id（顺序无关，作 anonymous 断言） */
const collectIds = (child: IRChild, out: Array<string> = []): Array<string> => {
  const anyChild = child as { id?: string; children?: Array<IRChild> };
  if (typeof anyChild.id === 'string') out.push(anyChild.id);
  if (Array.isArray(anyChild.children)) for (const c of anyChild.children) collectIds(c, out);
  return out;
};

/** 递归收集 Scene primitive 树里所有带 meta 的图元 */
type ScenePrimLike = { type: string; id?: string; meta?: unknown; children?: Array<ScenePrimLike> };

/** 递归收集 Scene primitive 树里的稳定 id */
const collectSceneIds = (prim: ScenePrimLike, out: Array<string> = []): Array<string> => {
  if (prim.id !== undefined) out.push(prim.id);
  if (Array.isArray(prim.children)) for (const child of prim.children) collectSceneIds(child, out);
  return out;
};

const collectSceneMeta = (
  prim: ScenePrimLike,
  out: Array<{ type: string; meta: unknown }> = [],
): Array<{ type: string; meta: unknown }> => {
  if (prim.meta !== undefined) out.push({ type: prim.type, meta: prim.meta });
  if (Array.isArray(prim.children)) for (const c of prim.children) collectSceneMeta(c, out);
  return out;
};

const opts: LowerPlotsOptions = { width: 480, height: 300 };

const SALES = [
  { month: 0, revenue: 10 },
  { month: 1, revenue: 14 },
  { month: 2, revenue: 9 },
];

/** band-x interval(bar) spec；可带 root id / mark id */
const barSpec = (over: { id?: string; markId?: string } = {}): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    ...(over.id ? { id: over.id } : {}),
    data: { reference: 'sales' },
    scales: [
      { type: 'band', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [
      {
        type: 'interval',
        ...(over.markId ? { id: over.markId } : {}),
        encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
      },
    ],
  });

/** linear point spec；可带 root id */
const pointSpec = (over: { id?: string } = {}): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    ...(over.id ? { id: over.id } : {}),
    data: { reference: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
  });

// =====================================================================
// Happy path
// =====================================================================
describe('scope id/meta — happy path', () => {
  it('root_id_to_scope_id', () => {
    // <Plot id="sales"> + provenance:true → 外层 panel scope.id='sales'，内层 localNamespace 承载内容 meta
    const outer = expandOf(barSpec({ id: 'sales' }), { sales: SALES }, { ...opts, provenance: true });
    expect(outer.type).toBe('scope');
    expect(outer.id).toBe('sales');
    expect(outer.localNamespace).toBeUndefined();
    const inner = outer.children[0] as IRScope;
    expect(inner.localNamespace).toBe(true);
    expect(inner.meta).toEqual({ source: 'plot', dataReference: 'sales' });
    // plotArea carrier 句柄外部可见（localNamespace 之外）
    expect(outer.children.some(c => (c as { id?: string }).id === 'sales.plotArea')).toBe(true);
  });

  it('mark_layer_id_meta', () => {
    // bar mark[0] → 图层 scope.id='sales.mark.0'、meta {source:'plot',layer:'mark',mark:'interval',markIndex:0}
    const layer = firstLayer(barSpec({ id: 'sales' }), { sales: SALES }, { ...opts, provenance: true });
    expect(layer.type).toBe('scope');
    expect(layer.id).toBe('sales.mark.0');
    expect(layer.meta).toEqual({ source: 'plot', layer: 'mark', mark: 'interval', markIndex: 0 });
  });

  it('mark_layer_uses_user_mark_id', () => {
    // 用户给 mark.id='bars' → 用户句柄优先，layer scope.id='sales.bars'
    const layer = firstLayer(barSpec({ id: 'sales', markId: 'bars' }), { sales: SALES }, { ...opts, provenance: true });
    expect(layer.id).toBe('sales.bars');
    expect((layer.meta as { markIndex?: number }).markIndex).toBe(0);
  });

  it('mark_layer_uses_user_mark_id_without_provenance', () => {
    const layer = firstLayer(barSpec({ id: 'sales', markId: 'bars' }), { sales: SALES }, opts);
    expect(layer.id).toBe('sales.bars');
    expect(layer.meta).toBeUndefined();
  });

  it('line_series_scope_id_meta', () => {
    // line 多系列 → 每条 series 形成独立 Scope，稳定 id/meta 落在 series owner 上
    const TREND = [
      { t: 0, v: 1, city: 'X' },
      { t: 1, v: 3, city: 'X' },
      { t: 0, v: 2, city: 'Y' },
      { t: 1, v: 4, city: 'Y' },
    ];
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'trend',
      data: { reference: 't' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'col', range: ['#aa', '#bb'] },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          series: 'city',
          order: 't',
          encoding: { x: { field: 't' }, y: { field: 'v' }, color: { field: 'city', scale: 'col' } },
        },
      ],
    });
    const layer = firstLayer(spec, { t: TREND }, { ...opts, provenance: true });
    const [seriesX, seriesY] = layer.children as Array<IRScope>;
    expect(seriesX.type).toBe('scope');
    expect(seriesX.id).toBe('trend.series.X');
    expect((seriesX.meta as { series?: unknown }).series).toBe('X');
    expect(seriesX.children.every(child => child.type === 'path')).toBe(true);
    expect(seriesY.id).toBe('trend.series.Y');
    expect((seriesY.meta as { series?: unknown }).series).toBe('Y');
    expect(seriesY.children.every(child => child.type === 'path')).toBe(true);
  });

  it('datum_provenance_on', () => {
    // datumProvenance:true → 每个 datum Node 带 meta {source,dataReference,mark,markIndex,transformedIndex,sourceIndex,series?}
    const layer = firstLayer(
      barSpec({ id: 'sales' }),
      { sales: SALES },
      { ...opts, provenance: true, datumProvenance: true },
    );
    const nodes = layer.children as Array<IRNode>;
    expect(nodes).toHaveLength(3);
    for (let index = 0; index < nodes.length; index++) {
      const meta = nodes[index].meta as {
        source?: string;
        dataReference?: string;
        mark?: string;
        markIndex?: number;
        transformedIndex?: number;
        sourceIndex?: number;
      };
      expect(meta.source).toBe('plot');
      expect(meta.dataReference).toBe('sales');
      expect(meta.mark).toBe('interval');
      expect(meta.markIndex).toBe(0);
      expect(meta.transformedIndex).toBe(index);
      // 无 transform → sourceIndex 可回指、等于 transformedIndex
      expect(meta.sourceIndex).toBe(index);
    }
  });
});

// =====================================================================
// 边界
// =====================================================================
describe('scope id/meta — boundary', () => {
  it('provenance_off_byte_identical', () => {
    // 默认（provenance 关）→ lowering 产物不写任何 meta / 合成 id key
    // 用「无 root id / 无 mark id」spec（point + bar）作代表，逐字结构比对 off vs 显式 off
    for (const spec of [pointSpec(), barSpec()]) {
      const withoutOptions = expandOf(spec, { sales: SALES }, opts);
      const explicitOff = expandOf(spec, { sales: SALES }, { ...opts, provenance: false, datumProvenance: false });
      // 两路完全一致（开关默认/显式关皆同一产物）
      expect(withoutOptions).toEqual(explicitOff);
      // 整棵树不得出现任何 meta 或合成 id
      expect(collectMeta(withoutOptions)).toEqual([]);
      expect(collectIds(withoutOptions)).toEqual([]);
    }
  });

  it('provenance_off_polar_byte_identical', () => {
    // polar 代表（sector 饼图）同样：默认关 → 无 meta / 无合成 id
    const pieSpec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      transform: [{ kind: 'stack', y: 'v' }],
      scales: [
        { type: 'linear', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [
        {
          type: 'interval',
          bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
          encoding: { color: { field: 'k' } },
        },
      ],
    });
    const rows = [
      { k: 'A', v: 3 },
      { k: 'B', v: 7 },
    ];
    const off = expandOf(pieSpec, { d: rows }, opts);
    expect(collectMeta(off)).toEqual([]);
    expect(collectIds(off)).toEqual([]);
  });

  it('no_root_id_anonymous', () => {
    // provenance:true 但 root 无 id → 内部 scope 匿名（无合成 id）；meta 省 plotId（无 dataReference 之外的 plotId 字段）
    const outer = expandOf(barSpec(), { sales: SALES }, { ...opts, provenance: true, datumProvenance: true });
    // 无任何合成 id（root 没 id → 内部不带前缀、不合成）
    expect(collectIds(outer)).toEqual([]);
    // meta 仍写（provenance 开），但不含 plotId key
    const metas = collectMeta(outer);
    expect(metas.length).toBeGreaterThan(0);
    for (const { meta } of metas) {
      expect((meta as { plotId?: unknown }).plotId).toBeUndefined();
    }
  });

  it('series_value_slug', () => {
    // series 值含 '.' → id 路径确定性 slug。断言稳定性 + 可寻址，不锁死精确串
    const TREND = [
      { t: 0, v: 1, region: 'north.west' },
      { t: 1, v: 3, region: 'north.west' },
      { t: 0, v: 2, region: 'south' },
      { t: 1, v: 4, region: 'south' },
    ];
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'trend',
      data: { reference: 't' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'path', series: 'region', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' } } }],
    });
    const layer = firstLayer(spec, { t: TREND }, { ...opts, provenance: true });
    const seriesScopes = layer.children as Array<IRScope>;
    const ids = seriesScopes.map(scope => scope.id);
    // 每条 series 一个 id，全部以 trend.series. 前缀、不含裸 '.' 在 value 段（'.' 已被 slug 掉）
    expect(ids.every(id => typeof id === 'string' && id.startsWith('trend.series.'))).toBe(true);
    for (const id of ids) {
      const valueSegment = id!.slice('trend.series.'.length);
      expect(valueSegment).not.toContain('.');
    }
    // id 稳定唯一（无冲突）
    expect(new Set(ids).size).toBe(ids.length);
    // 但 series Scope.meta.series 保留原始值（未 slug）
    expect((seriesScopes[0].meta as { series?: unknown }).series).toBe('north.west');
  });

  it('series_slug_collision_throws', () => {
    // 两个不同 series 值 slug 后撞同一 id（'a.b' 与 'a_b' 都 → 'a_b'）→ fail loud（与 datumIdField 重复同策）
    const TREND = [
      { t: 0, v: 1, region: 'a.b' },
      { t: 1, v: 3, region: 'a.b' },
      { t: 0, v: 2, region: 'a_b' },
      { t: 1, v: 4, region: 'a_b' },
    ];
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'trend',
      data: { reference: 't' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'path', series: 'region', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' } } }],
    });
    expect(() => expandOf(spec, { t: TREND }, { ...opts, provenance: true })).toThrow();
  });

  it('transformed_vs_source_index', () => {
    // spec 带 sort transform → datum meta transformedIndex=渲染序、sourceIndex=原 dataset 行序，二者不同且都正确
    const rows = [
      { month: 2, revenue: 9 }, // source 0
      { month: 0, revenue: 10 }, // source 1
      { month: 1, revenue: 14 }, // source 2
    ];
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'sales',
      data: { reference: 'sales' },
      transform: [{ kind: 'sort', field: 'month' }],
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    });
    const layer = firstLayer(spec, { sales: rows }, { ...opts, provenance: true, datumProvenance: true });
    const nodes = layer.children as Array<IRNode>;
    expect(nodes).toHaveLength(3);
    // sort by month ascending → 渲染序 month 0,1,2 = source 行 1,2,0
    const seen = nodes.map(n => n.meta as { transformedIndex: number; sourceIndex?: number });
    expect(seen.map(m => m.transformedIndex)).toEqual([0, 1, 2]);
    expect(seen.map(m => m.sourceIndex)).toEqual([1, 2, 0]);
    // transformedIndex ≠ sourceIndex（至少有一行错位）
    expect(seen.some(m => m.transformedIndex !== m.sourceIndex)).toBe(true);
  });
});

// =====================================================================
// 错误路径
// =====================================================================
describe('scope id/meta — errors', () => {
  it('datum_id_field_missing', () => {
    // datumIdField 指向某行不存在的字段 → 抛清晰错误（fail loud，不静默跳过）
    const rows = [
      { month: 0, revenue: 10, key: 'a' },
      { month: 1, revenue: 14 }, // 缺 key
      { month: 2, revenue: 9, key: 'c' },
    ];
    expect(() =>
      expandOf(
        barSpec({ id: 'sales' }),
        { sales: rows },
        { ...opts, provenance: true, datumProvenance: true, datumIdField: 'key' },
      ),
    ).toThrow();
  });

  it('duplicate_datum_id', () => {
    // datumIdField 值在两行重复 → 抛清晰错误（不 last-wins，保 anchor 稳定）
    const rows = [
      { month: 0, revenue: 10, key: 'dup' },
      { month: 1, revenue: 14, key: 'dup' },
      { month: 2, revenue: 9, key: 'c' },
    ];
    expect(() =>
      expandOf(
        barSpec({ id: 'sales' }),
        { sales: rows },
        { ...opts, provenance: true, datumProvenance: true, datumIdField: 'key' },
      ),
    ).toThrow();
  });
});

// =====================================================================
// 交互
// =====================================================================
describe('scope id/meta — interaction', () => {
  it('polar_id_meta_parity', () => {
    // polar 下 interval→sector 径向柱层 id / meta 与 cartesian 同构（layer scope id + meta layer:mark）
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'rose',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'a' },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'interval', encoding: { x: { field: 'cat' }, y: { field: 'value' } } }],
    });
    const rows = [
      { cat: 'A', value: 4 },
      { cat: 'B', value: 7 },
      { cat: 'C', value: 2 },
    ];
    const layer = firstLayer(spec, { d: rows }, { ...opts, provenance: true });
    expect(layer.id).toBe('rose.mark.0');
    expect(layer.meta).toEqual({ source: 'plot', layer: 'mark', mark: 'interval', markIndex: 0 });
  });

  it('polar_sector_datum_meta', () => {
    // polar sector(饼图) datum node per-datum meta（datumProvenance 开）
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'pie',
      data: { reference: 'd' },
      transform: [{ kind: 'stack', y: 'v' }],
      scales: [
        { type: 'linear', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [
        {
          type: 'interval',
          bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
          encoding: { color: { field: 'k' } },
        },
      ],
    });
    const rows = [
      { k: 'A', v: 3 },
      { k: 'B', v: 7 },
    ];
    const layer = firstLayer(spec, { d: rows }, { ...opts, provenance: true, datumProvenance: true });
    // sector layer：有 color → 分子 scope；收集所有带 meta 的 node
    const metas = collectMeta(layer).filter(m => m.type === 'node');
    expect(metas.length).toBe(2);
    for (const { meta } of metas) {
      expect((meta as { source?: string }).source).toBe('plot');
      expect((meta as { mark?: string }).mark).toBe('interval');
      expect(typeof (meta as { transformedIndex?: number }).transformedIndex).toBe('number');
    }
  });

  it('compile_meta_reaches_scene', () => {
    // 含 meta 的 lowering 产物 → compileToScene → Scene 图元保留同款 meta
    const spec = barSpec({ id: 'sales' });
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerPlots({ sales: SALES }, { ...opts, provenance: true, datumProvenance: true }) },
    );
    const sceneMetas = scene.primitives.flatMap(p => collectSceneMeta(p as ScenePrimLike));
    // 至少 datum node 的 meta 被 stamp 进 Scene 图元
    const datumMetas = sceneMetas.filter(
      m =>
        (m.meta as { mark?: string }).mark === 'interval' &&
        typeof (m.meta as { transformedIndex?: number }).transformedIndex === 'number',
    );
    expect(datumMetas.length).toBeGreaterThanOrEqual(3);
    expect((datumMetas[0].meta as { source?: string }).source).toBe('plot');
    expect((datumMetas[0].meta as { dataReference?: string }).dataReference).toBe('sales');
  });

  it('compile_meta_render_neutral', () => {
    // meta 渲染中立：开 provenance 与关 provenance 的 Scene 图元几何不变（除 id/meta key 外结构等价）
    const spec = () => barSpec({ id: 'sales' });
    const sceneOff = compileToScene(
      { version: 1, type: 'scene', children: [spec()] },
      { composites: lowerPlots({ sales: SALES }, opts) },
    );
    const sceneOn = compileToScene(
      { version: 1, type: 'scene', children: [spec()] },
      { composites: lowerPlots({ sales: SALES }, { ...opts, provenance: true, datumProvenance: true }) },
    );
    // 图元数量与 viewBox 不因 meta 改变
    const countPrims = (prims: Array<ScenePrimLike>): number =>
      prims.reduce((n, p) => n + 1 + (Array.isArray(p.children) ? countPrims(p.children) : 0), 0);
    expect(countPrims(sceneOn.primitives as Array<ScenePrimLike>)).toBe(
      countPrims(sceneOff.primitives as Array<ScenePrimLike>),
    );
    expect((sceneOn as { viewBox?: unknown }).viewBox).toEqual((sceneOff as { viewBox?: unknown }).viewBox);
  });

  it('id_meta_coexist', () => {
    // root+mark id 与 meta 共存、互不影响：layer scope 同时带 id 与 meta
    const layer = firstLayer(barSpec({ id: 'sales' }), { sales: SALES }, { ...opts, provenance: true });
    expect(layer.id).toBe('sales.mark.0');
    expect(layer.meta).toBeTruthy();
    // compile 后 scope group 同时带 id（hit-test 挂点）与 meta
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [barSpec({ id: 'sales' })] },
      { composites: lowerPlots({ sales: SALES }, { ...opts, provenance: true }) },
    );
    const groups: Array<ScenePrimLike> = [];
    const walk = (p: ScenePrimLike): void => {
      if (p.type === 'group') groups.push(p);
      if (Array.isArray(p.children)) for (const c of p.children) walk(c);
    };
    for (const p of scene.primitives as Array<ScenePrimLike>) walk(p);
    const markGroup = groups.find(g => g.id === 'sales.mark.0');
    expect(markGroup).toBeTruthy();
    expect((markGroup!.meta as { layer?: string }).layer).toBe('mark');
  });

  it('datum_id_field_binds_node_id', () => {
    // datumIdField 设 → datum Node.id = '<plotId>.datum.<fieldValue>'
    const rows = [
      { month: 0, revenue: 10, q: 'Q1' },
      { month: 1, revenue: 14, q: 'Q2' },
      { month: 2, revenue: 9, q: 'Q3' },
    ];
    const layer = firstLayer(
      barSpec({ id: 'sales' }),
      { sales: rows },
      { ...opts, provenance: true, datumProvenance: true, datumIdField: 'q' },
    );
    const ids = (layer.children as Array<IRNode>).map(n => n.id);
    expect(ids).toEqual(['sales.datum.Q1', 'sales.datum.Q2', 'sales.datum.Q3']);
  });

  it('guide_layer_id_meta', () => {
    // guide 层 scope → '<plotId>.' 前缀 id + meta {source:'plot',layer:'axis'|'grid',dimension}
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'sales',
      data: { reference: 'sales' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
      guides: [{ type: 'axis', dimension: 'x', id: 'xaxis' }],
    });
    const outer = expandOf(spec, { sales: SALES }, { ...opts, provenance: true });
    // 找带 layer:'axis' 的 scope（其 id 应带 plotId 前缀）
    const axisMeta = collectMeta(outer).find(m => (m.meta as { layer?: string }).layer === 'axis');
    expect(axisMeta).toBeTruthy();
    expect((axisMeta!.meta as { source?: string }).source).toBe('plot');
    expect((axisMeta!.meta as { dimension?: string }).dimension).toBe('x');
    // guide.id='xaxis' → 加前缀 'sales.xaxis'
    expect(axisMeta!.id).toBe('sales.xaxis');
  });

  it('legend_layer_id_is_plot_local_across_scene', () => {
    const legendSpec = (id: string, dataReference: string): IRPlotSpec =>
      PlotSpecSchema.parse({
        namespace: 'plot',
        type: 'plot',
        id,
        data: { reference: dataReference },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
          { type: 'ordinal', name: 'color' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [
          {
            type: 'point',
            encoding: { x: { field: 'x' }, y: { field: 'y' }, color: { field: 'series', scale: 'color' } },
          },
        ],
        guides: [{ type: 'legend', channel: 'color' }],
      });
    const left = legendSpec('left', 'left-data');
    const right = legendSpec('right', 'right-data');
    const datasets = {
      'left-data': [{ x: 0, y: 1, series: 'A' }],
      'right-data': [{ x: 1, y: 0, series: 'B' }],
    };
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [left, right] },
      { composites: lowerPlots(datasets, { ...opts, provenance: true }) },
    );
    const ids = scene.primitives.flatMap(primitive => collectSceneIds(primitive as ScenePrimLike));
    expect(ids.filter(id => id.endsWith('legend.color'))).toEqual(['left.legend.color', 'right.legend.color']);
  });
});

// =====================================================================
// Bug Hunter 回归（stage 3 对抗提升为正式测试）
// =====================================================================
describe('scope id/meta — bug hunter regressions', () => {
  it('middle_skipped_row_index_integrity', () => {
    // 中间行被跳过（非有限投影）时，存活 datum 的 transformedIndex / sourceIndex 必须反映「原始行位置」，
    // 而非压缩后的 placed 数组位置（经典 off-by-one 陷阱）。row1 的 y=NaN → 跳过，存活 row0/row2 应得 index 0/2
    const rows = [
      { month: 0, revenue: 10 },
      { month: 1, revenue: Number.NaN }, // 跳过
      { month: 2, revenue: 9 },
    ];
    const layer = firstLayer(
      pointSpec({ id: 'sales' }),
      { sales: rows },
      { ...opts, provenance: true, datumProvenance: true },
    );
    const nodes = layer.children as Array<IRNode>;
    expect(nodes).toHaveLength(2); // 中间行被跳过
    const idx = nodes.map(n => n.meta as { transformedIndex: number; sourceIndex?: number });
    expect(idx.map(m => m.transformedIndex)).toEqual([0, 2]); // 不压缩成 [0,1]
    expect(idx.map(m => m.sourceIndex)).toEqual([0, 2]);
  });

  it('datum_provenance_implies_provenance', () => {
    // datumProvenance / datumIdField 任一开即蕴含 provenance：不显式传 provenance:true 也应写 per-datum meta / 绑 datum id，
    // 不能静默无效（修复：原实现仅 options.provenance truthy 才启用，致 datumProvenance 单开被吞）
    const rows = [
      { month: 0, revenue: 10, q: 'Q1' },
      { month: 1, revenue: 14, q: 'Q2' },
    ];
    // 只开 datumProvenance（不传 provenance）→ datum Node 仍带 meta
    const layerMeta = firstLayer(barSpec({ id: 'sales' }), { sales: rows }, { ...opts, datumProvenance: true });
    const metaNodes = (layerMeta.children as Array<IRNode>).filter(n => n.meta !== undefined);
    expect(metaNodes).toHaveLength(2);
    // 只设 datumIdField（不传 provenance）→ datum Node 仍绑 id
    const layerId = firstLayer(barSpec({ id: 'sales' }), { sales: rows }, { ...opts, datumIdField: 'q' });
    const ids = (layerId.children as Array<IRNode>).map(n => n.id);
    expect(ids).toEqual(['sales.datum.Q1', 'sales.datum.Q2']);
  });

  it('provenance_does_not_mutate_input', () => {
    // SOURCE_INDEX 标记必须打在克隆行上，绝不污染调用方原始数据对象
    const rows = [
      { month: 0, revenue: 10 },
      { month: 1, revenue: 14 },
    ];
    expandOf(barSpec({ id: 'sales' }), { sales: rows }, { ...opts, provenance: true, datumProvenance: true });
    for (const row of rows) {
      expect(Object.getOwnPropertySymbols(row)).not.toContain(SOURCE_INDEX);
    }
  });
});
