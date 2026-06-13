import { compileToScene } from '@retikz/core';
import type { IRChild, IRNode, IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';
import { SOURCE_INDEX } from '../../src/lower/provenance';

/**
 * ADR-01：scope-aware id 绑定 + meta 透传。
 *
 * 断言 lowerPlots 产物（core IR Scope / Node / Path 的 id + meta），由 LowerPlotsOptions 的
 *   provenance / datumProvenance / datumIdField 三开关门控。provenance 关（默认）→ 逐字节等价 alpha.4。
 *
 * 这些测试对「未来 API」编写：除 provenance_off_byte_identical（应在现状即过）外，
 *   新行为断言在实现落地前会 FAIL（预期）。
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const expandOf = (spec: PlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

/** 取第一个 mark 图层 scope（无 guides 时即外层 plot scope 的第一个子 scope） */
const firstLayer = (spec: PlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

/** 递归收集 IRChild 树里所有带 meta 的元素（id 一并带出，便于断言） */
const collectMeta = (child: IRChild, out: Array<{ type: string; id?: string; meta: unknown }> = []): Array<{ type: string; id?: string; meta: unknown }> => {
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
const collectSceneMeta = (prim: ScenePrimLike, out: Array<{ type: string; meta: unknown }> = []): Array<{ type: string; meta: unknown }> => {
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
const barSpec = (over: { id?: string; markId?: string } = {}): PlotSpec =>
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
    marks: [{ type: 'interval', ...(over.markId ? { id: over.markId } : {}), encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
  });

/** linear point spec；可带 root id */
const pointSpec = (over: { id?: string } = {}): PlotSpec =>
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
describe('ADR-01 id/meta — happy path', () => {
  it('root_id_to_scope_id', () => {
    // <Plot id="sales"> + provenance:true → 外层 scope.id='sales' + localNamespace + meta {source:'plot',dataReference:'sales'}
    const outer = expandOf(barSpec({ id: 'sales' }), { sales: SALES }, { ...opts, provenance: true });
    expect(outer.type).toBe('scope');
    expect(outer.id).toBe('sales');
    expect(outer.localNamespace).toBe(true);
    expect(outer.meta).toEqual({ source: 'plot', dataReference: 'sales' });
  });

  it('mark_layer_id_meta', () => {
    // bar mark[0] → 图层 scope.id='sales.mark.0'、meta {source:'plot',layer:'mark',mark:'interval',markIndex:0}
    const layer = firstLayer(barSpec({ id: 'sales' }), { sales: SALES }, { ...opts, provenance: true });
    expect(layer.type).toBe('scope');
    expect(layer.id).toBe('sales.mark.0');
    expect(layer.meta).toEqual({ source: 'plot', layer: 'mark', mark: 'interval', markIndex: 0 });
  });

  it('mark_layer_uses_user_mark_id', () => {
    // 用户给 mark.id='bars' → layer scope.id='sales.bars'（用户句柄优先；待决策点倾向）
    const layer = firstLayer(barSpec({ id: 'sales', markId: 'bars' }), { sales: SALES }, { ...opts, provenance: true });
    // TODO impl: confirm <plotId>.<markId>（倾向）vs <plotId>.mark.<markId>
    expect(layer.id).toBe('sales.bars');
    expect((layer.meta as { markIndex?: number }).markIndex).toBe(0);
  });

  it('line_series_path_id_meta', () => {
    // line 多系列 → 每条 series Path 带 id='trend.series.<value>' + Path.meta 带 series（series 落在 Path、非子 scope）
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
      marks: [{ type: 'line', series: 'city', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' }, color: { field: 'city', scale: 'col' } } }],
    });
    const layer = firstLayer(spec, { t: TREND }, { ...opts, provenance: true });
    const [pathX, pathY] = layer.children as Array<IRPath>;
    expect(pathX.type).toBe('path');
    expect(pathX.id).toBe('trend.series.X');
    expect((pathX.meta as { series?: unknown }).series).toBe('X');
    expect(pathY.id).toBe('trend.series.Y');
    expect((pathY.meta as { series?: unknown }).series).toBe('Y');
  });

  it('datum_provenance_on', () => {
    // datumProvenance:true → 每个 datum Node 带 meta {source,dataReference,mark,markIndex,transformedIndex,sourceIndex,series?}
    const layer = firstLayer(barSpec({ id: 'sales' }), { sales: SALES }, { ...opts, provenance: true, datumProvenance: true });
    const nodes = layer.children as Array<IRNode>;
    expect(nodes).toHaveLength(3);
    for (let index = 0; index < nodes.length; index++) {
      const meta = nodes[index].meta as { source?: string; dataReference?: string; mark?: string; markIndex?: number; transformedIndex?: number; sourceIndex?: number };
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
describe('ADR-01 id/meta — 边界', () => {
  it('provenance_off_byte_identical', () => {
    // 默认（provenance 关）→ lowering 产物逐字节等价 alpha.4：无任何 meta / 合成 id key。
    // 用「无 root id / 无 mark id」spec（point + bar）作代表，逐字结构比对 off vs 显式 off。
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
      marks: [{ type: 'sector', encoding: { color: { field: 'k' } } }],
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
    // series 值含 '.' → id 路径确定性 slug（'.'→'_'，非串 String()）。断言稳定性 + 可寻址，不锁死精确串。
    // TODO impl: confirm slug 规则（'.'→'_'、非串 String()）
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
      marks: [{ type: 'line', series: 'region', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' } } }],
    });
    const layer = firstLayer(spec, { t: TREND }, { ...opts, provenance: true });
    const paths = layer.children as Array<IRPath>;
    const ids = paths.map(p => p.id);
    // 每条 series 一个 id，全部以 trend.series. 前缀、不含裸 '.' 在 value 段（'.' 已被 slug 掉）
    expect(ids.every(id => typeof id === 'string' && id.startsWith('trend.series.'))).toBe(true);
    for (const id of ids) {
      const valueSegment = id!.slice('trend.series.'.length);
      expect(valueSegment).not.toContain('.');
    }
    // id 稳定唯一（无冲突）
    expect(new Set(ids).size).toBe(ids.length);
    // 但 Path.meta.series 保留原始值（未 slug）
    expect((paths[0].meta as { series?: unknown }).series).toBe('north.west');
  });

  it('series_slug_collision_throws', () => {
    // 两个不同 series 值 slug 后撞同一 id（'a.b' 与 'a_b' 都 → 'a_b'）→ fail loud（与 datumIdField 重复同策）
    // TODO impl: confirm slug-collision throws（与 duplicate-id 一致）
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
      marks: [{ type: 'line', series: 'region', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' } } }],
    });
    expect(() => expandOf(spec, { t: TREND }, { ...opts, provenance: true })).toThrow();
  });

  it('transformed_vs_source_index', () => {
    // spec 带 sort transform → datum meta transformedIndex=渲染序、sourceIndex=原 dataset 行序，二者不同且都正确。
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
describe('ADR-01 id/meta — 错误路径', () => {
  it('datum_id_field_missing', () => {
    // datumIdField 指向某行不存在的字段 → 抛清晰错误（fail loud，不静默跳过）
    const rows = [
      { month: 0, revenue: 10, key: 'a' },
      { month: 1, revenue: 14 }, // 缺 key
      { month: 2, revenue: 9, key: 'c' },
    ];
    expect(() => expandOf(barSpec({ id: 'sales' }), { sales: rows }, { ...opts, provenance: true, datumProvenance: true, datumIdField: 'key' })).toThrow();
  });

  it('duplicate_datum_id', () => {
    // datumIdField 值在两行重复 → 抛清晰错误（不 last-wins，保 anchor 稳定）
    const rows = [
      { month: 0, revenue: 10, key: 'dup' },
      { month: 1, revenue: 14, key: 'dup' },
      { month: 2, revenue: 9, key: 'c' },
    ];
    expect(() => expandOf(barSpec({ id: 'sales' }), { sales: rows }, { ...opts, provenance: true, datumProvenance: true, datumIdField: 'key' })).toThrow();
  });
});

// =====================================================================
// 交互
// =====================================================================
describe('ADR-01 id/meta — 交互', () => {
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
      marks: [{ type: 'sector', encoding: { color: { field: 'k' } } }],
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
      expect((meta as { mark?: string }).mark).toBe('sector');
      expect(typeof (meta as { transformedIndex?: number }).transformedIndex).toBe('number');
    }
  });

  it('compile_meta_reaches_scene', () => {
    // 含 meta 的 lowering 产物 → compileToScene → Scene 图元带同款 meta（验证 core ADR-08 通道连通）
    const spec = barSpec({ id: 'sales' });
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerPlots({ sales: SALES }, { ...opts, provenance: true, datumProvenance: true }) },
    );
    const sceneMetas = scene.primitives.flatMap(p => collectSceneMeta(p as ScenePrimLike));
    // 至少 datum node 的 meta 被 stamp 进 Scene 图元
    const datumMetas = sceneMetas.filter(m => (m.meta as { mark?: string }).mark === 'interval' && typeof (m.meta as { transformedIndex?: number }).transformedIndex === 'number');
    expect(datumMetas.length).toBeGreaterThanOrEqual(3);
    expect((datumMetas[0].meta as { source?: string }).source).toBe('plot');
    expect((datumMetas[0].meta as { dataReference?: string }).dataReference).toBe('sales');
  });

  it('compile_meta_render_neutral', () => {
    // meta 渲染中立：开 provenance 与关 provenance 的 Scene 图元几何不变（除 id/meta key 外结构等价）。
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
    expect(countPrims(sceneOn.primitives as Array<ScenePrimLike>)).toBe(countPrims(sceneOff.primitives as Array<ScenePrimLike>));
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
    const layer = firstLayer(barSpec({ id: 'sales' }), { sales: rows }, { ...opts, provenance: true, datumProvenance: true, datumIdField: 'q' });
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
});

// =====================================================================
// Bug Hunter 回归（stage 3 对抗提升为正式测试）
// =====================================================================
describe('ADR-01 id/meta — Bug Hunter 回归', () => {
  it('middle_skipped_row_index_integrity', () => {
    // 中间行被跳过（非有限投影）时，存活 datum 的 transformedIndex / sourceIndex 必须反映「原始行位置」，
    // 而非压缩后的 placed 数组位置（经典 off-by-one 陷阱）。row1 的 y=NaN → 跳过，存活 row0/row2 应得 index 0/2。
    const rows = [
      { month: 0, revenue: 10 },
      { month: 1, revenue: Number.NaN }, // 跳过
      { month: 2, revenue: 9 },
    ];
    const layer = firstLayer(pointSpec({ id: 'sales' }), { sales: rows }, { ...opts, provenance: true, datumProvenance: true });
    const nodes = layer.children as Array<IRNode>;
    expect(nodes).toHaveLength(2); // 中间行被跳过
    const idx = nodes.map(n => n.meta as { transformedIndex: number; sourceIndex?: number });
    expect(idx.map(m => m.transformedIndex)).toEqual([0, 2]); // 不压缩成 [0,1]
    expect(idx.map(m => m.sourceIndex)).toEqual([0, 2]);
  });

  it('datum_provenance_implies_provenance', () => {
    // datumProvenance / datumIdField 任一开即蕴含 provenance：不显式传 provenance:true 也应写 per-datum meta / 绑 datum id，
    // 不能静默无效（修复：原实现仅 options.provenance truthy 才启用，致 datumProvenance 单开被吞）。
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
    // SOURCE_INDEX 标记必须打在克隆行上，绝不污染调用方原始数据对象。
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
