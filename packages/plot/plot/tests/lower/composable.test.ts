import { describe, expect, it } from 'vitest';
import { compileToScene } from '@retikz/core';
import type { IR, IRNode, IRScope, IRTarget, ScenePrimitive } from '@retikz/core';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

// ADR-02：plot 可被组合 —— 自描述尺寸（L1-a）+ 外部可见面板 anchor（L1-b）

const SALES = [
  { month: 0, revenue: 10 },
  { month: 2, revenue: 9 },
];

const pointSpec = (extra: Record<string, unknown> = {}): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    ...extra,
  });

const expandOf = (spec: PlotSpec, options?: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots({ sales: SALES }, options);
  return def.expand(spec) as IRScope;
};

const opts: LowerPlotsOptions = { width: 480, height: 300 };

describe('ADR-02 L1-a · PlotSpec 自描述尺寸', () => {
  it('node_width_overrides_global', () => {
    // node.width=200 应覆盖全局 opts.width=480：max-x 数据点落在 200，而非 480
    const layer = expandOf(pointSpec({ width: 200, height: 120 }), opts).children[0] as IRScope;
    const xs = (layer.children as Array<IRNode>).map(n => (n.position as [number, number])[0]);
    expect(Math.max(...xs)).toBe(200);
  });

  it('node_height_overrides_global', () => {
    // node.height=120 覆盖全局 300：y 轴底（revenue 最小值 9）落在 height=120 处
    const layer = expandOf(pointSpec({ width: 200, height: 120 }), opts).children[0] as IRScope;
    const ys = (layer.children as Array<IRNode>).map(n => (n.position as [number, number])[1]);
    expect(Math.max(...ys)).toBe(120);
  });

  it('size_fallback_to_global', () => {
    // 不写 node.width/height → 回退全局 opts（单图逐字回归）：max-x = 480
    const layer = expandOf(pointSpec(), opts).children[0] as IRScope;
    const xs = (layer.children as Array<IRNode>).map(n => (n.position as [number, number])[0]);
    expect(Math.max(...xs)).toBe(480);
  });
});

describe('ADR-02 L1-b · 外部可见面板 anchor（gated on id）', () => {
  it('id_plot_outer_panel_scope', () => {
    // 有 id → 外层 panel scope（id、非 localNamespace，承面板 bbox）⊃ 内层 localNamespace 内容
    const outer = expandOf(pointSpec({ id: 'p' }), opts);
    expect(outer.type).toBe('scope');
    expect(outer.id).toBe('p');
    expect(outer.localNamespace).toBeUndefined();
    const inner = outer.children[0] as IRScope;
    expect(inner.type).toBe('scope');
    expect(inner.localNamespace).toBe(true);
  });

  it('plotarea_carrier_present', () => {
    // 不可见矩形 carrier，id=`<plotId>.plotArea`
    const outer = expandOf(pointSpec({ id: 'p' }), opts);
    const carrier = outer.children.find(c => (c as IRNode).id === 'p.plotArea') as IRNode | undefined;
    expect(carrier).toBeTruthy();
    expect(carrier!.type).toBe('node');
    expect(carrier!.shape).toBe('rectangle');
    expect(carrier!.opacity).toBe(0);
    expect(carrier!.minimumWidth).toBeGreaterThan(0);
    expect(carrier!.minimumHeight).toBeGreaterThan(0);
  });

  it('plotarea_carrier_matches_drawing_region', () => {
    // 有轴 → plotArea 扣边距，carrier 尺寸 < 整图（非整面板框、非 0×0）
    const guided = expandOf(
      pointSpec({ id: 'p', guides: [{ type: 'axis', dimension: 'x' }, { type: 'axis', dimension: 'y' }] }),
      opts,
    );
    const carrier = guided.children.find(c => (c as IRNode).id === 'p.plotArea') as IRNode;
    expect(carrier.minimumWidth).toBeLessThan(480);
    expect(carrier.minimumHeight).toBeLessThan(300);
  });

  it('no_id_structure_unchanged', () => {
    // 无 id → 老结构（localNamespace root、无 carrier、children[0]=首个 mark 层），单图零回归
    const outer = expandOf(pointSpec(), opts);
    expect(outer.id).toBeUndefined();
    expect(outer.localNamespace).toBe(true);
    expect(outer.children.some(c => (c as IRNode).id === undefined ? false : (c as IRNode).id!.endsWith('.plotArea'))).toBe(false);
    expect((outer.children[0] as IRScope).type).toBe('scope');
  });

  // 兄弟 Path line 端点（compile 后从 path primitive 取第一个 line 命令的 to）
  const lineEndpoint = (plotNode: PlotSpec, to: IRTarget): [number, number] | undefined => {
    const scene: IR = {
      version: 1,
      type: 'scene',
      children: [plotNode, { type: 'path', children: [{ type: 'step', kind: 'move', to: [600, 150] }, { type: 'step', kind: 'line', to }] }],
    };
    const compiled = compileToScene(scene, { composites: lowerPlots({ sales: SALES }, opts) });
    const path = compiled.primitives.find((p): p is Extract<ScenePrimitive, { type: 'path' }> => p.type === 'path');
    if (!path) return undefined;
    for (const cmd of path.commands) if (cmd.kind === 'line') return cmd.to;
    return undefined;
  };

  it('panel_bbox_resolvable_from_sibling', () => {
    // 面板 bbox：core ADR-03 既有能力（scope.id 注册父帧）；无 guides → 内容满图，p.east ≈ [480,150]
    const end = lineEndpoint(pointSpec({ id: 'p' }), { id: 'p', anchor: 'east' });
    expect(end).toBeDefined();
    // 内容右边 ≈ 480（+ 散点字形半径），y 居中 ≈ 150
    expect(end![0]).toBeGreaterThan(470);
    expect(end![0]).toBeLessThan(495);
    expect(end![1]).toBeCloseTo(150, 0);
  });

  it('plotarea_resolvable_from_sibling', () => {
    // 跨 localNamespace：`<plotId>.plotArea` 兄弟可锚（外部可见）；无 guides → plotArea 满图，center = [240,150]
    const end = lineEndpoint(pointSpec({ id: 'p' }), { id: 'p.plotArea', anchor: 'center' });
    expect(end).toBeDefined();
    expect(end![0]).toBeCloseTo(240, 0);
    expect(end![1]).toBeCloseTo(150, 0);
  });
});
